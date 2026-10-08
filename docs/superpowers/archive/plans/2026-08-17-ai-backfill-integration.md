# AI Backfill Integration Implementation Plan

> **Status: fully implemented and committed.** All 11 tasks below landed
> (commits `627643d` through `3983056`, plus `f705e1b`/`10649c4` for
> follow-up fixes and docs, and `3983056` for an admin toggle not in the
> original plan — see `git log --oneline --grep="Pending Data\|finish-scanning\|aiBackfill" -i`).
> Checkboxes below are marked done retroactively. File paths were corrected
> for the Phase 1 workspace restructuring (this plan predates it) — see the
> companion spec's Status section for the mapping. Embedded code snippets
> are left as originally written (the historical "as planned" diffs) and
> may differ in minor details from the final committed code; treat the
> actual files as ground truth, not these snippets.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `lot-commander` into the `ai-product-data-backfill` fetch/aggregate workflows — create `fetch/<lotId>/<barcode>` job markers on scan-time cache misses, lock a Lot while backfill runs, and add a "Finish Scanning" action that locks the Lot and starts the aggregate Step Functions execution.

**Architecture:** All changes are additive to existing Express/Mongoose server modules and Angular 1 client controllers/services — no new services, no new HTTP framework. The scan-time product-data lookup (`ProductData.getProductDataByBarcode`) gains an S3 write on cache-miss; a new `POST /api/lots/:lotId/finish-scanning` endpoint locks the Lot (`status: 'Pending Data'`) and calls `states:StartExecution` on the aggregate state machine with a deterministic execution name so retries are safe.

**Tech Stack:** Node.js (CommonJS, no test framework), Express, Mongoose, Angular 1 (webpack), `@aws-sdk/client-s3` (already present), `@aws-sdk/client-sfn` (new dependency, added in Task 2).

**Spec:** `docs/superpowers/archive/specs/2026-08-17-ai-backfill-integration-design.md`

## Global Constraints

