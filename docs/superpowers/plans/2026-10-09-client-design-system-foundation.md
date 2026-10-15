# Client Design System Foundation Implementation Plan

> **Execution note:** The user is implementing this plan personally, task by task, at their own pace. This plan is a roadmap and checklist, not a handoff for an agentic worker — tasks are described at a level meant to guide a human who already knows React/TypeScript/Tailwind but is new to this specific design, not spelled out as copy-pasteable code.

**Goal:** Build the foundational color/typography/spacing tokens and a small reusable UI component library (`Button`, `Input`, `Select`, `Panel`, `Table`, `PageHeader`, `PageStack`) for the new `client/` app, verified via a dev-only `/style-guide` route.

**Architecture:** Semantic color/typography tokens added to `client/src/index.css`'s existing `@theme` block; one dedicated React component per primitive in `client/src/components/ui/`, each with baked-in Tailwind classes (no shared CSS component classes, no `clsx`/`cva`); a `/style-guide` route gated by `import.meta.env.DEV` so it's tree-shaken out of production builds.

**Tech Stack:** Tailwind v4 (`@theme`, CSS-first), React 19, TypeScript, Vitest + Testing Library (existing project conventions — no new dependencies).

**Spec:** `docs/superpowers/specs/2026-10-08-client-design-system-foundation-design.md`

**Status:** Implemented and committed, with real divergences from this plan — see each task's Resolution note. Headline gaps: no `Panel` component (built `Surface` instead, a different thing), no tests written for anything in `components/ui/` despite every task below calling for one, `Table`'s API ended up data-prop-shaped rather than children-composed.

## Global Constraints

- No new runtime dependency (no `clsx`, no `class-variance-authority`) — template literals over plain lookup objects.
- No retrofit of `ListLots.tsx` / `LotDetails.tsx` in this round.
- No checkbox/radio/textarea inputs, no dark mode, no size axis on anything but `Button`.
- `--color-accent` is removed outright (not kept as a deprecated alias) — any usage found must move to `primary`.
- Every new `components/ui/` file gets a sibling `.test.tsx`, matching the existing per-file test convention (`AuthProvider.test.tsx`, `HomePage.test.tsx`).

## Review Focus

- **Stale `-accent` usage beyond `Sidebar.tsx`.** Tailwind silently drops a utility referencing a token that no longer exists — no build error, just an unstyled element. Task 1 must grep the whole `client/src` for `-accent` (not just assume the two known call sites) before deleting the token.
- **A typo'd lookup key in `Button`'s variant/size maps.** A missing key silently resolves to `undefined` in the template literal, rendering an unstyled button with no error. Task 2's test should assert every declared `variant` × `size` combination produces non-empty, expected classes — not just one sample case.
- **`Table` striping/hover with 0 or 1 data rows.** Easy to get right by accident with typical 5-row test fixtures and wrong with real edge-case data. Task 6's test should include a zero-row and a one-row case.
- **Duplicate/missing `id` wiring in `Input`/`Select`.** The existing hand-rolled inputs in `ListLots.tsx` set `id`/`htmlFor` manually; the new components must accept or generate a unique `id` so two instances on one page don't collide and label association (`htmlFor`) stays correct for accessibility. Task 3/4's tests should assert the label's `htmlFor` matches the input's `id`.
- **The `/style-guide` tree-shake not actually happening.** Easy to assume Vite/Rollup eliminated the dead branch without checking. Task 10 includes an explicit grep of the production build output as a pass/fail check, not just "it should work."

**Resolution on Review Focus:** The stale-`-accent` check held (confirmed zero remaining references anywhere in `client/src`). The tree-shake check was actually run — built and grepped `dist/assets/*.js`, no matches, genuinely verified rather than assumed. The typo'd-lookup-key risk materialized for real (a missing `as const` on `semanticColors`/`buttonSizes` silently widened the types, defeating `Record<...>` exhaustiveness — caught via an empirical `tsc` probe during later review, not by a test, since no `Button.test.tsx` exists). `Input`/`SelectInput` do implement the `useId()` fallback as intended, but nothing tests that two instances don't collide. The 0/1-row `Table` striping case was never tested either way — no test exists to say whether it's actually correct.

