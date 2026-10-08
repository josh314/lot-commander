# AI Backfill Integration Design

## Status

**Implemented and committed** (branch `ai-backfill-integration`, merged — see
`docs/superpowers/archive/plans/2026-08-17-ai-backfill-integration.md` for the
per-task commit list). File paths below were corrected post-hoc for the
Phase 1 workspace restructuring (`client/js/` → `client-legacy/src/js/`,
`server/modules/` → `server/src/modules/`, etc. — see root `CLAUDE.md`'s
Modernize section); they originally referred to the pre-restructuring
layout, since this spec predates that work. The real implementation also
grew one capability not in this doc: an admin toggle
(`appSettings.isEnabled('aiBackfillEnabled')`, checked in
`createFetchJobIfLotNotLocked`) to disable fetch-job creation without a
deploy.

Originally approved. Relocated from `ai-product-data-backfill`'s `docs/superpowers/specs/2026-08-11-lot-commander-updates-design.md` (written 2026-08-11, unchanged in substance) into this repo, since all changes described here are implemented against `lot-commander`, not `ai-product-data-backfill`. Fleshes out the "Lot Commander Contract" section of `ai-product-data-backfill`'s `docs/superpowers/specs/2026-08-10-fetch-aggregate-workflow-design.md` into a full spec, grounded in the real `lot-commander` codebase rather than the assumptions in `ai-product-data-backfill`'s `docs/project-spec-v0.md` ("Implementation proposal notes" section, which predate this investigation and turned out to be wrong on two counts — see Current State below).

**Scope:** application code changes in this repo (Express/Mongoose server, Angular 1 client) only. Deployment/IAM concerns — bucket policy, `states:StartExecution` grant for this app's backend, cross-service permissions, Terraform — are covered by a separate design doc, `ai-product-data-backfill`'s `docs/superpowers/specs/2026-08-12-lot-commander-deploy-updates-design.md`, implemented against `lot-commander-ecs-deploy`, not this repo.

## Current State (corrects prior assumptions)

Two assumptions baked into the earlier "Lot Commander Contract" section (in `ai-product-data-backfill`) don't match the real code:

1. **Scanning is not silent from the server's perspective.** `client-legacy/src/js/ng/controllers/scan-ctrl.js`'s `scanBarcode()` adds the barcode to an in-memory inventory array client-side, then — on a barcode's *first* scan in a session only (`addInventory()` in `client-legacy/src/js/ng/services/lot-svc.js`, the `item.data.quantity == 1` branch) — calls `ProductDataSvc.getProductDataByBarcode(barcode)`, which hits `GET /product-data/:barcode` on the server. That handler (`server/src/routers/product-data.js` → `server/src/modules/product-data.js`'s `getProductDataByBarcode`) checks the `internal-product-data` collection first, then falls through to external sources (traject/upcItemDb/fnskuToAsin). This is a real per-scan server round trip, and it's the natural hook for creating AI-backfill fetch jobs (see below) — no new endpoint needed.
2. **There is no "Done" button today.** `Lot.status` is a plain field edited through a generic edit-lot form (a dropdown over `server/src/modules/enums.js`'s `lotStatus` array). Nothing currently signals "user is finished working this Lot" as a distinct action.

Also relevant: `Manifest.inventory` is only persisted server-side via `POST` → `saveManifest` in `server/src/routers/lots.js`, triggered by the existing "Save and Continue" / "Save and Exit" buttons on the scan page — the full array is overwritten each time, not diffed.

## Changes

### 1. Data model

- `server/src/modules/enums.js`: add `'Pending Data'` to `lotStatusEnum`, between `'In Preparation'` and `'Ready'` — matches the ordering already documented in `ai-product-data-backfill`'s `docs/project-spec-v0.md`'s `Lot.status` enum. This is the lock/unlock flag; no new field.
- `server/src/models/product-data.js`: add a `source` field to `productDataSchema`. This schema backs both the `internal-product-data` model and (via `extendSchema` in `server/src/models/manifest.js`) the `Manifest.inventory` subdocument, so this one change covers both. Use `match: /^(manual|ai-backfill:.+)$/` rather than a strict `enum` — `ai-product-data-backfill`'s own convention (`internal-product-data.source` templated as `` `ai-backfill:${aiSource}` ``, see its `CLAUDE.md`) means the exact suffix changes if the AI provider is swapped, and a strict enum here would silently break any future `Manifest.save()` once that happens.

### 2. Fetch-job creation (hooks into the existing per-scan lookup)

- `GET /product-data/:barcode` gains a `lotId` query param. Threaded through: `client-legacy/src/js/api.js`'s `getProductDataByBarcode` → `client-legacy/src/js/ng/services/product-data-svc.js`'s `getProductDataByBarcode` → the one real call site, `scan-ctrl.js`'s `scanBarcode()` (currently called with no `source`/`type`/`lotId`).
- In `server/src/modules/product-data.js`'s `getProductDataByBarcode(barcode, { source, type, lotId })`: only in the no-`source` branch (the actual scan path — the `source`-override branch exists in the route but has no client caller today), if the internal lookup misses and every external source (upc/traject/fnsku) also comes back empty (i.e. the cascade's `product` is still falsy before the outer wrapper's `{ barcode, ...product }` spread), `PutObjectCommand` a `fetch/<lotId>/<barcode>` marker to the AI-backfill jobs bucket before returning. Follows the existing S3-write pattern already in that file (`queueProductDataFetching`'s `new Upload(...)`), but targets a **new, separate bucket** — not `expresshop-product-data-jobs`, which is an unrelated legacy pipeline that also happens to write barcode-shaped S3 objects.
- This structurally satisfies `ai-product-data-backfill`'s "skip if already in `internal-product-data`" requirement for free, since that's already this method's first check — no separate check needed.
- Key format matches `ai-product-data-backfill`'s `fetch/<lot-id>/<barcode>` layout with no escaping needed: `lotId` is a stringified Mongo `ObjectId` (hex only), `barcode` is alphanumeric.
- No dedup logic needed on this side: a barcode only reaches this code path on its first scan per session (per `addInventory()`'s quantity check above), and a stale re-PUT of the same S3 key across sessions is naturally idempotent (S3 PUT semantics, plus the fetch workflow's own idempotent handling per `ai-product-data-backfill`'s aggregate design doc).
- **No response-shape change.** The AI-fetched data does not come back in this HTTP response — it lands in `internal-product-data` asynchronously via `ai-product-data-backfill`'s fetch workflow, and only reaches `Manifest.inventory` when its aggregate workflow runs at Finish Scanning time (see #4). The scan page already tolerates incomplete items (`__INVENTORY_VALIDATION_OPTIONS__`'s `allowMissingTitle`/`allowMissingPrice`/`allowMissingImages` in `scan-ctrl.js`), so no loading/waiting UI is needed for this path — the item's `waiting` flag in `scanBarcode()` still governs only the existing synchronous external-lookup call.

