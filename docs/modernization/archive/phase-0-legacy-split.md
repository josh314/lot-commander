# Phase 0 — Stabilize the legacy/new split

*(done, committed)* — back to [Frontend Modernization Plan](../PLAN.md)

## Actual `client-legacy/` structure

The move didn't just rename `client/` to `client-legacy/` — the build
tooling moved *into* `client-legacy/` too, and the old client source now
lives one level deeper, under `src/`:

```
client-legacy/
  .eslintrc.angularjs.js   (was root .eslintrc.angularjs.js)
  .eslintrc.client.js      (was root .eslintrc.client.js)
  webpack.common.js        (was root webpack.common.js)
  webpack.dev.js           (was root webpack.dev.js)
  webpack.prod.js          (was root webpack.prod.js)
  dist/                    (build output, gitignored)
  src/                     (was root client/ — index.js, js/, less/, partials/, etc.)
```

Root `webpack.*.js` and root `.eslintrc.{client,angularjs}.js` no longer
exist — everything client-build-related is self-contained under
`client-legacy/`. Root `package.json` scripts now point in:

```json
"build-client-dev-legacy": "webpack --config client-legacy/webpack.dev.js",
"build-client-legacy": "webpack --mode production --config client-legacy/webpack.prod.js",
"dev-server-legacy": "webpack-dev-server --config client-legacy/webpack.dev.js",
```

Every path below that used to say `client-legacy/js/...` or
`client-legacy/partials/...` in earlier drafts of this plan means
`client-legacy/src/js/...` / `client-legacy/src/partials/...` — fixed
throughout this revision.

(Note: since Phase 1, the root `package.json` scripts above delegate into
the `client-legacy` workspace instead of pointing at `client-legacy/*`
paths directly — see [phase-1-workspace-setup.md](./phase-1-workspace-setup.md).
This section is preserved as-is because the on-disk structure it
describes hasn't changed, only how the root scripts reach it.)

## Checklist

The move to the structure above is already done and already verified to
build. One stale path is left inside it, and none of it is committed yet.

- [x] `client/` → `client-legacy/src/`, plus the webpack configs and eslint
      configs relocated into `client-legacy/` — done on disk.
- [x] `client-legacy/webpack.common.js`'s `clientSrcPath` already correctly
      reads `path.join(__dirname, "src")` — no fix needed, this one was
      updated as part of the move.
- [x] `npm run build-client-legacy` verified: completes clean (only the
      usual webpack bundle-size warnings, no errors) and correctly emits
      `partials/`, `assets/`, `app.js`, `app.css`, and the copied favicon
      into `client-legacy/dist/`.
- [x] Fix the one path that's still stale: `client-legacy/webpack.common.js`'s
      active `ESLintPlugin` `context` option still reads
      `path.join(__dirname, 'client/js/')` (~line 83) — `client-legacy/client/`
      doesn't exist, so this silently lints **zero files** instead of erroring
      (ESLintPlugin treats "no matching files" as a no-op, not a failure,
      which is why the build above is clean). Change it to
      `path.join(__dirname, 'src/js/')`. There's also a *commented-out*
      second `ESLintPlugin` block a few lines above with the same stale
      `'client/js/'` path — fix it too while you're in there even though
      it's inactive, so it isn't a trap if someone re-enables it.
- [x] Re-run `npm run build-client-legacy` after the fix and confirm actual
      lint errors/warnings now surface (if the AngularJS source has any —
      if the build is still silent, double check the path change took by
      temporarily introducing an obvious lint violation).
- [x] Run `npm run dev-server-legacy`, hit `http://localhost:9000`, confirm
      the legacy app still logs in and navigates (needs `npm run demon`
      running separately on the port `server/config.local.json` specifies,
      since `client-legacy/webpack.dev.js`'s devServer proxies `/` there).
- [x] `Dockerfile` line 14 (`RUN npm run build-client`) still references the
      pre-rename script name and will fail as-is. Since deployment is
      explicitly back-burnered for this exercise, leave this as a decision
      for later rather than fixing now: once the new client has its own
      build step, `Dockerfile` needs to decide whether it ships legacy, new,
      or both. Don't fix it in Phase 0 — note it and move on.
- [x] Stage and commit the whole reorg as one commit: `git add -A` (or the
      more targeted `git add client-legacy/ package.json` plus whatever the
      ESLintPlugin fix above touches) — `git status --short` currently shows
      the move already staged as renames (`R`/`RM`), just `package.json`
      still unstaged and this plan doc still untracked. Suggested message:
      "Move legacy AngularJS client + build tooling into client-legacy/, fix
      stale ESLintPlugin context path".