- **No test framework in this repo** (confirmed: no `*.test.js`/`*.spec.js` anywhere, no test runner in `package.json`). Per this repo's `CLAUDE.md`, verification is: `node -c <file>` (syntax), `npx eslint --config .eslintrc.server.js <file>` for server files or `npx eslint --config .eslintrc.client.js <file>` for client files (both configs exist and run standalone even though only `lint-server` has an npm script), a throwaway `node -e`/scratch script for logic that doesn't need a live Mongo/AWS connection (Mongoose schema validation via `validateSync()` needs neither), and manual code review for anything that inherently needs a live Mongo connection or a real AWS call. Scratch verification scripts are never committed.
- `lotStatusEnum` (`server/src/modules/enums.js`) is order-sensitive per the spec: `'Pending Data'` goes between `'In Preparation'` and `'Ready'`.
- Config threading follows the constructor-injection pattern already used for `upcItemDb`/`fnskuToAsin`/`traject` (`settings: this.config.<key>` passed into a module's constructor) — **not** the `global.__config` pattern `queueProductDataFetching` uses (that's legacy, documented as a load-order hazard in this repo's `CLAUDE.md`; don't extend it).
- `server/config.local.json` and `__config/config.local*.json` are gitignored, personal, untracked files — never edit them as part of a committed task. Only `server/config.example.json` is tracked and must stay in sync with new config keys (per this repo's `CLAUDE.md`).
- Branch: `ai-backfill-integration` (already created, based on `dev`). Commit after each task.
- New runtime dependency: `@aws-sdk/client-sfn` (not yet in `package.json`; sibling `@aws-sdk/client-s3` is pinned `^3.637.0` — match that version family).
- Deployment/IAM (the bucket/state-machine ARNs actually resolving to real resources) is out of scope — covered by a separate, already-written spec against `lot-commander-ecs-deploy` (`ai-product-data-backfill`'s `docs/superpowers/specs/2026-08-12-lot-commander-deploy-updates-design.md`). This plan only makes the app code correct; it doesn't require real AWS resources to exist to be mergeable.

---

### Task 1: Data model — `'Pending Data'` lot status and `internal-product-data.source`

**Files:**
- Modify: `server/src/modules/enums.js:10`
- Modify: `server/src/models/product-data.js:9-17`

**Interfaces:**
- Produces: `enums.lotStatus` (array) now includes `'Pending Data'` between `'In Preparation'` and `'Ready'` — consumed by `Lot` schema's `status` enum validator, and by `dbEnums.lotStatus` on the client (auto-derived server-side in `server/src/routers/script-builder.js`, no separate client-side enum to touch).
- Produces: `productDataSchema` (used by both the `InternalProductData` model and, via `extendSchema`, `Manifest.inventory` subdocuments) now has an optional `source` field matching `/^(manual|ai-backfill:.+)$/`.

- [x] **Step 1: Add `'Pending Data'` to `lotStatusEnum`**

In `server/src/modules/enums.js`, change:

```js
const lotStatusEnum = [ 'In Preparation', 'Ready', 'Reviewed', 'Listed', 'Sold', 'Shipped', 'Error', 'Decommissioned' ];
```

to:

```js
const lotStatusEnum = [ 'In Preparation', 'Pending Data', 'Ready', 'Reviewed', 'Listed', 'Sold', 'Shipped', 'Error', 'Decommissioned' ];
```

- [x] **Step 2: Add `source` to `productDataSchema`**

In `server/src/models/product-data.js`, change:

```js
const productDataSchema = mongoose.Schema({

  barcode: String,
  asin: String,
  title: String,
  description: String,
  brand: String,
  price: Number,
  images: [ String ],

}, { timestamps: true } ); // note that timestamps will be ignored when this is used as a subschema
```

to:

```js
const productDataSchema = mongoose.Schema({

  barcode: String,
  asin: String,
  title: String,
  description: String,
  brand: String,
  price: Number,
  images: [ String ],
  source: {
    type: String,
    match: /^(manual|ai-backfill:.+)$/
  },

}, { timestamps: true } ); // note that timestamps will be ignored when this is used as a subschema
```

- [x] **Step 3: Syntax + lint check**

```bash
node -c server/src/modules/enums.js
node -c server/src/models/product-data.js
npx eslint --config .eslintrc.server.js server/src/modules/enums.js server/src/models/product-data.js
```

Expected: no output from `node -c` (silent success), no eslint errors.

- [x] **Step 4: Manual verification — schema validation**

Run this scratch script with `node <path>` (create it anywhere outside the repo's tracked files, e.g. your session's scratch/tmp directory; delete it after):

```js
const mongoose = require('/Users/josh/dev/apps/lot-commander/node_modules/mongoose');
const { schema } = require('/Users/josh/dev/apps/lot-commander/server/src/models/product-data');

const Model = mongoose.model('TmpProductDataVerify', schema);

const valid1 = new Model({ barcode: '123', source: 'manual' });
const valid2 = new Model({ barcode: '123', source: 'ai-backfill:gemini' });
const invalid = new Model({ barcode: '123', source: 'bogus' });
const missing = new Model({ barcode: '123' }); // source is optional

if (valid1.validateSync()) throw new Error('expected manual to be valid');
if (valid2.validateSync()) throw new Error('expected ai-backfill:gemini to be valid');
if (!invalid.validateSync() || !invalid.validateSync().errors.source) throw new Error('expected bogus source to fail validation');
if (missing.validateSync()) throw new Error('expected missing source to be valid (optional field)');

console.log('OK: product-data source validation behaves as expected');
```

(Run from anywhere — the two `require` calls use absolute paths so `cwd` doesn't matter.)

Expected output: `OK: product-data source validation behaves as expected`

- [x] **Step 5: Manual verification — enum ordering**

```bash
node -e "const enums = require('./server/src/modules/enums'); const idx = enums.lotStatus; if (idx.indexOf('Pending Data') !== idx.indexOf('In Preparation') + 1 || idx.indexOf('Pending Data') !== idx.indexOf('Ready') - 1) { throw new Error('Pending Data not between In Preparation and Ready: ' + JSON.stringify(idx)); } console.log('OK:', idx);"
```

Expected: prints `OK: [ 'In Preparation', 'Pending Data', 'Ready', ... ]`

- [x] **Step 6: Commit**

```bash
git add server/src/modules/enums.js server/src/models/product-data.js
git commit -m "Add Pending Data lot status and product-data source field"
```

---

### Task 2: Config plumbing — `aiBackfill` settings and the `@aws-sdk/client-sfn` dependency

**Files:**
- Modify: `server/package.json` (add dependency — this plan predates the
  Phase 1 workspace split; at time of actual implementation this landed in
  `server/package.json`, not root, since root is purely coordinating)
- Modify: `server/config.example.json`
- Modify: `server/src/server.js:310-311`, `server/src/server.js:373-390`
- Modify: `server/src/routers/index.js:14-31`, `server/src/routers/index.js:42`

**Interfaces:**
- Produces: `this.config.aiBackfill` (shape `{ jobsBucket: string, aggregateStateMachineArn: string }`) is now threaded into `ProductData`'s constructor as `settings` (consumed by Task 3) and into the `modules` object as `aiBackfill` (consumed by Task 6 via `routers/index.js` → `routers/lots.js`).

- [x] **Step 1: Add the `@aws-sdk/client-sfn` dependency**

```bash
npm install @aws-sdk/client-sfn@^3.637.0
```

Expected: `server/package.json`'s `dependencies` gains `"@aws-sdk/client-sfn": "^3.637.0"` (or whatever exact version npm resolves within that range), `package-lock.json` updates.

- [x] **Step 2: Document the config shape in `server/config.example.json`**

Add a new top-level key (after the existing `"s3"` block, before the closing `}`):

```json
  "aiBackfill": {
    "jobsBucket": "REPLACE_ME",
    "aggregateStateMachineArn": "REPLACE_ME"
  }
```

Match the existing file's indentation/comma style — this is the last key before the file's closing brace, so it takes no trailing comma (mirror how `"s3"` currently sits as the last block).

- [x] **Step 3: Thread config into `ProductData`'s constructor call**

In `server/src/server.js`, change (around line 310-311):

```js
    const ProductData = require( './modules/product-data' );
    const productData = new ProductData( Object.assign( { fnskuToAsin, upcItemDb, traject }, models ) );
```

to:

```js
    const ProductData = require( './modules/product-data' );
    const productData = new ProductData( Object.assign( { fnskuToAsin, upcItemDb, traject, settings: this.config.aiBackfill }, models ) );
```

- [x] **Step 4: Thread config into the `modules` object**

In `server/src/server.js`, in the `modules` object (around line 373-390), add `aiBackfill`:

```js
    const modules = {
      aiBackfill: this.config.aiBackfill,
      appSettings,
      // bstock,
      countCommander,
      eventsDbClient,
      fulfillmentCommander,
      inventoryCommander,
      listings: listingsSubmitter,
      lotdb,
      manifests,
      manualInventoryDbClient,
      productData,
      shopifyGql: shopifyGqlClient,
      shopifyOrders,
      siteAnnouncements,
      storeMetafieldSchemaDb,
      userDbClient: this.users,
    };
```

- [x] **Step 5: Thread `aiBackfill` through `routers/index.js` to the lots router**

In `server/src/routers/index.js`, change the `routes({...})` signature (lines 14-31):

```js
function routes({
  appSettings,
  // bstock,
  countCommander,
  eventsDbClient,
  fulfillmentCommander,
  inventoryCommander,
  listings,
  lotdb,
  manifests,
  manualInventoryDbClient,
  productData,
  shopifyGql,
  shopifyOrders,
  siteAnnouncements,
  storeMetafieldSchemaDb,
  userDbClient
}) {
```

to:

```js
function routes({
  aiBackfill,
  appSettings,
  // bstock,
  countCommander,
  eventsDbClient,
  fulfillmentCommander,
  inventoryCommander,
  listings,
  lotdb,
  manifests,
  manualInventoryDbClient,
  productData,
  shopifyGql,
  shopifyOrders,
  siteAnnouncements,
  storeMetafieldSchemaDb,
  userDbClient
}) {
```

And change line 42 from:

```js
  router.use('/api/lots', require( './lots' )( { inventoryCommander, lotdb, manifests } ) );
```

to:

```js
  router.use('/api/lots', require( './lots' )( { aiBackfill, inventoryCommander, lotdb, manifests } ) );
```

Note: `server/src/routers/lots.js`'s `routes({...})` function doesn't accept `aiBackfill` yet — that's added in Task 6, which is where it's first used. Passing it here now is harmless (extra destructured properties are just ignored until Task 6 adds it to the callee's signature).

- [x] **Step 6: Syntax + lint check**

```bash
node -c server/src/server.js
node -c server/src/routers/index.js
npx eslint --config .eslintrc.server.js server/src/server.js server/src/routers/index.js
```

Expected: no output from `node -c`, no eslint errors.

- [x] **Step 7: Manual verification — grep trace**

```bash
grep -n "aiBackfill" server/src/server.js server/src/routers/index.js server/config.example.json server/package.json
```

Expected: shows `aiBackfill` threaded through `server.js` (both the `ProductData` constructor call and the `modules` object), `routers/index.js` (both the function signature and the `require('./lots')(...)` call), present in `config.example.json`, and `@aws-sdk/client-sfn` present in `package.json`.

- [x] **Step 8: Commit**

```bash
git add server/package.json package-lock.json server/config.example.json server/src/server.js server/src/routers/index.js
git commit -m "Thread aiBackfill config through ProductData and the lots router"
```

---

### Task 3: Fetch-job creation and lock enforcement in `ProductData.getProductDataByBarcode`

**Files:**
- Modify: `server/src/modules/product-data.js:1-14` (imports), `server/src/modules/product-data.js:72-128` (class constructor + method)

**Interfaces:**
- Consumes: `this.settings.jobsBucket` (from Task 2's `ProductData` constructor injection), `this.Lot` (a Mongoose model, added to the constructor destructuring in this task — was already available via `models` spread in `server.js`'s `new ProductData(Object.assign({...}, models))` call but not previously named in the constructor's destructured parameter list).
- Produces: `getProductDataByBarcode(barcode, { source, type, lotId })` now accepts `lotId`. When called with no `source` and both the internal lookup and every external source miss, it writes an S3 object at key `fetch/<lotId>/<barcode>` to `this.settings.jobsBucket` — unless the Lot's current `status` is `'Pending Data'` (locked), in which case it skips the write. No change to the method's return shape.

- [x] **Step 1: Add `PutObjectCommand` to the S3 import**

In `server/src/modules/product-data.js`, change (lines 7-9):

```js
const {
  S3Client,
} = require('@aws-sdk/client-s3');
```

to:

```js
const {
  S3Client,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
```

- [x] **Step 2: Add `Lot` and `settings` to the constructor**

Change (lines 74-93):

```js
  constructor( {
    FallbackProductData,
    fnskuToAsin,
    InternalProductData,
    traject,
    upcItemDb,
  } ) {

    Object.assign(
      this,
      {
        FallbackProductData,
        fnskuToAsin,
        InternalProductData,
        traject,
        upcItemDb,
      }
    );

  }
```

to:

```js
  constructor( {
    FallbackProductData,
    fnskuToAsin,
    InternalProductData,
    Lot,
    settings,
    traject,
    upcItemDb,
  } ) {

    Object.assign(
      this,
      {
        FallbackProductData,
        fnskuToAsin,
        InternalProductData,
        Lot,
        settings,
        traject,
        upcItemDb,
      }
    );

  }
```

- [x] **Step 3: Add `lotId` handling and the fetch-job-creation branch to `getProductDataByBarcode`**

Change (lines 95-128):

```js
  async getProductDataByBarcode( barcode, { source, type } ) {

    let product;

    if( source ) {

      product = await this.getProductDataFromSource( barcode, source, type );

    }
    else {

      product = await this.getInternalProductData( barcode );

      if( !product ) {
        if ( isNumericString( barcode ) ) {
          product = await this.getProductDataByUpc( barcode );
        }
        else {
          product = await this.getProductDataByFnskuOrAsin( barcode );
        }
      }

      if( product ) {
        product.title = product.title || product.description;
      }

    }


    return {
      ...{ barcode },
      ...( product || {} )
    };
  }
```

to:

```js
  async getProductDataByBarcode( barcode, { source, type, lotId } ) {

    let product;

    if( source ) {

      product = await this.getProductDataFromSource( barcode, source, type );

    }
    else {

      product = await this.getInternalProductData( barcode );

      if( !product ) {
        if ( isNumericString( barcode ) ) {
          product = await this.getProductDataByUpc( barcode );
        }
        else {
          product = await this.getProductDataByFnskuOrAsin( barcode );
        }
      }

      if( product ) {
        product.title = product.title || product.description;
      }
      else if( lotId ) {
        await this.createFetchJobIfLotNotLocked( lotId, barcode );
      }

    }


    return {
      ...{ barcode },
      ...( product || {} )
    };
  }

  async createFetchJobIfLotNotLocked( lotId, barcode ) {

    const lot = await this.Lot.findById( lotId ).select( 'status' ).lean();

    if( lot && lot.status === 'Pending Data' ) {
      return;
    }

    const params = {
      Bucket: this.settings.jobsBucket,
      Key: `fetch/${ lotId }/${ barcode }`,
    };

    return s3.send( new PutObjectCommand( params ) );

  }
```

- [x] **Step 4: Syntax + lint check**

```bash
node -c server/src/modules/product-data.js
npx eslint --config .eslintrc.server.js server/src/modules/product-data.js
```

Expected: no output from `node -c`, no eslint errors.

- [x] **Step 5: Manual verification — lock-check branching (no live Mongo/S3 needed)**

This exercises `createFetchJobIfLotNotLocked`'s branching logic in isolation, with a fake `Lot` model and a fake `s3`. Because `s3` is a module-private `const` (not exported), we can't intercept the real module's `s3.send` from outside — so this script re-implements just the branching logic being verified (the `lot && lot.status === 'Pending Data'` short-circuit) against a fake `Lot.findById(...).select(...).lean()` chain, confirming the chain call shape matches what Mongoose actually supports. Pair this with the manual review in Step 6 for the parts that do need the real module (the S3 `Key`/`Bucket` values, and the `else if (lotId)` gating in `getProductDataByBarcode`).

```js
function fakeLotModel( statusToReturn ) {
  return {
    findById( id ) {
      return {
        select( _fields ) {
          return {
            lean() {
              return Promise.resolve( statusToReturn === undefined ? null : { status: statusToReturn } );
            }
          };
        }
      };
    }
  };
}

async function createFetchJobIfLotNotLocked( Lot, writes, lotId, barcode ) {
  const lot = await Lot.findById( lotId ).select( 'status' ).lean();
  if( lot && lot.status === 'Pending Data' ) {
    return;
  }
  writes.push( { Bucket: 'test-bucket', Key: `fetch/${ lotId }/${ barcode }` } );
}

(async () => {
  let writes = [];
  await createFetchJobIfLotNotLocked( fakeLotModel('In Preparation'), writes, 'lot1', 'bc1' );
  if( writes.length !== 1 || writes[0].Key !== 'fetch/lot1/bc1' ) throw new Error('expected a write when lot is unlocked, got: ' + JSON.stringify(writes));

  writes = [];
  await createFetchJobIfLotNotLocked( fakeLotModel('Pending Data'), writes, 'lot1', 'bc1' );
  if( writes.length !== 0 ) throw new Error('expected no write when lot is locked, got: ' + JSON.stringify(writes));

  writes = [];
  await createFetchJobIfLotNotLocked( fakeLotModel(undefined), writes, 'missing-lot', 'bc1' );
  if( writes.length !== 1 ) throw new Error('expected a write when lot is not found (fail-open), got: ' + JSON.stringify(writes));

  console.log('OK: lock-check branching behaves as expected');
})();
```

Expected output: `OK: lock-check branching behaves as expected`

- [x] **Step 6: Manual code review checklist**

Open `server/src/modules/product-data.js` and confirm by eye:
- The S3 `Key` in `createFetchJobIfLotNotLocked` is exactly `` `fetch/${ lotId }/${ barcode }` `` — matches `ai-product-data-backfill`'s expected key layout (`fetch/<lot-id>/<barcode>`).
- `createFetchJobIfLotNotLocked` is only called from the `else if( lotId )` branch that runs when `source` is falsy (the real scan path) **and** `product` is falsy after the internal+external cascade — never in the `source`-override branch.
- `this.settings.jobsBucket` is used for the new write, `global.__config.s3.productDataJobs.bucket` (in the untouched `queueProductDataFetching`) is not touched or conflated with it.

- [x] **Step 7: Commit**

```bash
git add server/src/modules/product-data.js
git commit -m "Create fetch-job markers on scan-time product-data cache misses"
```

---

### Task 4: Thread `lotId` through the client-side product-data lookup call chain

**Files:**
- Modify: `client-legacy/src/js/api.js:1608`
- Modify: `client-legacy/src/js/ng/services/product-data-svc.js:107`
- Modify: `client-legacy/src/js/ng/controllers/scan-ctrl.js:236`

**Interfaces:**
- Consumes: none new (this task is pure plumbing between existing layers).
- Produces: `ProductDataSvc.getProductDataByBarcode(barcode, { source, type, lotId })` — `scanBarcode()` in `scan-ctrl.js` now passes the current Lot's `_id` as `lotId` on every scan-triggered lookup.

No server-side router change is needed: `server/src/routers/product-data.js`'s `getProductDataByBarcode` handler already does `productData.getProductDataByBarcode( barcode, req.query )`, passing the entire query string through — so `lotId` reaches `ProductData.getProductDataByBarcode` (Task 3) automatically once the client sends it as a query param.

- [x] **Step 1: Add `lotId` to `client-legacy/src/js/api.js`'s `getProductDataByBarcode`**

Change:

```js
export function getProductDataByBarcode( barcode, { source, type } = {} ) {

  return axios({
    method: 'get',
    url: `/api/product-data/${ encodeURIComponent( barcode ) }${ source || type ? '?' + getQueryString({ source, type })  : '' }`
  })
    .then( resp => resp.data );
}
```

to:

```js
export function getProductDataByBarcode( barcode, { source, type, lotId } = {} ) {

  return axios({
    method: 'get',
    url: `/api/product-data/${ encodeURIComponent( barcode ) }${ source || type || lotId ? '?' + getQueryString({ source, type, lotId })  : '' }`
  })
    .then( resp => resp.data );
}
```

(`getQueryString` already filters out `undefined` values via `Object.entries(obj).filter(([_, value]) => value !== undefined)` — no change needed there.)

- [x] **Step 2: Add `lotId` to `ProductDataSvc.getProductDataByBarcode`**

In `client-legacy/src/js/ng/services/product-data-svc.js`, change line 107:

```js
    const getProductDataByBarcode = ( barcode, { source, type } = {} ) => $q.when( api.getProductDataByBarcode( barcode, { source, type } ) ).then( resp => resp.product );
```

to:

```js
    const getProductDataByBarcode = ( barcode, { source, type, lotId } = {} ) => $q.when( api.getProductDataByBarcode( barcode, { source, type, lotId } ) ).then( resp => resp.product );
```

- [x] **Step 3: Pass the Lot's `_id` from `scanBarcode()`**

In `client-legacy/src/js/ng/controllers/scan-ctrl.js`, change line 236:

```js
            ProductDataSvc.getProductDataByBarcode( item.data.barcode ).then( product => {
```

to:

```js
            ProductDataSvc.getProductDataByBarcode( item.data.barcode, { lotId: vm.lot._id } ).then( product => {
```

- [x] **Step 4: Syntax + lint check**

```bash
node -c client-legacy/src/js/api.js
npx eslint --config .eslintrc.client.js client-legacy/src/js/api.js client-legacy/src/js/ng/services/product-data-svc.js client-legacy/src/js/ng/controllers/scan-ctrl.js
```

Note: `node -c` only works on the plain CommonJS-ish `api.js` file cleanly; `product-data-svc.js` and `scan-ctrl.js` are webpack/Angular modules using `import` syntax, so rely on the eslint check (which has `sourceType: 'module'` configured) for those two.

Expected: no output from `node -c`, no eslint errors.

- [x] **Step 5: Manual code review checklist**

Confirm by eye:
- `getQueryString({ source, type, lotId })` in `api.js` will produce e.g. `?lotId=<id>` when only `lotId` is set (no `source`/`type`) — the ternary's condition (`source || type || lotId`) correctly includes the `lotId`-only case.
- `scan-ctrl.js`'s new call site reads `vm.lot._id`, which is always populated by the time `scanBarcode()` runs (set in `init()`'s `LotSvc.load(...).then( _lot => { vm.lot = _lot; ...})`, and `scanBarcode()` can't be invoked before that resolves since the barcode input isn't rendered until `vm.lot` exists).

- [x] **Step 6: Commit**

```bash
git add client-legacy/src/js/api.js client-legacy/src/js/ng/services/product-data-svc.js client-legacy/src/js/ng/controllers/scan-ctrl.js
git commit -m "Thread lotId through the client-side product-data lookup call chain"
```

---

### Task 5: Client-side scan lock enforcement

**Files:**
- Modify: `client-legacy/src/js/ng/controllers/scan-ctrl.js:218-260` (the `scanBarcode` function)
- Modify: `client-legacy/src/partials/_scan.html:75-85`

**Interfaces:**
- Consumes: `vm.lot.status` (already present on the `Lot` client model — no new field needed, it's the same enum value from Task 1's server-side `lotStatusEnum` change).
- Produces: when `vm.lot.status === 'Pending Data'`, the barcode input is replaced with an informational message, and `scanBarcode()` short-circuits with a modal instead of attempting to scan (belt-and-suspenders in case a scanner device fires into a stale/cached page).

- [x] **Step 1: Guard `scanBarcode()` against a locked Lot**

In `client-legacy/src/js/ng/controllers/scan-ctrl.js`, change the start of `scanBarcode()` (line 218):

```js
    async function scanBarcode( ) {

      const scannedBarcode = vm.scannedBarcode;
```

to:

```js
    async function scanBarcode( ) {

      if( vm.lot.status === 'Pending Data' ) {

        await ModalSvc.message( {
          header: 'Backfill in progress',
          html: '<p>This Lot is locked while AI backfill fills in missing product data. Scanning is disabled until backfill completes.</p>',
          buttonText: 'OK',
        });

        return;

      }

      const scannedBarcode = vm.scannedBarcode;
```

- [x] **Step 2: Replace the barcode input with a locked-state message when the Lot is locked**

In `client-legacy/src/partials/_scan.html`, change (lines 75-85):

```html
	<div class="row well">
		<div class="col-xs-12">
      <div class="row">
        <div class="form-group" ng-class="{ 'has-error' : $ctrl.scannedBarcodeInvalid }">
          <label for="barcodeInput">Scan Barcode here</label>
          <input type="text" class="form-control" ng-model="$ctrl.scannedBarcode" id="barcodeInput" ng-keyup="$event.keyCode == 13 && $ctrl.scanBarcode()" autocomplete="off" autofocus>
          <span class="text-danger h4" ng-show="$ctrl.scannedBarcodeInvalid">Invalid Barcode Format</span>
        </div>
      </div>
		</div>
	</div>
```

to:

```html
	<div class="row well" ng-if="$ctrl.lot.status === 'Pending Data'">
		<div class="col-xs-12">
      <div class="alert alert-info">Backfill in progress &mdash; scanning is locked while AI backfill fills in missing product data for this Lot.</div>
		</div>
	</div>
	<div class="row well" ng-if="$ctrl.lot.status !== 'Pending Data'">
		<div class="col-xs-12">
      <div class="row">
        <div class="form-group" ng-class="{ 'has-error' : $ctrl.scannedBarcodeInvalid }">
          <label for="barcodeInput">Scan Barcode here</label>
          <input type="text" class="form-control" ng-model="$ctrl.scannedBarcode" id="barcodeInput" ng-keyup="$event.keyCode == 13 && $ctrl.scanBarcode()" autocomplete="off" autofocus>
          <span class="text-danger h4" ng-show="$ctrl.scannedBarcodeInvalid">Invalid Barcode Format</span>
        </div>
      </div>
		</div>
	</div>
```

- [x] **Step 3: Syntax + lint check**

```bash
npx eslint --config .eslintrc.client.js client-legacy/src/js/ng/controllers/scan-ctrl.js
```

Expected: no eslint errors. (`_scan.html` has no automated checker in this repo — covered by manual review below.)

- [x] **Step 4: Manual code review checklist**

Confirm by eye:
- Both new `ng-if` blocks in `_scan.html` use the exact same condition (`$ctrl.lot.status === 'Pending Data'` / `!== 'Pending Data'`) so exactly one is ever shown, never both or neither.
- The rest of the scan page (SKU count, inventory count, Save/Save & finish buttons) is untouched and still renders regardless of lock state — only the barcode-entry `well` is swapped.
- `scanBarcode()`'s new guard runs before `validateBarcode(scannedBarcode)` and before `vm.lot.addInventory(...)`, so a locked Lot never gets a new inventory item added even if the (now-hidden) input somehow still has a stale value.

- [x] **Step 5: Commit**

```bash
git add client-legacy/src/js/ng/controllers/scan-ctrl.js client-legacy/src/partials/_scan.html
git commit -m "Lock the scan page UI while a Lot is Pending Data"
```

---

### Task 6: "Finish Scanning" server endpoint

**Files:**
- Modify: `server/src/routers/lots.js:1-20` (imports), `server/src/routers/lots.js:59` (routes signature), `server/src/routers/lots.js:119-123` (route registration), `server/src/routers/lots.js:372-420` (`saveManifest` handler — refactored)

**Interfaces:**
- Consumes: `aiBackfill` (`{ jobsBucket, aggregateStateMachineArn }`, from Task 2's `routers/index.js` threading), `lotdb.getLotById(lotId)` / `lotdb.editLot(lotId, editDoc)` (existing, `server/src/modules/lot-db-client.js`), `manifests.saveManifest(data)` (existing, `server/src/modules/manifests.js`).
- Produces: `POST /api/lots/:lotId/finish-scanning` — body `{ inventory }` (optional). Saves the manifest if `inventory` is present, sets `Lot.status = 'Pending Data'`, starts the aggregate Step Functions execution with a deterministic name (`agg-<lotId>`), and responds `{ lot }` with the updated Lot. Also produces a reusable `saveManifestForLot(lotId, inventory)` helper, extracted from the existing `saveManifest` handler, used by both that handler and the new one.

- [x] **Step 1: Add the SFN client and `IllegalActionError` import**

In `server/src/routers/lots.js`, change the top imports (lines 1-18):

```js
const path = require('path');
const fs = require('fs');

const express = require('express');
const dayjs = require('dayjs');
const axios = require('axios');

const formidable = require('formidable');

const auth = require('../auth');
const helpers = require('../helpers');
const collage = require('../modules/collage');
const {
  ChildResourceNotFoundError,
  ResourceNotFoundError
} = require('../errors');

const manifestSvc = require( '../modules/manifest-svc' );
```

to:

```js
const path = require('path');
const fs = require('fs');

const express = require('express');
const dayjs = require('dayjs');
const axios = require('axios');

const formidable = require('formidable');

const {
  SFNClient,
  StartExecutionCommand,
} = require('@aws-sdk/client-sfn');

const auth = require('../auth');
const helpers = require('../helpers');
const collage = require('../modules/collage');
const {
  ChildResourceNotFoundError,
  IllegalActionError,
  ResourceNotFoundError
} = require('../errors');

const manifestSvc = require( '../modules/manifest-svc' );

const sfn = new SFNClient({
  region: 'us-east-1',
});
```

- [x] **Step 2: Accept `aiBackfill` in the `routes({...})` signature**

Change line 59:

```js
function routes({ inventoryCommander, lotdb, manifests }) {
```

to:

```js
function routes({ aiBackfill, inventoryCommander, lotdb, manifests }) {
```

- [x] **Step 3: Register the new route**

Change (lines 119-123):

```js
  router.post(
    '/:lotId/manifest/',
    auth.isAuthorized( 'EDIT_LOT' ),
    saveManifest
  );
```

to:

```js
  router.post(
    '/:lotId/manifest/',
    auth.isAuthorized( 'EDIT_LOT' ),
    saveManifest
  );
  router.post(
    '/:lotId/finish-scanning',
    auth.isAuthorized( 'EDIT_LOT' ),
    finishScanning
  );
```

- [x] **Step 4: Extract `saveManifestForLot` and refactor `saveManifest` to use it; add `finishScanning`**

Change (lines 372-420):

```js
  async function saveManifest( req, res, next ) {

    try {

      const { lotId } = req.params;
      const lot = await lotdb.getLotById( lotId );

      if( lot ) {

        const { inventory } = req.body;

        const _data = {
          _id: lot.manifestId,
          handle: lot.handle,
          inventory,
        };

        const manifest = await manifests.saveManifest( _data );

        if(manifest) {

          const totalUnits = inventory.reduce( ( total, inventoryItem ) => total + ( parseInt( inventoryItem.quantity ) || 0 ), 0 );
          const estimatedRetailValue = inventory.reduce( ( total, inventoryItem ) => total + ( parseFloat( inventoryItem.price )*parseInt( inventoryItem.quantity ) || 0 ), 0 );

          const lotUpdate = {
            _id: lot._id,
            totalUnits,
            estimatedRetailValue,
            manifestId: manifest._id,
          };
          await lotdb.editLot( lot._id, lotUpdate );

        }

        res.json( { manifest } );

      }
      else {

        throw new ResourceNotFoundError( { type: 'lot', id: lotId } );

      }

    }
    catch(e) {
      return next( e );
    }

  }
```

to:

```js
  async function saveManifestForLot( lotId, inventory ) {

    const lot = await lotdb.getLotById( lotId );

    if( !lot ) {
      throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
    }

    const _data = {
      _id: lot.manifestId,
      handle: lot.handle,
      inventory,
    };

    const manifest = await manifests.saveManifest( _data );

    if(manifest) {

      const totalUnits = inventory.reduce( ( total, inventoryItem ) => total + ( parseInt( inventoryItem.quantity ) || 0 ), 0 );
      const estimatedRetailValue = inventory.reduce( ( total, inventoryItem ) => total + ( parseFloat( inventoryItem.price )*parseInt( inventoryItem.quantity ) || 0 ), 0 );

      const lotUpdate = {
        _id: lot._id,
        totalUnits,
        estimatedRetailValue,
        manifestId: manifest._id,
      };
      await lotdb.editLot( lot._id, lotUpdate );

    }

    return manifest;

  }

  async function saveManifest( req, res, next ) {

    try {

      const { lotId } = req.params;
      const { inventory } = req.body;

      const manifest = await saveManifestForLot( lotId, inventory );

      res.json( { manifest } );

    }
    catch(e) {
      return next( e );
    }

  }

  async function finishScanning( req, res, next ) {

    try {

      const { lotId } = req.params;
      const { inventory } = req.body;

      const existingLot = await lotdb.getLotById( lotId );

      if( !existingLot ) {
        throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
      }

      if( existingLot.pallet || existingLot.unmanifested ) {
        throw new IllegalActionError( `Lot ${ lotId } does not use the scanned-inventory flow, so it cannot finish scanning.` );
      }

      if( existingLot.status !== 'In Preparation' && existingLot.status !== 'Pending Data' ) {
        throw new IllegalActionError( `Lot ${ lotId } cannot finish scanning from status '${ existingLot.status }'.` );
      }

      if( inventory ) {
        await saveManifestForLot( lotId, inventory );
      }

      const { lot } = await lotdb.editLot( lotId, { status: 'Pending Data' } );

      await sfn.send( new StartExecutionCommand({
        stateMachineArn: aiBackfill.aggregateStateMachineArn,
        name: `agg-${ lotId }`,
        input: JSON.stringify( { lotId } ),
      }) );

      res.json( { lot: lot || existingLot } );

    }
    catch(e) {
      return next( e );
    }

  }
```

- [x] **Step 5: Syntax + lint check**

```bash
node -c server/src/routers/lots.js
npx eslint --config .eslintrc.server.js server/src/routers/lots.js
```

Expected: no output from `node -c`, no eslint errors.

- [x] **Step 6: Manual verification — status/pallet/unmanifested guard branching (no live Mongo/AWS needed)**

```js
function guardCheck( existingLot ) {
  if( existingLot.pallet || existingLot.unmanifested ) {
    return 'not-scanned-flow';
  }
  if( existingLot.status !== 'In Preparation' && existingLot.status !== 'Pending Data' ) {
    return 'wrong-status';
  }
  return 'ok';
}

const cases = [
  [{ status: 'In Preparation' }, 'ok'],                                   // first call
  [{ status: 'Pending Data' }, 'ok'],                                     // retry after StartExecution failed
  [{ status: 'Ready' }, 'wrong-status'],                                  // already unlocked past this point
  [{ status: 'In Preparation', pallet: 'abc' }, 'not-scanned-flow'],      // pallet-sourced lot
  [{ status: 'In Preparation', unmanifested: true }, 'not-scanned-flow'], // unmanifested lot
];

for( const [ lot, expected ] of cases ) {
  const actual = guardCheck( lot );
  if( actual !== expected ) throw new Error(`guardCheck(${JSON.stringify(lot)}) = ${actual}, expected ${expected}`);
}

console.log('OK: finishScanning guard branching behaves as expected');
```

Expected output: `OK: finishScanning guard branching behaves as expected`

- [x] **Step 7: Manual code review checklist**

Confirm by eye:
- `lotdb.editLot( lotId, { status: 'Pending Data' } )` (the lock) happens **before** the `sfn.send(new StartExecutionCommand(...))` call — matches the spec's ordering requirement (locking first closes the race window where a scan could still create a `fetch/` marker the aggregate workflow won't wait for).
- The execution `name` is exactly `` `agg-${ lotId }` `` — deterministic per Lot, so a retried "Finish Scanning" click reuses the same name. Because the `input` (`{ lotId }`) is identical across retries too, AWS Step Functions' `StartExecution` is idempotent for matching name+input (returns the existing execution's details rather than throwing `ExecutionAlreadyExists`) — no explicit `try`/`catch` around that specific error is needed.
- `lotdb.editLot`'s return shape is `{ lot, edits }` on a real change, but `{}` (no `lot` key) when the edit is a no-op (e.g. retrying when `status` is already `'Pending Data'`) — the handler's `res.json({ lot: lot || existingLot })` fallback covers that case, since `existingLot` already reflects the current (already-locked) status.
- `res.json({ lot: ... })` matches what the client (Task 7) expects to unpack.

- [x] **Step 8: Commit**

```bash
git add server/src/routers/lots.js
git commit -m "Add Finish Scanning endpoint: lock lot and start aggregate execution"
```

---

### Task 7: "Finish Scanning" client data layer

**Files:**
- Modify: `client-legacy/src/js/api.js` (add `finishScanning`, after `saveLotManifest` at line 297)
- Modify: `client-legacy/src/js/ng/services/lot-svc.js:910-943` (extract `_prepareInventoryForSave`, add `finishScanning`)

**Interfaces:**
- Produces: `api.finishScanning(lotId, inventory)` → `POST /api/lots/:lotId/finish-scanning`, resolves to the updated `lot` object (mirrors `api.editLot`'s `.then(resp => resp.data && resp.data.lot)` pattern).
- Produces: `Lot.prototype.finishScanning()` — client `Lot` instance method, same shape as the existing `Lot.prototype.saveManifest()`, calling `api.finishScanning` instead of `api.saveLotManifest`. Both now share a `_prepareInventoryForSave()` private helper instead of duplicating the filter/synthetic-fields logic.

- [x] **Step 1: Add `api.finishScanning`**

In `client-legacy/src/js/api.js`, after the existing `saveLotManifest` function (after line 297), add:

```js

export function finishScanning( lotId, inventory ) {

  if( !lotId ) {
    throw new Error('Must supply lot ID.');
  }

  return axios({
    method: 'post',
    url: `/api/lots/${lotId}/finish-scanning`,
    data: { inventory }
  })
    .then( resp => resp.data && resp.data.lot );

}
```

- [x] **Step 2: Extract `_prepareInventoryForSave` and add `finishScanning` to the `Lot` class**

In `client-legacy/src/js/ng/services/lot-svc.js`, change `saveManifest()` (lines 910-943):

```js
      saveManifest() {
        // This filters out completely empty lines
        this._inventory = this._inventory.filter( item => {

          if( !item.data.quantity ) {
            return false;
          }

          if( item.data.barcode || item.data.description || item.data.quantity || item.data.price ) {
            return true;
          }

          return false;

        });

        this.updateSyntheticFieldsFromInventory();

        const inventoryData = [];
        for( let item of this._inventory ) {
          if( item.data.quantity ) {

            inventoryData.push( { ...item.data } );

          }
        }

        return this.saveManuallyInputProductData().then( _ => {

          return $q.when( api.saveLotManifest( this._id, inventoryData ) );

        });

      }
```

to:

```js
      _prepareInventoryForSave() {
        // This filters out completely empty lines
        this._inventory = this._inventory.filter( item => {

          if( !item.data.quantity ) {
            return false;
          }

          if( item.data.barcode || item.data.description || item.data.quantity || item.data.price ) {
            return true;
          }

          return false;

        });

        this.updateSyntheticFieldsFromInventory();

        const inventoryData = [];
        for( let item of this._inventory ) {
          if( item.data.quantity ) {

            inventoryData.push( { ...item.data } );

          }
        }

        return inventoryData;
      }

      saveManifest() {

        const inventoryData = this._prepareInventoryForSave();

        return this.saveManuallyInputProductData().then( _ => {

          return $q.when( api.saveLotManifest( this._id, inventoryData ) );

        });

      }

      finishScanning() {

        const inventoryData = this._prepareInventoryForSave();

        return this.saveManuallyInputProductData().then( _ => {

          return $q.when( api.finishScanning( this._id, inventoryData ) );

        });

      }
```

- [x] **Step 3: Syntax + lint check**

```bash
node -c client-legacy/src/js/api.js
npx eslint --config .eslintrc.client.js client-legacy/src/js/api.js client-legacy/src/js/ng/services/lot-svc.js
```

Expected: no output from `node -c`, no eslint errors.

- [x] **Step 4: Manual code review checklist**

Confirm by eye:
- `saveManifest()` and `finishScanning()` are now identical except for the final `api.*` call (`api.saveLotManifest` vs `api.finishScanning`) — no behavior changed for the existing `saveManifest()` path (same filter, same synthetic-fields update, same `saveManuallyInputProductData()` call before the API call).
- `api.finishScanning`'s error-throwing guard (`if(!lotId) throw ...`) matches the style of `api.editLot`/`api.saveLotManifest` immediately above it in the file.

- [x] **Step 5: Commit**

```bash
git add client-legacy/src/js/api.js client-legacy/src/js/ng/services/lot-svc.js
git commit -m "Add finishScanning to the client API and Lot model"
```

---

### Task 8: "Finish Scanning" button on the scan page

**Files:**
- Modify: `client-legacy/src/js/ng/controllers/scan-ctrl.js:60-90` (registration), add new `finishScanning` controller function
- Modify: `client-legacy/src/partials/_scan.html:119-122`

**Interfaces:**
- Consumes: `vm.lot.finishScanning()` (Task 7), `vm.lot.composeInventoryErrorsHtmlMessage()` / `vm.validateInventory()` (existing, already used by `saveManifest()` in this same file).
- Produces: a "Finish Scanning" button on the scan page, shown only when `vm.lot.status === 'In Preparation' && !vm.lot.pallet && !vm.lot.unmanifested`; on success, navigates to the Lot detail page (same pattern as `saveManifestAndExit`).

- [x] **Step 1: Add `finishScanning` and `canFinishScanning` to `scan-ctrl.js`**

In `client-legacy/src/js/ng/controllers/scan-ctrl.js`, add `finishScanning` and `canFinishScanning` to the `Object.assign(vm, {...})` block (after `saveManifestAndExit,` around line 64):

```js
          scanBarcode,
          deleteInventoryItem,
          saveManifestAndContinue,
          saveManifestAndExit,
          finishScanning,
          canFinishScanning,
          editShippingItemsModal,
```

Then add the two new functions, after `saveManifestAndExit` (after the closing brace of the existing `function saveManifestAndExit() { ... }`, around line 207):

```js
    function canFinishScanning() {
      return vm.lot && vm.lot.status === 'In Preparation' && !vm.lot.pallet && !vm.lot.unmanifested;
    }

    async function finishScanning() {

      if( !validateInventory( __INVENTORY_VALIDATION_OPTIONS__ )) {

        const isConfirmed = await ModalSvc.confirm( {
          header: 'Invalid data',
          html: `<p>The data for this manifest is invalid with these errors:</p> ${ vm.lot.composeInventoryErrorsHtmlMessage() }`,
          type: 'error',
          trueText: 'Finish anyway',
          falseText: 'Cancel'
        } );

        if( !isConfirmed ) {
          return;
        }

      }

      const lot = await ModalSvc.wait({
        waitFor: vm.lot.finishScanning(),
        message: 'Locking Lot and starting AI backfill...',
      });

      vm.lot.status = lot.status;

      await ModalSvc.message( {
        header: 'Scanning finished',
        html: '<p>This Lot is now locked while AI backfill fills in missing product data.</p>',
        buttonText: 'Continue',
      });

      navigate.viewLot( vm.lot._id );

    }
```

- [x] **Step 2: Add the button**

In `client-legacy/src/partials/_scan.html`, change (lines 119-122):

```html
          <div>
            <a class="btn btn-success" ng-click="$ctrl.saveManifestAndContinue()" ng-disabled="!$ctrl.isManifestChanged()">Save</a>
            <a class="btn btn-success" ng-click="$ctrl.saveManifestAndExit()">Save & finish</a>
          </div>
```

to:

```html
          <div>
            <a class="btn btn-success" ng-click="$ctrl.saveManifestAndContinue()" ng-disabled="!$ctrl.isManifestChanged()">Save</a>
            <a class="btn btn-success" ng-click="$ctrl.saveManifestAndExit()">Save & finish</a>
            <a class="btn btn-primary" ng-click="$ctrl.finishScanning()" ng-show="$ctrl.canFinishScanning()">Finish Scanning</a>
          </div>
```

- [x] **Step 3: Syntax + lint check**

```bash
npx eslint --config .eslintrc.client.js client-legacy/src/js/ng/controllers/scan-ctrl.js
```

Expected: no eslint errors.

- [x] **Step 4: Manual code review checklist**

Confirm by eye:
- `canFinishScanning()` matches the spec's exact gating condition: `status === 'In Preparation' && !lot.pallet && !lot.unmanifested`.
- The button is `ng-show` (hidden via CSS, not `ng-if`), consistent with how other conditional buttons in this file's partials behave elsewhere in this repo — confirm this doesn't matter functionally here since `canFinishScanning()` is only ever read on click, not relied upon to prevent a DOM node from existing.
- On success, `vm.lot.status` is updated locally before navigating away, so if navigation is ever slow/delayed the UI wouldn't show a stale `'In Preparation'` status.

- [x] **Step 5: Commit**

```bash
git add client-legacy/src/js/ng/controllers/scan-ctrl.js client-legacy/src/partials/_scan.html
git commit -m "Add Finish Scanning button to the scan page"
```

---

### Task 9: "Finish Scanning" gated action on the Lot detail page

**Files:**
- Modify: `client-legacy/src/js/ng/controllers/view-lot-ctrl.js:19-94` (registration + injected `navigate`, already injected), add new controller functions after `verifyListingAndNavigateToSubmission` (after line 242)
- Modify: `client-legacy/src/partials/_view_lot.html:67-69`

**Interfaces:**
- Consumes: `vm.lot.finishScanning()` (Task 7, same shared `Lot` method used by the scan page).
- Produces: a "Finish Scanning" button on the Lot detail page, gated the same way as Task 8's scan-page button, calling the same underlying `Lot.finishScanning()`. On success, reloads the page (`navigate.reload()`, the pattern this controller already uses after other lot-mutating actions like `linkManifestBlock`/`editShippingItemsCb`).

- [x] **Step 1: Register the new functions**

In `client-legacy/src/js/ng/controllers/view-lot-ctrl.js`, add `finishScanning` and `canFinishScanning` to the `Object.assign(vm, {...})` block (after `scanItems,` around line 69):

```js
          verifyListingAndNavigateToSubmission,
          scanItems,
          finishScanning,
          canFinishScanning,
          reviewManifest,
```

Then add the two functions, immediately after the closing brace of `verifyListingAndNavigateToSubmission` (after line 242):

```js
    function canFinishScanning() {
      return vm.lot && vm.lot.status === 'In Preparation' && !vm.lot.pallet && !vm.lot.unmanifested;
    }

    async function finishScanning() {

      const isConfirmed = await ModalSvc.confirm( {
        header: 'Finish Scanning',
        body: 'This will lock the Lot and start AI backfill for any missing product data. Continue?',
      } );

      if( !isConfirmed ) {
        return;
      }

      await ModalSvc.wait( {
        waitFor: vm.lot.finishScanning(),
        message: 'Locking Lot and starting AI backfill...',
      } );

      navigate.reload();

    }
```

- [x] **Step 2: Add the button**

In `client-legacy/src/partials/_view_lot.html`, change (lines 67-69):

```html
            <button class="btn btn-success" ng-click="$ctrl.reviewManifest()">Review Manifest</button>
            <button class="btn btn-success" ng-click="$ctrl.verifyListingAndNavigateToSubmission()">Create a Listing</button>
            <button class="btn btn-success" ng-click="$ctrl.lot.printShippingItemsLabels()">Print Labels</button>
```

to:

```html
            <button class="btn btn-success" ng-click="$ctrl.reviewManifest()">Review Manifest</button>
            <button class="btn btn-primary" ng-click="$ctrl.finishScanning()" ng-show="$ctrl.canFinishScanning()">Finish Scanning</button>
            <button class="btn btn-success" ng-click="$ctrl.verifyListingAndNavigateToSubmission()">Create a Listing</button>
            <button class="btn btn-success" ng-click="$ctrl.lot.printShippingItemsLabels()">Print Labels</button>
```

- [x] **Step 3: Syntax + lint check**

```bash
npx eslint --config .eslintrc.client.js client-legacy/src/js/ng/controllers/view-lot-ctrl.js
```

Expected: no eslint errors.

- [x] **Step 4: Manual code review checklist**

Confirm by eye:
- `canFinishScanning()` in `view-lot-ctrl.js` is defined identically to Task 8's `canFinishScanning()` in `scan-ctrl.js` (same three conditions) — both are small enough, and live in different controllers, that a shared helper isn't worth the indirection (matches the spec's "one shared implementation" requirement, which refers to the underlying `Lot.finishScanning()` call, not the gating check).
- `ModalSvc.confirm({ header, body })` matches the exact call shape already used by `deleteLot()` a few dozen lines below in this same file.

- [x] **Step 5: Commit**

```bash
git add client-legacy/src/js/ng/controllers/view-lot-ctrl.js client-legacy/src/partials/_view_lot.html
git commit -m "Add Finish Scanning gated action to the Lot detail page"
```

---

### Task 10: Stuck-lot recovery — exclude `'Pending Data'` from the manual status dropdown

**Files:**
- Modify: `client-legacy/src/js/ng/controllers/edit-lot-modal-ctrl.js:37`

**Interfaces:**
- Produces: `vm.lotStatusEnum` in the edit-lot modal excludes `'Pending Data'` as a selectable target from any other status, but still includes it (so the `<select>` has a valid current value) when the Lot's current `status` already is `'Pending Data'` — this is the manual recovery path for a Lot stuck locked.

- [x] **Step 1: Filter `lotStatusEnum`**

In `client-legacy/src/js/ng/controllers/edit-lot-modal-ctrl.js`, change line 37:

```js
          lotStatusEnum: dbEnums.lotStatus,
```

to:

```js
          lotStatusEnum: dbEnums.lotStatus.filter( status => status !== 'Pending Data' || lot.status === 'Pending Data' ),
```

(`lot` here is the constructor-injected raw lot data, already in scope — see the `function( CounterSvc, dbEnums, LoggedInUser, lot, LotSvc, ModalSvc, ShippingItemsSvc )` parameter list this file already has.)

- [x] **Step 2: Syntax + lint check**

```bash
npx eslint --config .eslintrc.client.js client-legacy/src/js/ng/controllers/edit-lot-modal-ctrl.js
```

Expected: no eslint errors.

- [x] **Step 3: Manual verification — filter logic**

```js
function filterStatuses( allStatuses, currentStatus ) {
  return allStatuses.filter( status => status !== 'Pending Data' || currentStatus === 'Pending Data' );
}

const allStatuses = [ 'In Preparation', 'Pending Data', 'Ready', 'Reviewed', 'Listed', 'Sold', 'Shipped', 'Error', 'Decommissioned' ];

const whenNotLocked = filterStatuses( allStatuses, 'In Preparation' );
if( whenNotLocked.includes( 'Pending Data' ) ) throw new Error('Pending Data should not be selectable when lot is not currently Pending Data');
if( whenNotLocked.length !== allStatuses.length - 1 ) throw new Error('expected exactly one status filtered out');

const whenLocked = filterStatuses( allStatuses, 'Pending Data' );
if( !whenLocked.includes( 'Pending Data' ) ) throw new Error('Pending Data must remain selectable (as the current value) when lot is currently Pending Data');
if( whenLocked.length !== allStatuses.length ) throw new Error('expected no statuses filtered out when lot is currently Pending Data');

console.log('OK: lotStatusEnum filter behaves as expected');
```

Expected output: `OK: lotStatusEnum filter behaves as expected`

- [x] **Step 4: Commit**

```bash
git add client-legacy/src/js/ng/controllers/edit-lot-modal-ctrl.js
git commit -m "Exclude Pending Data from the manual status dropdown except as current value"
```

---

### Task 11: Migration script — backfill `internal-product-data.source`

**Files:**
- Create: `__scripts/migrate-db-backfill-product-data-source.js`

**Interfaces:**
- Produces: a one-off, hand-run script (not wired into `npm`/CI) that sets `source: 'manual'` on every `internal-product-data` document missing a `source` field. Idempotent (filtered by `{ source: { $exists: false } }`), out of scope for `Manifest.inventory[]` subdocuments per the spec.

- [x] **Step 1: Write the migration script**

Create `__scripts/migrate-db-backfill-product-data-source.js`:

```js
const config = require('../server/config');

const mongoSettings = config.dbHosts.mongo;

const mongoose = require('mongoose');

class DbClient {

  constructor(){}

  async init() {

    this.mongoClient = await (async ( { host, port, dbName, user, password } ) => {

      const location = `${host}:${ port || 27017 }/${dbName}`;

      const MongoClient = mongoose.mongo.MongoClient;
      const client = new MongoClient(
        `mongodb://${ user && password ? `${user}:${password}@` : ''}${location}`,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      );

      console.log(`Connecting to MongoDb at ${location}`);
      await client.connect();

      return client;

    })({
      host: mongoSettings.host,
      port: mongoSettings.port,
      dbName: mongoSettings.db,
      user: mongoSettings.auth && mongoSettings.auth.user,
      password: mongoSettings.auth && mongoSettings.auth.pwd,
    });

    this.db = this.mongoClient.db( mongoSettings.db );

  }

  close() {
    this.mongoClient.close();
  }

  backfillProductDataSource() {

    return this.db.collection('internal-product-data').updateMany(
      { source: { $exists: false } },
      { $set: { source: 'manual' } }
    );

  }

}


const run = async ( client ) => {

  await client.init();

  return client.backfillProductDataSource();

};


const client = new DbClient();

run( client )
  .then( resp => resp && console.log(JSON.stringify( { matchedCount: resp.matchedCount, modifiedCount: resp.modifiedCount }, null, 2 )) )
  .catch( console.error )
  .finally( () => {
    console.log('Closing mongo connection...');
    client.close();
  });
```

Note: this follows the connection/class structure of the existing `__scripts/migrate-db-*.js` files exactly, with one deliberate deviation — `.catch( console.error )` instead of the `.catch( console.err )` typo present in several of the pre-existing scripts (`console.err` doesn't exist; it would throw `TypeError: console.err is not a function` if the `run(...)` promise ever actually rejected). Don't propagate that typo into new code.

- [x] **Step 2: Syntax + lint check**

```bash
node -c __scripts/migrate-db-backfill-product-data-source.js
npx eslint --config .eslintrc.server.js __scripts/migrate-db-backfill-product-data-source.js
```

Expected: no output from `node -c`. eslint may warn about `no-unused-vars` for nothing in this file (there shouldn't be any) — if it reports anything else, fix it; don't suppress.

- [x] **Step 3: Manual code review checklist**

Confirm by eye (this script is never actually run against a real database as part of this plan — running it per-environment, by hand, sandbox then production, is an explicit deferred operational step per the spec, not part of implementation):
- The filter `{ source: { $exists: false } }` and update `{ $set: { source: 'manual' } }` exactly match the spec's Task 7 (`docs/superpowers/archive/specs/2026-08-17-ai-backfill-integration-design.md`) code block.
- The collection name is `'internal-product-data'`, matching `server/src/models/index.js`'s `mongooseConnection.model('InternalProductData', productData.schema, "internal-product-data")` (the third argument is the explicit collection name).
- No `Manifest`/`manifests` collection is touched — scope is `internal-product-data` only, per the spec.

- [x] **Step 4: Commit**

```bash
git add __scripts/migrate-db-backfill-product-data-source.js
git commit -m "Add one-off migration to backfill internal-product-data.source"
```

---

## Post-plan notes (not implementation tasks)

- This plan does not run the Task 11 migration script against any real database — per the spec, that's a manual, per-environment, sandbox-then-production operation to run after this code is deployed.
- Full end-to-end testing (a real scan creating a real `fetch/` marker, a real "Finish Scanning" click starting a real state machine execution) requires the `ai-product-data-backfill` jobs bucket and aggregate state machine to actually exist (Terraform not yet applied there) and the corresponding IAM grants in `lot-commander-ecs-deploy` (spec written, not yet implemented). Neither is in scope for this plan.
- After all 11 tasks are committed, use this repo's normal PR process to get this branch (`ai-backfill-integration`) reviewed and merged to `dev`.