### 3. Lock enforcement

- Client: `scan-ctrl.js` checks `vm.lot.status`; when `'Pending Data'`, disable `scanBarcode()` and the barcode input, and show a "backfill in progress" state in place of the scan form. If a scan is attempted anyway (e.g. a barcode-scanner device firing into a stale/cached page), surface the reason via `ModalSvc.message(...)` — the same modal pattern already used elsewhere in this controller (e.g. the save-success message) — rather than a silent no-op or the generic `audioAlerts.fail()` used for validation failures, since "the Lot is locked for AI backfill" isn't a user error and deserves an explanation.
- Server: the same `getProductDataByBarcode` handler skips the S3 PUT (but still returns whatever data it already found — internal lookups aren't blocked) when the Lot's current status is `'Pending Data'`. Belt-and-suspenders against a stale/bypassed client, per `ai-product-data-backfill`'s aggregate design contract: "must not write any new `fetch/<lot-id>/<barcode>` object for a Lot after it has been locked."

### 4. "Finish Scanning" action

Two entry points, one shared implementation:

- A new button on the scan page (`scan-ctrl.js` / `client-legacy/src/partials/_scan.html`), next to the existing "Save and Continue" / "Save and Exit" — this is where the user is actively deciding they're done adding barcodes.
- A new gated action on the Lot detail page (`view-lot-ctrl.js`), following the existing pattern there (e.g. `verifyListingAndNavigateToSubmission`) — for finishing from outside the scan page.
- Both call the same new `LotSvc` method (e.g. `lot.finishScanning()`), enabled only when `status === 'In Preparation'` **and** the Lot actually uses the scanned-inventory flow (`!lot.pallet && !lot.unmanifested` — pallet-sourced and unmanifested Lots don't go through this scanning flow at all and have no `fetch/`-marker jobs to wait on). Disabled/hidden once `status` has moved past `'In Preparation'`, so it can't be re-triggered after unlock — matches `ai-product-data-backfill`'s aggregate design assumption that "Lot Commander only calls `StartExecution` once, on Done."

New server endpoint (`server/src/routers/lots.js`), sequential steps where **order matters**:

1. Save the manifest if changed (reuse the existing `saveManifest` logic) — the user shouldn't have to click Save first.
2. Set `Lot.status = 'Pending Data'`. This *is* the lock, and it must happen before step 3: if `StartExecution` ran first, there'd be a window where a scan could still race in and create a `fetch/` marker the aggregate workflow's poll loop won't know to wait for.
3. Call `states:StartExecution` on the aggregate state machine with `{ lotId }`, using a **deterministic execution name derived from `lotId`** (e.g. `agg-<lotId>`) instead of a random one. This makes a retried "Finish Scanning" click a safe no-op/conflict rather than spawning a second concurrent execution for the same Lot.

If step 3 fails after step 2 succeeds, the Lot is locked with no execution running — the same "fails closed" trade-off `ai-product-data-backfill`'s aggregate workflow design already accepts when `FinalizeAggregate`'s retries exhaust (see that doc's Error Handling Summary). Surface the failure to the user; retrying "Finish Scanning" is safe because of the deterministic execution name.

### 5. Stuck-Lot recovery

No new admin tooling. Once `'Pending Data'` is a valid `lotStatus` value, the existing generic edit-lot form already provides a manual escape hatch — an admin can hand-edit `status` back to `'Ready'` or `'In Preparation'` for a Lot that's stuck locked (e.g. `FinalizeAggregate` permanently failing, or the step-3 failure mode above). This is an intentional reuse of existing UI, not a gap.

`'Pending Data'` must not be manually *selectable* through that form, though — it's system-controlled, set only by the "Finish Scanning" endpoint (#4). The edit-lot dropdown's option list should exclude `'Pending Data'` from the set of values a user can choose, while still displaying it as the current value (and allowing a change *away* from it to any other status) when a Lot's `status` already happens to be `'Pending Data'` — that's the recovery path this section relies on. In practice: build the dropdown's options as `lotStatusEnum` minus `'Pending Data'`, then union in the Lot's current `status` if it isn't already in that list, so the `<select>` always has a valid option for the current value without offering it as a new target from any other state.

### 6. Config

Add `aiBackfill: { jobsBucket, aggregateStateMachineArn }` to the config object loaded by `server/src/load-config.js` (local `config.local.json` or SSM `/lot-commander/<APP_ENV>/config`, per existing convention), passed into the `ProductData` module constructor and the lots router the same way `server.js` already threads config sections into other modules (e.g. `settings: this.config.upcItemDb`). No new config-loading mechanism.

### 7. Migration: backfill `internal-product-data.source`

New one-off script, `__scripts/migrate-db-backfill-product-data-source.js`, following the existing `__scripts/migrate-db-*.js` convention (raw `mongoose.mongo.MongoClient`, config from `server/config`, not wired into any npm script or CI — run by hand, once per environment, sandbox then production).

Unlike the existing scripts in that directory (which dump-then-loop because each doc needs a different computed value), this one sets a single constant value across every matching doc, so it's one call rather than a fetch-and-map:

```js
db.collection('internal-product-data').updateMany(
  { source: { $exists: false } },
  { $set: { source: 'manual' } }
);
```

- **Scope:** `internal-product-data` only — not `Manifest.inventory[]` subdocuments. Existing manifest items keep no `source` value historically; only manifest saves going forward pick one up, via section 1's schema change.
- **Idempotent** by construction (`$exists: false` filter) — safe to rerun, and order-independent relative to section 1's schema change, since the script uses the raw MongoDB driver and bypasses Mongoose validation entirely, same as the existing `__scripts/migrate-db-*.js` files.
- **Rationale for `'manual'`:** every `internal-product-data` doc that predates this project came from this app's own external-lookup cascade (traject/upcItemDb/fnsku) or manual entry — never AI backfill — so `'manual'` is the correct historical value, distinct from the `` `ai-backfill:${aiSource}` `` values this project's own convention writes going forward.

## Error Handling Summary

| Outcome | Handling |
|---|---|
| External+internal lookup misses during scan, Lot not locked | `fetch/<lotId>/<barcode>` marker written; scan proceeds with incomplete item data, filled in later by the aggregate workflow |
| Scan attempted while Lot is `'Pending Data'` | Client blocks the scan UI; server defensively skips marker creation as a second line of defense |
| `StartExecution` fails after `Lot.status` is already set to `'Pending Data'` (step 4.3) | Lot stays locked (fails closed, same principle as the aggregate workflow's own `FinalizeAggregate` retry-exhaustion handling); user sees an error and can safely retry "Finish Scanning" because the execution name is deterministic |
| Aggregate workflow itself fails permanently (out of this doc's control) | Lot stays `'Pending Data'` indefinitely; recovered via the existing edit-lot form's manual status override (#5) |

## Out of Scope

- IAM policy shape, bucket/state-machine provisioning, cross-account or cross-service trust — separate design doc against `lot-commander-ecs-deploy` (`ai-product-data-backfill`'s `docs/superpowers/specs/2026-08-12-lot-commander-deploy-updates-design.md`).
- Surfacing the aggregate workflow's SNS skipped-barcode notification inside this app's UI (e.g. an in-app banner) — the notification is already operator-visible via SNS/ops alerting; an in-app surface is a deferred idea, not designed here.
- Any change to the existing external product-data lookup sources (traject/upcItemDb/fnsku) themselves.
- Backfilling `source` on existing `Manifest.inventory[]` items — out of scope per the migration's `internal-product-data`-only reasoning above (#7).
