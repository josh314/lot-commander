# Route-Level `PageStack` Enforcement via a Branded `Page` Type

## Status

Proposed, not yet implemented. Per standing project preference, the user implements all code personally — this document (and any implementation plan written from it) is guidance only. Builds on `PageStack` from `docs/superpowers/specs/2026-10-08-client-design-system-foundation-design.md` — that component must exist (or be implemented alongside this change) for the factory below to have something to wrap with.

## Context / Current State

- `client/src/lib/route-config.tsx`'s `RouteConfigNode` interface has an optional `Component?: ComponentType` field. `toRouteObjects()` turns a `RouteConfigNode[]` tree into React Router's `RouteObject[]`, rendering `<Component />` directly — wrapped in `<RequirePermission>` when the node has a `permission`, otherwise bare. A guard throws at build time if a node has none of `Component`/`index`/`children` and isn't flagged `nav.isAnchorTag`.
- Four current call sites construct `RouteConfigNode`s with a bare `Component`: `client/src/routes/index.ts` (`AppShell` as the root layout node, `HomePage` as the index route), `client/src/features/lots/routes.ts` (`ListLots`, `LotDetails`), `client/src/features/style-guide/routes.ts` (`StyleGuide`).
- Nothing today wraps a screen's rendered output in a shared layout component — each screen's root JSX renders directly inside `AppShell`'s `<Outlet/>`.
- The design-system-foundation spec introduces `PageStack`, meant to wrap each screen's top-level sibling sections (`PageHeader`/`Panel`/`Table`/etc.) in consistent `space-y-6` spacing. As designed there, it relies on every screen author remembering to wrap their own JSX in `<PageStack>` — nothing enforces it, and a forgotten wrap fails silently (the screen just renders without the spacing, no error).

## Goals

Make "forgot to wrap a screen in `PageStack`" a compile-time impossibility, without losing a screen's ability to deliberately opt out (full-bleed layouts, modals, the style guide itself) when that's the right call — and make that opt-out visible in a code review, not a flag that's easy to leave at its default.

## Non-Goals

- Changing `PageStack`'s own implementation (its `space-y-6` wrapping is unaffected by this change — this spec only changes *how screens get wrapped by it*).
- Changing `RequirePermission`'s behavior or its position in the wrapping order.
- A partial migration — there are only 4 routes today, small enough to update all of them in this same pass rather than leave the codebase with two competing patterns (`Component` and `page`) side by side.

## Design

### Why a boolean flag or a comment convention doesn't solve this

