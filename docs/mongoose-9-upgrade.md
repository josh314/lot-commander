# Mongoose 8 → 9 upgrade

`server/package.json` has been bumped to `^9.11.4`. Notes below are from
an audit of this codebase against Mongoose 9's breaking changes, not a
general migration guide — see the official one linked at the bottom for
anything not specific to this repo.

## Status

Bumping `server/package.json`'s `mongoose` to `^9.11.4` surfaced a startup
crash — see "Runtime crash" below. Resolved via option 3 there:
`@wazue/upc-item-db` is now on `^5.0.0`, which depends on `mongoose: ^9`
and dedupes cleanly to the same `mongoose@9.11.4` as the rest of the repo
(confirmed via `npm ls mongoose` — single resolved copy, no nested v8).

## Runtime crash: `@wazue/upc-item-db` (confirmed, resolved)

Starting the app after the bump crashes on startup, right after the
"Using existing connection for upcitemdb-cache." log line:

```
/node_modules/kareem/index.js:51
      callback(null);
      ^
TypeError: callback is not a function
```

Root cause is a version-crossed Schema/Connection handoff, not simply
"the package still depends on mongoose 8" in the abstract (two mongoose
majors coexisting in a tree is normally fine and isolated):

- `server/src/*` resolves `require('mongoose')` to the nested
  `server/node_modules/mongoose@9.11.4` (depends on `kareem@3.4.1`). This
  is what builds `global.__mongooseConnection` in `server.js`.
- `@wazue/upc-item-db`'s `cache.js` resolves `require('mongoose')` to the
  root-hoisted `node_modules/mongoose@8.24.7` (depends on `kareem@2.6.3`)
  — npm's workspace hoisting put the 8.x copy at the repo root to satisfy
  the package's own `mongoose: ^8.3.4` dependency, while server's `^9.x`
  requirement got a nested copy instead.
- `server/src/modules/upc-item-db.js` passes the shared v9 connection into
  `new UpcItemDb({ connection, ... })`. Inside `cache.js`, `cacheSchema` is
  built with the **v8** `Schema` constructor, but `this.connection.model(
  'Cache', cacheSchema, ... )` runs the `.model()` compile step on the
  **v9** `Connection`.
- Mongoose 9's model compiler wires hooks assuming kareem 3.x's calling
  convention; the schema's hook queue was recorded by kareem 2.x (attached
  by the v8 `Schema`). The two kareem majors pass hook callbacks
  differently — that mismatch is the `callback is not a function` at
  `kareem/index.js:51`, firing when the `Cache` model gets compiled at
  startup.

So the trigger isn't "a dependency uses mongoose 8" — it's specifically
handing a v8-built `Schema` to a v9 `Connection.model()` call, which only
breaks because the *connection* (not just the schema) is shared across the
major-version boundary. Any other dependency that accepts an injected
connection and builds its own schema internally is exposed to the same
failure mode.

### Options

1. **Force single resolution via npm `overrides`** — add
   `"overrides": { "mongoose": "9.11.4" }` to the root `package.json` so
   `@wazue/upc-item-db` also resolves v9. `cache.js` only touches baseline
   API (`Schema`, `Schema.Types.Mixed`, `connection.model()`,
   `findOneAndUpdate` with `upsert`/`new`) — nothing in the v9 migration
   notes breaks that surface, so this would likely work with zero package
   changes. Lowest effort; try first.
2. **Stop sharing the connection** — pass `host`/`port`/`db` instead of
   `connection` in `server/src/modules/upc-item-db.js`, so the package
   opens its own independent v8 connection and never crosses the version
   boundary. Costs a 5th separate Mongo connection pool (see Runtime &
   Networking notes in root `CLAUDE.md` on existing per-module connection
   sprawl) but is fully isolated.
3. **Bump `@wazue/upc-item-db`'s own `mongoose` dependency to `^9`** and
   republish to the internal `@wazue` registry — correct long-term fix
   since it's an internally-maintained package, but is its own separate
   piece of work.
4. **Hold the main app on mongoose 8** until option 3 happens.

## Confirmed breaking changes that touch this code

**Pre-hook `next` callbacks become dead parameters.** In v9, `next()` is a
silent no-op; a hook only advances once its function returns (or its
returned promise resolves). All pre-hooks in this repo are plain
synchronous functions that mutate `this` and then call `next()` with no
deferred/async work in between, so they should keep behaving correctly as
written. The `next` param is just vestigial going forward — worth dropping
it while touching these files so a future accidental
`setTimeout(() => next())`-style change doesn't silently break:

- `server/src/models/lot.js:98,105` (`validate`, `save`)
- `server/src/models/package.js:34` (`save`)
- `server/src/models/announcement.js:16` (`save`)
- `server/src/models/incoming-shipment.js:85` (`save`)
- `server/src/models/inventory-pallet.js:103,113` (`validate`, `save`)
- `server/src/models/bundle.js:27` (`save`)
- `server/src/modules/manual-inventory-db.js:88` (`save`)

**MongoDB Node driver bump to v7** (transitive, via mongoose). No raw
driver API usage found in `server/src` that this would affect — no
`useNewUrlParser`/`useUnifiedTopology`/other legacy connect options.
`server.js`'s `connect()` only passes `retryWrites`/`w`, which is clean
against v7.

## Checked and ruled out

- `connect-mongodb-session@5.0.0` (session store, used in `app-session.js`)
  pins its own `mongodb: '5.x || 6.x'` dependency, independent of
  mongoose's bundled driver. It won't follow mongoose to driver v7, but it
  manages a fully separate `MongoClient` connection, so this isn't a
  conflict — just something to know if it ever visibly lags behind.
- No `passport-local-mongoose` / `mongoose-unique-validator` in
  `server/package.json` — the plugin pre-save-hook risk the official
  migration guide warns about doesn't apply here.
- No callback-style `.exec(fn)`, `document.updateOne(filter, update, callback)`,
  or `isAsync` middleware anywhere in `server/src`.
- `Schema.Types.UUID` isn't used, so the BSON UUID return-type change
  doesn't apply.

## Worth a second look, but pre-existing (not v9-specific)

- `server/src/modules/inventory-commander.js:22,50`
  (`hasProblemShipmentFilter`/`noProblemShipmentFilter`) builds live query
  filters using `$where: function(){...}` — server-side JS evaluation.
  Confirmed still works under the now-installed `mongoose@9.11.4`
  (`mongodb@7.7.0`, `bson@7.3.3`): mongoose's `lib/cast.js:94-98` converts
  the function to a string via `.toString()` at query-cast time, before
  the filter ever reaches the driver — unchanged between mongoose 8 and
  9. This also means the driver's `serializeFunctions` BSON option (default
  `false`; raw `Function` values are silently dropped, no error, unless
  explicitly set `true`) never comes into play here, since mongoose never
  hands the driver a raw function.

  Separately, server-side JS support itself had real churn recently:
  MongoDB 8.0 deprecated `$where`/`$function`/`$accumulator`, then
  **MongoDB 9.0 un-deprecated them**, re-enabling via a new WASM-sandboxed
  JS engine. There's also a live CVE in exactly this area —
  **CVE-2026-11933**, a use-after-free in the server's JS-to-BSON
  conversion reachable via `$where`/`$function`, affecting every release
  line 4.4–8.3 (fixed in 4.4.31/5.0.34/6.0.29/7.0.37/8.0.26/8.2.11/8.3.4).
  That's a MongoDB **server** patch-level concern, independent of this
  repo's driver/mongoose version — worth confirming the server version in
  use is patched, or disabling server-side JS (`security.javascriptEnabled:
  false`) if `$where` usage here can be replaced with `$expr`.

  Not a blocker for this upgrade either way, but worth revisiting if this
  file is already being touched.
- `server/src/modules/events-db.js` uses schema discriminators
  (`discriminatorKey: 'type'`) across ~17 event schemas. Mongoose's GitHub
  issue tracker shows discriminator-handling bugs fixed as late as
  `9.11.4` — pin to a recent `9.x` patch rather than bare `9.0.0`, and
  smoke-test event creation/discriminator queries specifically after
  upgrading.

## Recommendation

No automated test suite exists in this repo (see root `CLAUDE.md`), so the
practical verification step is manual: bump to a recent `9.x` patch, then
exercise save paths for the 7 models with pre-hooks above plus one
discriminator event write/read in `events-db.js`, since those are the two
areas with real, codebase-specific exposure. `node -c` across
`server/src/models/*.js` only catches syntax errors, not behavioral
regressions here.

## Sources

- [Migrating to Mongoose 9](https://mongoosejs.com/docs/migrating_to_9.html)
- [Mongoose 9 Migration Guide: What Actually Breaks in a Real MERN App](https://dev.to/dev_encyclopedia/mongoose-9-migration-guide-what-actually-breaks-in-a-real-mern-app-4p18)
- [The docs site does not list all breaking changes in v9 · Issue #15813](https://github.com/Automattic/mongoose/issues/15813)
- [Automattic/mongoose Releases](https://github.com/Automattic/mongoose/releases)
