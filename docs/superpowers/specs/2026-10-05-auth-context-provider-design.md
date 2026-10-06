# AuthContext / AuthProvider Redesign

## Status

Sketch only — not approved, not scheduled. Recorded as a follow-up from a session that was building out `ListLots` filter tests and, in the course of planning an `App.test.tsx` context-override seam, concluded the current `AuthContext`/`App` wiring is a reasonable early-phase scaffold but not idiomatic. Pick this up as its own focused pass later; nothing here should block other client work.

## Current State

- `client/src/contexts/AuthContext.tsx`: `export const AuthContext = createContext<User | undefined>(getLoggedInUser())`. The *default value* passed to `createContext` is the real session, read from `document.cookie` once, as a side effect of module import (not render/mount time).
- `client/src/App.tsx`: `App` reads `useContext(AuthContext)`, runs a `useEffect` that hard-navigates to `/login` (`window.location.href = '/login'`) when there's no user, then immediately re-provides the same value it just read via its own `<AuthContext value={user}>` wrapping its children.
- `AppShell.tsx` and `Sidebar.tsx` each call `useContext(AuthContext)` directly (no shared hook), reading the value `App` re-provided.
- `lib/auth.ts`'s `User` class and `getLoggedInUser()` (cookie parsing) are unaffected by anything below — out of scope.

## Problems

1. **Default-value-as-state.** `createContext(default)` is conventionally a fallback for "no ancestor provider," not a vehicle for real app state. Baking `getLoggedInUser()` into it means the session is captured once at import time, with no way to recompute it without a full page reload — this is the root of the already-documented gap in root `CLAUDE.md` ("a session going stale mid-tab-lifetime isn't detected until something forces a full page reload").
2. **No `AuthProvider` component.** The context is defined and consumed directly (`useContext(AuthContext)`) in three different files, with no component owning the state or exposing a way to mutate it (no setter, no `refreshUser`, no `logout`).
3. **No `useAuth()` hook.** Consumers call `useContext(AuthContext)` raw; no invariant/clearer error if ever rendered outside a provider.
4. **`App`'s read-then-reprovide is redundant in production.** Nothing transforms between the read and the re-provide, so in the real app (no provider above `App`) the inner `<AuthContext value={user}>` wrapper does nothing a descendant couldn't get from the module default directly. Its only real effect is incidentally giving tests a wrap-`<App/>`-from-outside override seam — useful, but not a deliberate design.

Not a problem, despite looking unusual: the hard `window.location.href = '/login'` redirect. `/login` is deliberately server-rendered outside the React Router tree (root `CLAUDE.md`), so a client-side `<Navigate>` has no route to target — a real navigation is the only option. Keep as-is.

## Proposed Design

- Add an `AuthProvider` component (reshape `contexts/AuthContext.tsx` or a new `contexts/AuthProvider.tsx`) that owns `user` via `useState<User | undefined>(() => getLoggedInUser())` — a lazy initializer, so the cookie read happens at mount time, not module-import time.
- Provider exposes at least a `refreshUser()` (re-reads the cookie and calls `setUser`) through context, giving the eventual axios-interceptor fix (already noted as a TODO in the `client/` section of `CLAUDE.md`) something concrete to call instead of forcing a reload.
- Add `useAuth()` wrapping `useContext(AuthContext)`, asserting it's used within `AuthProvider`. Replace the three direct `useContext(AuthContext)` call sites (`App`, `AppShell`, `Sidebar`) with it.
- Move the provider to `main.tsx`, wrapping `<App/>` from outside, instead of `App.tsx` reading and re-providing itself. Removes the redundant self-wrap and makes the test-override seam intentional (wrap children of `AuthProvider`, or swap in a test-only provider) rather than an accident of current structure.

## Non-goals

- Not wiring the axios response interceptor to actually call `refreshUser()` end-to-end — this sketch only adds the setter the interceptor fix would eventually use.
- Not changing the `/login`/`/logout` hard-navigation mechanism — confirmed justified above.
- Not touching `lib/auth.ts`'s `User` class or cookie-parsing logic.

## Open Questions

- Does the context value stay `User | undefined`, or widen to `{ user, refreshUser }`? Widening touches every existing consumer, not just the three current call sites.
- Should the no-user `/login` redirect effect move into `AuthProvider` (next to the state that triggers it) or stay in `App`? **Leaning toward moving it**, for a concrete testability reason (see below), not just tidiness.
- Is a `logout()` helper worth adding now, or deferred until real login/logout flow work happens?

## Testability note (from the App.test.tsx attempt)

Trying to write a "redirects to `/login` when logged out" test for `App.tsx` as it stands today surfaces two distinct jsdom frictions, worth separating because they have different fates under this rework:

1. **jsdom blocks real navigation** (`window.location.href = ...` logs "Not implemented: navigation to another Document" and no-ops). This is permanent and unrelated to AuthContext — it's inherent to testing *any* component that performs a real hard navigation, and this design keeps that mechanism as-is (see Non-goals). Any test exercising this effect will always need some `window.location` stub for `href`, regardless of where the effect lives.
2. **Needing to stub the *entire* `window.location`** (`pathname`/`search`/`hash`/`origin`, not just `href`) is *not* inherent — it's because `App` bundles the redirect check together with mounting `QueryClientProvider`/`RouterProvider` in the same component, so testing the redirect forces the real router tree to mount too, and react-router's own route-matching needs those fields.

If the redirect effect moves into `AuthProvider`, and `AuthProvider` is tested by rendering `<AuthProvider><div/></AuthProvider>` directly rather than through real `<App/>` with real `routes`, friction #2 disappears entirely — no router in the tree means no need to fake `pathname`/`search`/`hash`/`origin`. Friction #1 remains either way (stubbing `href` is unavoidable), but it's a one-line concern instead of a whole-Location-object one. This is the concrete argument for resolving the "where does the redirect effect live" question in favor of `AuthProvider`.

`App.test.tsx`'s logged-out/logged-in cases are tabled pending this rework, not abandoned — see memory.