---

### Task 1: Foundation tokens + accent removal

**Files:**
- Modify: `client/src/index.css`
- Modify: `client/src/components/Sidebar.tsx`

**Interfaces:**
- Produces: `--color-primary`, `--color-secondary`, `--color-success`, `--color-danger`, `--color-warning`, `--color-info` (each with a `-subtle` pair), plus `h1`–`h4` base styles — all consumed by every component task below.

**What to build:**
- Add the six semantic color roles to the existing `@theme` block, each aliased via `var()` into Tailwind's built-in palette (exact shades are yours to pick — spec placeholders were `blue-900`/`gray-500`/`green-600`/`red-600`/`amber-500`, navy/grey/green/red/orange-or-yellow per your earlier note). Add matching `-subtle` tokens (e.g. `--color-danger-subtle: var(--color-red-100)`).
- Remove `--color-accent` entirely. Before removing, `grep -rn "accent" client/src` to confirm `Sidebar.tsx`'s two `border-accent` call sites are the *only* usages — if you find others, update those too. Rename both call sites to `border-primary`.
- Add an `@layer base` block styling raw `h1`–`h4` (size/weight scale is yours to pick; spec suggested `text-2xl font-semibold`-ish for `h1`, stepping down from there).
- No code changes needed for the spacing convention table itself (section 1 of the spec) — it's a convention the component tasks below follow, not a token.

**Test:** None for this task (no component logic yet) — verify visually: `npm run dev -w client`, confirm the sidebar's active-nav-link border still renders (now navy instead of red) and nothing else regressed.

- [x] Implement token changes + Sidebar rename, verify dev server renders correctly, commit.

**Resolution:** Done, and taken further than planned — the neutral tokens (`ink`/`muted`/`paper`/`line`) also got converted to `var(--color-slate-*)` references in a later pass (not just the semantic roles this task covered), `--color-panel` was renamed to `--color-surface`, and a new `--color-shell` token was split out for the sidebar background specifically. Final shades: `primary`→`sky-950`, `secondary`→`gray-500`, `success`→`green-700`, `danger`→`red-700`, `warning`→`amber-600`, `info`→`sky-700`. The `@layer base` h1–h4 block was **not** added — see the spec's Design/Resolution for section 1, headings ended up styled per-component instead.

---

### Task 2: `Button`

**Files:**
- Create: `client/src/components/ui/Button.tsx`
- Test: `client/src/components/ui/Button.test.tsx`

**Interfaces:**
- Produces: `Button({ variant: 'primary'|'secondary'|'success'|'danger'|'warning'|'info', size: 'sm'|'md', ...standard button props }): JSX.Element`

