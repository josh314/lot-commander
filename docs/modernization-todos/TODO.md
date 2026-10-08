# Modernization TODOs

Ad-hoc feature/task list for the new client (`client/`), separate from the
phased migration checklists in `docs/modernization/`. Check items off as
they're done; split into per-area files if this grows too large.

## Pages

### ListLots (`client/src/features/lots/ListLots.tsx`)
- [ ] Add controls to adjust the sort options
- [ ] Add a control to set page size

### List Manifests (`client/src/features/manifests/ListManifests.tsx` — not yet created)
- [ ] Blocked on deciding how to serve `ManifestSvcConstants` to the new
      client — see Cross-cutting concerns below.

## Cross-cutting concerns

- [ ] Wire `refreshUser()` (`client/src/components/AuthProvider.tsx`) into
      the axios response interceptor (`client/src/api/api.ts`) so a
      stale/expired session is detected from a real API call without
      forcing a full page reload. The setter exists; nothing calls it yet.
- [ ] Decide how to serve `ManifestSvcConstants` (manifest bucket name +
      CloudFront distribution domain — env-specific, sourced server-side
      from SSM via `global.__config.s3.manifests`, differs between
      `sandbox-autarch` and `wazuezoom`) to the new client. Can't bake these
      in at build time like the other static constants (`AppData`,
      `dbEnums`, etc.), since one Docker image serves both environments.
      Options floated: a small config endpoint, or having the API return
      ready-made manifest URLs instead of exposing the raw config. **Blocks**
      the List Manifests page (see Pages).
- [ ] Migrate the ModalSvc utility modals
- [ ] global styling

## Server / Backend

- [ ] Apply the stashed fix for `server.js`'s global error handler (doesn't
      set an HTTP status before `res.json()`, so every error currently
      returns 200) — see `WIP / TODO` in `CLAUDE.md`.
- [ ] Migrate config loading from SSM Parameter Store to ECS task-definition
      envars — see `Infrastructure` in `CLAUDE.md`.