A flag like `node.noPageStack?: boolean` (defaulting to "wrapped") still allows forgetting — it just moves the mistake to the opposite case (forgetting to *set* the flag when you didn't want the wrap). A code-review convention or a comment reminder is enforcement by discipline, which is exactly the gap this design is meant to close.

### The fix: a branded `Page` type, producible only via exported factories

Replace `RouteConfigNode.Component?: ComponentType` with `RouteConfigNode.page?: Page`, where `Page` is a type carrying a brand that nothing outside `route-config.tsx` can satisfy *by accident* — producing one without going through the exported factories requires an explicit, visible type assertion, not a plain object literal.

There are two ways to implement the brand. They're functionally identical from every other file's perspective (same `Page` type, same `page()`/`rawPage()` call sites); the choice only affects what, if anything, exists at runtime inside `route-config.tsx`. Pick one during implementation.

**Option A — type-only brand, no runtime value**

```ts
// route-config.tsx
declare const pageBrand: unique symbol   // type-only; erased, no runtime binding

export interface Page {
  readonly [pageBrand]: true
  Component: ComponentType
}

export function page(Component: ComponentType): Page {
  function Wrapped() {
    return <PageStack><Component /></PageStack>
  }
  return { Component: Wrapped } as Page
}

export function rawPage(Component: ComponentType): Page {
  return { Component } as Page   // deliberately skips PageStack
}
```

`declare const` erases entirely at compile time — no `pageBrand` binding exists in the emitted JS, so the returned objects must *not* actually try to set a `[pageBrand]` key (there's nothing to set it to; doing so would throw `ReferenceError` at runtime). The `as Page` cast is what makes this compile: TS permits it because `Page` is assignable to `{ Component: ComponentType }` (a `Page` has everything that shape needs, plus the brand), and `as` only requires assignability in *one* direction — so asserting a `{ Component }` value *up* to `Page` type-checks even though a plain `const x: Page = { Component }` assignment would not (TS would report the brand property as missing). The brand costs nothing at runtime; it's a pure compile-time fiction that nothing ever reads back.

**Option B — real runtime symbol**

```ts
// route-config.tsx
const pageBrand = Symbol('page')   // real value, module-private (not exported)

export interface Page {
  readonly [pageBrand]: true
  Component: ComponentType
}

export function page(Component: ComponentType): Page {
  function Wrapped() {
    return <PageStack><Component /></PageStack>
  }
  return { [pageBrand]: true, Component: Wrapped }
}

export function rawPage(Component: ComponentType): Page {
  return { [pageBrand]: true, Component }   // deliberately skips PageStack
}
```

Here `pageBrand` is a real `Symbol()` value scoped to the module (declared with `const`, never exported), so the factories can actually set `[pageBrand]: true` on the returned object without a cast — the object genuinely has the property, satisfying `Page` through ordinary assignability, no `as` needed inside `route-config.tsx` itself. The only reason to prefer this over Option A is wanting an actual runtime check later (e.g. `pageBrand in candidate`, to assert "is this really a `Page`" at a boundary) — nothing in this spec needs that today, so Option A is the leaner default unless a concrete need for a runtime check surfaces during implementation.

`rawPage()` is the deliberate opt-out under either option: a screen that genuinely needs something other than the stacked-sections layout calls `rawPage(Component)` instead of `page(Component)` — visible in the route file and in a diff, not a boolean someone can leave unset by accident.

### What the brand does and doesn't guarantee

Neither option makes `Page` *unforgeable*. Both are defeated the same way, from any file, inside or outside `route-config.tsx`:

```ts
const fake = { Component: SomethingSketchy } as Page   // compiles under either option
```

This compiles because `as` assertions only require assignability in one direction. `Page` is always assignable to `{ Component: ComponentType }` (a `Page` has a `Component`, among other things), and that single direction is enough for TS to permit the reverse cast — it doesn't matter whether `pageBrand` is a real `Symbol()` (Option B) or purely a type-level fiction (Option A); the cast bypasses the brand check identically either way, because the check being bypassed is "does this object have the required property," not "was this object produced by `page()`."

What the brand *does* guarantee: a **plain object literal, with no explicit cast**, can never accidentally satisfy `Page`. Without the brand, `Page` would just be `{ Component: ComponentType }`, and writing `page: { Component: Foo }` directly in a route file would silently type-check — identical in the type system to a value that went through `page()`, with no signal anywhere that `PageStack` got skipped. That's the actual bug class this design closes: *accidental* omission. A *deliberate* bypass via `as Page` still compiles, but it requires typing `as Page` explicitly, which:
- won't happen by accident — nobody writes `as Page` without intending a type assertion,
- is visible in a diff and in code review, the same way `rawPage()` is meant to be visible next to `page()`,
- is trivially greppable (`grep -rn "as Page"`) if an audit for bypasses is ever needed.

So the brand is a friction-and-visibility mechanism, not a sealed capability boundary — the same caveat applies to every TS branded-type pattern (intersection-style nominal brands, type-fest's `Opaque`, Zod's `.brand()`, etc.). None of them are forge-proof against a willing `as`; all of them convert a silent structural accident into an explicit, reviewable assertion. That's the guarantee this spec actually relies on, and it's sufficient for the stated goal of closing the accidental-omission gap.

### `toRouteObjects()` changes

`Component` destructuring becomes `page` destructuring. The element becomes:

```ts
element: page && (
  permission
    ? <RequirePermission permission={permission}><page.Component /></RequirePermission>
    : <page.Component />
),
```

`page.Component` is already pre-wrapped by whichever factory built it, so `toRouteObjects()` doesn't need to know or care whether `PageStack` is involved — it only ever renders `page.Component`. The existing `!Component && !index && !children` guard becomes `!page && !index && !children`; same behavior, new field name. The error message's wording ("has no Component, index, or children") updates to say "page" instead of "Component."

### Call-site migration

All 4 existing call sites change `Component: X` to `page: page(X)` or `page: rawPage(X)`:

- `features/lots/routes.ts`: `page: page(ListLots)`, `page: page(LotDetails)` — both are ordinary screens, both want the stacked-sections layout.
- `routes/index.ts`'s `HomePage` node: `page: page(HomePage)`.
- `routes/index.ts`'s `AppShell` node (the root layout node) and `features/style-guide/routes.ts`'s `StyleGuide` node — see Open Questions; both are candidates for `rawPage()` rather than `page()`, for different reasons.

## Open Questions

- **Does the `AppShell` root node use `page()`, `rawPage()`, or does `RouteConfigNode` need a third, differently-named option for layout-only nodes?** `AppShell` renders `<Outlet/>` plus surrounding chrome (`Sidebar`, `SidebarToggle`) — it's structurally a layout, not a leaf screen, and was never a candidate for `PageStack` wrapping in the first place. Mechanically, `rawPage(AppShell)` works (no `PageStack` applied, which is correct), but naming a shell layout "a raw page" reads a little oddly at the call site. Worth a naming pass during implementation — e.g. a `layout()` factory that's really just an alias for `rawPage()` with clearer intent where it's used, if that reads better than reusing `rawPage` for both "layout shell" and "deliberately unwrapped screen."
- **Should `StyleGuide.tsx` use `page()` or `rawPage()`?** Leaning `rawPage()` — the style guide needs to render `PageStack` itself as one of the things on display, which is awkward if the route machinery already wrapped the whole screen in one. Left to the implementer's judgment.
- **Naming:** `page`/`rawPage`/`Page` vs. alternatives (e.g. `routePage`/`unwrappedPage`) — not load-bearing; pick whatever reads clearly once it's next to the real call sites.