**What to build:**
- Two plain lookup objects, `colorClasses` (one entry per variant, using the tokens from Task 1 — e.g. `bg-primary text-white` or similar) and `sizeClasses` (`sm` → `px-3 py-1.5 text-sm`, `md` → `px-4 py-2 text-sm`, per the spec's spacing table).
- Combine via template literal: `` `inline-flex items-center justify-center rounded font-medium ${colorClasses[variant]} ${sizeClasses[size]}` ``. Forward any extra `className`/native button props the caller passes (spread `...props`, merge `className` in).
- Default `variant="primary"`, `size="md"`.

**Test:**
- Render each of the 6 variants and assert the expected background/text class is present.
- Render both sizes and assert the expected padding class is present.
- Assert a passed-through `onClick` fires and a passed-through `className` is present alongside the generated classes.

- [ ] Implement + test, verify `npm run test -w client -- Button` passes, commit.

**Resolution:** Implemented and committed, no test written. Prop is named `color`, not `variant` as this task specified. `size` ended up with five steps (`xs`/`sm`/`md`/`lg`/`xl`), not the two (`sm`/`md`) this task and the spec called for.

---

### Task 3: `Input`

**Files:**
- Create: `client/src/components/ui/Input.tsx`
- Test: `client/src/components/ui/Input.test.tsx`

**Interfaces:**
- Produces: `Input({ label: string, id?: string, ...standard input props }): JSX.Element` — collapses the pattern currently duplicated in `ListLots.tsx`'s `ListHandleFilterInput`/`ListLotNumberFilterInput`.

**What to build:**
- A `gap-1` vertical stack (per the spec's label-to-control gap) containing a `<label>` and a text `<input>`, using the `md` control padding (`px-4 py-2`) from the spacing table.
- `id` should default to a generated unique value (e.g. React's `useId()`) if not passed, so `htmlFor`/`id` always match without the caller having to invent one.
- Forward `value`/`onChange`/other native input props via `...props`.

**Test:**
- Render with a label, assert the `<label>`'s `htmlFor` matches the `<input>`'s `id`.
- Assert typing fires the passed `onChange`.
- Render two instances without an explicit `id` prop and assert they don't collide (different generated ids).

- [ ] Implement + test, commit.

**Resolution:** Implemented and committed (as part of `components/ui/Form.tsx`, not a standalone `Input.tsx`), no test written. Went further than this task's spec: types against the native element directly (`ComponentPropsWithRef<'input'>`) and spreads `...props` through, rather than hand-naming `placeholder`/`size`/etc. individually — avoids the prop-list-spiral this task's narrower signature would have led to. The `useId()`-fallback behavior this task asked for is present.

---

### Task 4: `Select`

**Files:**
- Create: `client/src/components/ui/Select.tsx`
- Test: `client/src/components/ui/Select.test.tsx`

**Interfaces:**
- Produces: `Select({ label: string, id?: string, children: React.ReactNode, ...standard select props }): JSX.Element` — `children` are plain `<option>` elements, caller's responsibility (matches `ListLots.tsx`'s current `FILTER_STATUS_OPTIONS.map(...)` usage).

**What to build:** Same shape as `Input` (label+field pairing, `gap-1`, `md` control padding, `useId()` fallback) but wrapping `<select>` instead of `<input>`.

**Test:** Same pattern as `Input`'s tests, adapted for `<select>`/`<option>` — label/id match, `onChange` fires, no id collisions across instances.

- [ ] Implement + test, commit.

**Resolution:** Implemented as `SelectInput` inside `components/ui/Form.tsx` (not a standalone `Select.tsx`), same `ComponentPropsWithRef<'select'>` pattern as `Input`. No test written.

---

### Task 5: `Panel`

**Files:**
- Create: `client/src/components/ui/Panel.tsx`
- Test: `client/src/components/ui/Panel.test.tsx`

**Interfaces:**
- Produces: `Panel({ children, className? }): JSX.Element` — generic container, no variant axis.

**What to build:** `bg-panel border border-line rounded p-4` (the spec's panel interior padding) wrapping `children`; merge any passed `className`.

**Test:** Renders children; passed `className` is present alongside the base classes.

- [ ] Implement + test, commit.

**Resolution:** Not built — not even partially. `components/ui/Surface.tsx` exists instead, but it's a different component: `bg-surface px-4 py-4 rounded-lg shadow-xl w-fit`, no border, no semantic-color awareness, shrink-wraps to its content. The bordered, semantic-aware `Panel` this task describes doesn't exist anywhere in the codebase as of this writing.

---

### Task 6: `Table`

**Files:**
- Create: `client/src/components/ui/Table.tsx`
- Test: `client/src/components/ui/Table.test.tsx`

**Interfaces:**
- Produces: `Table({ children }): JSX.Element` (renders `<table>` + whatever `<thead>`/`<tbody>` structure the caller passes as `children`) and a row piece — pick between an exported `Table.Row` component or a plain striping CSS rule on `tbody > tr:nth-child(even)` scoped via a wrapper class. Either is fine per the spec; the row-piece approach is friendlier for a hover state controlled per-row, the CSS-selector approach is less code. Your call during implementation.
- Cell padding: `px-3 py-2` (spec's table-cell-padding row, deliberately matching `Button`/`Input`'s horizontal step) applied wherever cells render — if you go the CSS-selector route this likely needs a small `@layer components` rule or a cell wrapper; if you go the `Table.Row`/cell-component route it's just baked into the cell's className.

**Test:**
- Render a table with 5 rows, assert alternating rows get the striping class and the rest don't.
- Render with 0 rows — doesn't crash, renders an empty `<tbody>`.
- Render with 1 row — gets the correct (non-striped, or striped depending on which parity you chose) class, not an error.

- [ ] Implement + test, commit.

**Resolution:** Implemented and committed, no test written (so the 0-row/1-row case this task specifically calls out as a review focus item was never actually checked). Striping landed as CSS `nth-child` selectors on `<tbody>`, as this task anticipated — but the **API shape is different from what this task specified**: `Table({ children })` (caller provides raw `<thead>`/`<tbody>` JSX) was the plan; the actual `Table({ header, rows })` takes `header` as a `ReactNode` and `rows` as a `ReactNode` built from `TableHeader({ cells })`/`TableRow({ cells })` components that take flat arrays of cell content. This is closer to a data-prop shape than the children-composition this task (and the broader table-strategies discussion earlier in the session) specifically favored for flexibility — worth revisiting if a screen later needs something the `cells` array can't express cleanly (a colspan'd group-header row, a nested table in one cell), since those were the exact patterns children-composition was chosen to support. Hover-highlight was never added — only the two striping rules exist.

---

### Task 7: `PageHeader`

**Files:**
- Create: `client/src/components/ui/PageHeader.tsx`
- Test: `client/src/components/ui/PageHeader.test.tsx`

**Interfaces:**
- Produces: `PageHeader({ title: string, subtitle?: string, actions?: React.ReactNode }): JSX.Element`

**What to build:** A flex row with `title` (using the `h1`/`h2` scale from Task 1) and optional `subtitle` on the left, `actions` right-aligned (`justify-between` or similar) if provided.

**Test:** Renders title always; renders subtitle only when passed; renders actions content only when passed.

- [ ] Implement + test, commit.

**Resolution:** Implemented and committed (in `components/ui/Header.tsx`), no test written. Scope expanded beyond this task — `SectionHeader`/`SubsectionHeader` were added alongside `PageHeader` (an `h2`/`h3` scale, not originally planned as separate components). The `actions?` slot this task specifies was **not** implemented — no right-aligned action-button area on `PageHeader` yet.

---

### Task 8: `PageStack`

**Files:**
- Create: `client/src/components/ui/PageStack.tsx`
- Test: `client/src/components/ui/PageStack.test.tsx`

**Interfaces:**
- Produces: `PageStack({ children, className? }): JSX.Element`

**Role:** `PageStack` is scoped to a single screen's own top-level content — it is **not** the app-wide page container (that's `AppShell.tsx`'s existing `flex h-screen` + `<main>`/`<Outlet>` wrapper, unmodified by this plan) and it is not mounted once globally. Each screen renders its own `<PageStack>` around its own children, in place of a raw wrapping `<div>` — e.g. `ListLots.tsx` would eventually become:

```tsx
export function ListLots() {
  return (
    <PageStack>
      <PageHeader title="Lots" actions={<Button>New Lot</Button>} />
      <Panel>{/* filters */}</Panel>
      <Table>{/* ... */}</Table>
    </PageStack>
  )
}
```

(That retrofit itself is out of scope per the spec's Non-Goals — shown here only to illustrate the intended call pattern.) It's not restricted to one per screen — a screen could nest a second `PageStack` around a visually distinct sub-section — but one-per-screen wrapping that screen's top-level sections is the expected default use.

**What to build:** `space-y-6` (the spec's inter-section gap role) wrapping `children` in a `<div>`; merge passed `className`.

**Test:** Renders children; base `space-y-6` class present alongside any passed `className`.

- [ ] Implement + test, commit.

**Resolution:** Implemented and committed, no test written — but in `components/layout/PageStack.tsx`, not `components/ui/` as this task specifies, because it ended up built alongside the separate `page()`/`rawPage()` route-wrapping work (`docs/superpowers/archive/specs/2026-10-10-route-page-wrapping-design.md`). The manual per-screen composition this task's code sample shows (`ListLots` importing and wrapping itself in `<PageStack>`) is **not** how it's actually used: `page()` wraps a route's component in `<PageStack>` automatically at the route-table level (confirmed in `features/lots/routes.ts`'s `page: page(ListLots)`, and visually confirmed rendering with correct spacing). This is a better outcome than this task describes — it closes the exact "developer forgets to wrap their screen" gap that was this component's whole reason for existing, without needing anyone to remember anything.

---

### Task 9: Barrel export

**Files:**
- Create: `client/src/components/ui/index.ts`

**Interfaces:**
- Consumes: every component from Tasks 2–8.
- Produces: `export { Button, Input, Select, Panel, Table, PageHeader, PageStack } from ...` (plus any sub-pieces, e.g. a `Table.Row` if you went that route in Task 6).

**What to build:** Flat re-export, matching the existing `hooks/index.ts` barrel pattern — no new logic.

**Test:** None needed — a barrel file has no behavior of its own; its correctness is implied by Tasks 2–8's own tests plus Task 10's style-guide route actually importing from it.

- [x] Implement, commit.

**Resolution:** Done, matches plan — `components/ui/index.ts` is a flat `export *` re-export, same shape as `hooks/index.ts`.

---

### Task 10: Dev-only `/style-guide` route

**Files:**
- Create: `client/src/features/style-guide/StyleGuide.tsx`
- Create: `client/src/features/style-guide/routes.ts`
- Modify: `client/src/routes/index.ts`

**Interfaces:**
- Consumes: the full `components/ui` barrel from Task 9.

**What to build:**
- `StyleGuide.tsx`: renders every component, every `Button` variant × size, both inputs with sample state, a `Panel`, a `Table` with a handful of sample rows, a `PageHeader` with and without actions, all wrapped in a `PageStack`.
- `routes.ts`: exports a `RouteConfigNode[]` (one entry, path `style-guide`, `Component: StyleGuide`) with a one-line comment noting this route is meant to be deleted once real screens are retrofitted to use these components.
- `routes/index.ts`: import `styleGuideRoutes` and spread it into the assembled route list guarded by `import.meta.env.DEV ? styleGuideRoutes : []` — **not** added to `navTree`/`footerNavTree`, no `permission` gate.

**Verification (this is the task's actual test, not a Vitest file):**
- `npm run dev -w client`, visit `/style-guide` directly, confirm everything renders.
- `npm run build -w client`, then `grep -r "StyleGuide" client/dist/assets/*.js` (and `grep -r "style-guide"`) — expect **no matches**. If you get a match, the tree-shake didn't happen (check that the import is a static top-level import, not something Rollup couldn't prove was unreachable) and the task isn't done.

- [x] Implement, verify dev rendering, verify prod build exclusion via grep, commit.

**Resolution:** Done, and this one's verification was actually carried out to the letter — built and grepped `dist/assets/*.js` for `StyleGuide`, zero matches, confirming the tree-shake genuinely works rather than assuming it. `StyleGuide.tsx`'s content also grew beyond this task's original scope (demos `PageHeader`/`SectionHeader`/`SubsectionHeader`, all six `Button` colors × five sizes, both inputs, a `Table`, and a `Surface` — roughly matching intent, though `Panel` obviously isn't demoed since it doesn't exist).
