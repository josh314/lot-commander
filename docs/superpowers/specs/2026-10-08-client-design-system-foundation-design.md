# Client Design System Foundation

## Status

Implemented and committed (branch `client-next`: "Establish neutral + semantic color token palette", "Add design-system UI component library", "Add dev-only style guide route", "Retrofit ListLots to use the design-system components", "Add Button tests, forward native button props", "Rework Form.tsx: shared control-prop hook, consolidated label wiring, tests"). The sections below are left as originally written — they're the design rationale — with a `Resolution` note added after each so this doc still reads as a record of *why*, not just a stale plan. Implementation diverged from the design in several real ways (no `Panel` was built, `Table`'s API ended up data-prop-shaped rather than children-composed) — see each section's Resolution for specifics, and `CLAUDE.md`'s Client section for current-state facts. One thing that *didn't* stay diverged: `Button` and the `Form.tsx` components now have real tests (see section 4's Resolution) — the "no tests exist" gap recorded below was closed in later follow-up work, not left as a permanent deviation.

## Context / Current State

The new client (`client/`) is Tailwind v4 (CSS-first theming via `@theme`, no `tailwind.config.js`). Styling so far is limited to the app shell:

- `client/src/index.css` defines six custom color tokens (`--color-ink`, `--color-muted`, `--color-paper`, `--color-panel`, `--color-line`, `--color-accent`) and one font token (`--font-sans`, IBM Plex Sans, loaded via Google Fonts `<link>` in `index.html`).
- `Sidebar.tsx`, `SidebarToggle.tsx`, and `AppShell.tsx` consume these tokens directly as Tailwind utility classes (`bg-panel`, `border-accent`, `text-ink`, etc.) — the only currently-styled pieces of the app.
- The two real screens ported so far, `ListLots.tsx` and `LotDetails.tsx`, are bare semantic HTML (`<input>`, `<select>`, `<table>`, `<fieldset>`) with no Tailwind classes at all.
- The codebase's established pattern for reusable UI is dedicated React components (`Sidebar`, `ListPaginationControls`, `RequirePermission`, `AppShell`), not shared CSS classes — this design follows that grain rather than introducing a parallel `.btn`/`.input`-style CSS-class system.

**Resolution (now superseded):** This is the "before" snapshot. `--color-panel`/`--color-accent` are both gone (renamed to `surface`, removed entirely, respectively); `ListLots.tsx` now uses the new components (see Design/Resolution notes below). `LotDetails.tsx` is unchanged — still bare semantic HTML, not retrofitted. See `CLAUDE.md`'s Client section for current-state facts rather than this list.

## Goals

Give every future screen a consistent, ready-to-use visual foundation — color roles, typography, and a small set of reusable components — without retrofitting the two screens that already exist. A later pass will apply these components to `ListLots`/`LotDetails`; that retrofit is explicitly out of scope here.

## Non-Goals

- Retrofitting `ListLots.tsx` / `LotDetails.tsx` to use the new components (deferred to a follow-up).
- Checkbox, radio, and textarea inputs (not used by any ported screen yet; add when a real screen needs one).
- Dark mode / theming beyond the single light palette.
- A size axis on anything other than `Button`.
- Any new runtime dependency (no `clsx`, no `class-variance-authority`) — the variant surface (one axis on one component) doesn't justify either; plain template literals over lookup objects are sufficient and keep the dependency count unchanged.

**Resolution:** `ListLots.tsx` *was* retrofitted in this same round after all (the "deferred to a follow-up" framing didn't hold — it happened immediately once the components existed). `clsx`/`cva` stayed out as planned. Checkbox/radio/textarea, dark mode, and `Button`-only sizing are all still true non-goals — untouched. One addition beyond this list: `lucide-react` was added as a new runtime dependency in the same stretch of work, for icons (`ListPaginationControls`, style guide) — not a color/variant-system dependency, so it doesn't contradict the "no `clsx`/`cva`" reasoning above, just wasn't anticipated by this spec at all.

## Design

### 1. Foundation tokens (`client/src/index.css`)

Add semantic color-role tokens alongside the existing neutrals, each aliased via `var()` into Tailwind's own built-in palette (so retuning a role later is a one-line edit, and `-subtle` variants reuse Tailwind's own shade ramps instead of hand-picked hex values):

```css
@theme {
  /* existing neutrals unchanged: ink, muted, paper, panel, line */

  --color-primary: var(--color-blue-900);      /* exact shade TBD by user — navy */
  --color-secondary: var(--color-gray-500);    /* exact shade TBD by user — grey */
  --color-success: var(--color-green-600);     /* exact shade TBD by user */
  --color-danger: var(--color-red-600);        /* exact shade TBD by user */
  --color-warning: var(--color-amber-500);     /* exact shade TBD by user — orange/yellow */
  --color-info: var(--color-sky-600);          /* exact shade TBD by user, if distinct from primary */

  --color-primary-subtle: var(--color-blue-100);
  --color-secondary-subtle: var(--color-gray-100);
  --color-success-subtle: var(--color-green-100);
  --color-danger-subtle: var(--color-red-100);
  --color-warning-subtle: var(--color-amber-100);
  --color-info-subtle: var(--color-sky-100);
}
```

`--color-accent` is removed, not kept as a deprecated alias — its one real use (the sidebar's active-nav-link border) is a "primary/brand highlight" concern, which is now `primary`'s job. The two call sites in `Sidebar.tsx` (`border-accent` → `border-primary`) are updated as part of this change; this is the one piece of "existing chrome" touched in this round, scoped to a two-line rename, not a retrofit of a whole screen.

Typography: add a heading scale as global element styles, not a component:

```css
@layer base {
  h1 { /* text-2xl font-semibold, exact scale TBD */ }
  h2 { /* ... */ }
  h3 { /* ... */ }
  h4 { /* ... */ }
}
```

No new spacing tokens — Tailwind's default numeric spacing scale is used as-is (it's already a coherent ratio scale). What's added instead is a documented mapping of structural roles onto specific steps of that scale, so components don't each pick padding independently:

| Role | Value | Applies to |
|---|---|---|
| Control interior padding (sm) | `px-3 py-1.5` | `Button` (size `sm`) |
| Control interior padding (md) | `px-4 py-2` | `Button` (size `md`), `Input`, `Select` |
| Label-to-control gap | `gap-1` | `Input`/`Select`'s internal label+field stack |
| Panel interior padding | `p-4` | `Panel` |
| Table cell padding | `px-3 py-2` | `Table` cells — deliberately shares `Button`/`Input`'s horizontal step so a table sitting next to a filter row lines up visually |
| Inter-section gap | `gap-6` (`space-y-6`) | Spacing *between* sibling components on a page — enforced via `PageStack` (section 2), not left to each screen to remember |

Once `Button`/`Input`/`Select`/`Panel`/`Table` are written with these values baked in, the convention is enforced structurally for anything *inside* those components — a consuming screen can't deviate without bypassing the component entirely. The inter-section row is the one exception that needed its own component (`PageStack`, below) to get the same structural guarantee, since nothing else in this design wraps sibling components together.

**Resolution:** Semantic roles landed close to spec (final shades: `primary` → `sky-950`, `secondary` → `gray-500`, `success` → `green-700`, `danger` → `red-700`, `warning` → `amber-600`, `info` → `sky-700`; all six `-subtle` pairs present). `--color-accent` removed and `Sidebar.tsx` updated, as planned — though the sidebar's active-nav-link border ended up on `border-info`, not `border-primary` as this spec assumed, a deliberate choice made later in the session, not an oversight.

The neutral tokens went further than this spec anticipated: `ink`/`muted`/`paper`/`line` were *also* converted from hand-picked hex to `var(--color-slate-*)` references (this spec only covered the semantic roles), `--color-panel` was renamed to `--color-surface` to avoid colliding with the (never-built, see below) `Panel` component's name, and a wholly new `--color-shell` token was added — decoupling the sidebar/chrome background from `surface` (grouped-content background, input borders, table stripes), which this spec didn't distinguish at all.

The typography piece did **not** land as specced: this spec called for a global `@layer base` block styling raw `h1`–`h4` elements. That block doesn't exist in `index.css`. Instead, heading sizes/weights are applied per-component inside `components/ui/Header.tsx`'s three components (`PageHeader`/`SectionHeader`/`SubsectionHeader`) — the opposite approach (component-scoped, not global-element) from what this spec specified. Not necessarily worse, but a real deviation, not an implementation detail left open.

The spacing convention table's "Panel interior padding" row never got a component to apply to — see Non-Goals/Resolution below.

### 2. Components (`client/src/components/ui/`)

New folder, one file per primitive, following the existing "dedicated component" pattern:

| File | Shape |
|---|---|
| `Button.tsx` | `<Button variant="primary"\|"secondary"\|"success"\|"danger"\|"warning"\|"info" size="sm"\|"md">` — two independent lookup objects (`colorClasses`, `sizeClasses`) combined via a template literal; no `clsx`/`cva` |
| `Input.tsx` | Labeled text input — collapses the hand-rolled label+input pairs currently duplicated in `ListLots.tsx` (`ListHandleFilterInput`, `ListLotNumberFilterInput`) into one reusable component |
| `Select.tsx` | Labeled `<select>`, same pairing as `Input` |
| `Panel.tsx` | Generic bordered/padded container (`bg-panel`, `border-line`) — general-purpose, not limited to the filter-box use case it will eventually replace in `ListLots.tsx` |
| `Table.tsx` | Exports `Table` (+ a row piece) with striping (alternating row background) and hover-highlight built in; exact mechanism (`nth-child`-based selector vs. an explicit row-index prop) is an implementation-plan-level decision, not fixed here |
| `PageHeader.tsx` | `<PageHeader title subtitle? actions?>` — title, optional subtitle, optional right-aligned actions slot (e.g. a "New Lot" button) |
| `PageStack.tsx` | `<PageStack>` — applies `space-y-6` (the inter-section gap role above) to its children. See "Role of `PageStack`" below. |
| `index.ts` | Barrel re-export of all of the above, matching the existing `hooks/index.ts` barrel pattern |

#### Role of `PageStack`

`PageStack` is scoped to a single screen's own top-level content — it is **not** the app-wide page container (that's already `AppShell.tsx`'s `flex h-screen` + `<main>`/`<Outlet>` wrapper, unchanged by this design) and it is not mounted once globally. Each screen component renders its own `<PageStack>` around its own children, in place of a raw wrapping `<div>`:

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

`AppShell` renders one `<Outlet/>` per route; `PageStack` goes *inside* whatever that route renders. It's not restricted to exactly one per screen or to top-level use only — a screen with a visually distinct sub-section could nest a second `<PageStack>` around just that sub-section's children — but the primary, expected use is one per screen, wrapping that screen's top-level sections.

**Resolution:** The file layout differs from this table in several places:
- `Input.tsx`/`Select.tsx` were never created as separate files — `Input`/`TextInput`/`NumberInput`/`Select`/`TextArea`/`FieldSet`/`LabelContainer` all live in one `components/ui/Form.tsx` (`SelectInput` was later renamed to `Select`; `TextArea` was added beyond this spec's scope once a second screen needed it). Shared logic across the three native-element components (`Input`/`Select`/`TextArea`) was factored into a private `useControlProps` hook (id generation + base className) plus `hooks/generated-id.ts`'s `useGeneratedId` — neither anticipated by this spec, both landed in a later follow-up pass once the duplication across near-identical components became obvious.
- **`Panel.tsx` was never built.** `components/ui/Surface.tsx` exists instead — a simpler, different component: no border, no semantic-color awareness, has a shadow and shrink-wraps to its content (`w-fit`) rather than being a plain bordered/padded box. The bordered, semantic-color-aware, optional-header/footer `Panel` this spec and the "Global styling" TODO item described was never implemented; `Surface` is not a drop-in replacement for that design, just a different container that happened to fill a similar role in practice.
- `PageHeader.tsx` became `components/ui/Header.tsx`, exporting `PageHeader`/`SectionHeader`/`SubsectionHeader` — three levels instead of one. `PageHeader` never got the `actions?` slot this spec specified; there's no right-aligned action-button area yet.
- `Table`'s striping landed as CSS `nth-child` selectors (the mechanism left open here), but the **hover-highlight this row called for was never built** — `components/ui/Table.tsx` only has the two striping rules, no `:hover` state. Still untested, see section 4's Resolution.
- `PageStack.tsx` was built, but lives in `components/layout/`, not `components/ui/` — because it ended up paired with the `page()`/`rawPage()` route-wrapping work from a *different* spec (`docs/superpowers/archive/specs/2026-10-10-route-page-wrapping-design.md`). That turned out better than this spec's own plan: instead of each screen manually remembering to wrap itself in `<PageStack>` (the "Role of `PageStack`" section above, and this spec's whole reason for being a dedicated component rather than a convention), `page()` wraps a screen's component in `<PageStack>` automatically at the route-table level — confirmed in `features/lots/routes.ts` (`page: page(ListLots)`) and visually confirmed rendering with correct `space-y-6` spacing. The manual-composition pattern shown in this section's code sample was never actually used by `ListLots`; it's handled one layer up instead.
- **No tests existed for any `components/ui/` component at the time this round shipped** — since resolved for `Button` and all of `Form.tsx`'s components in later follow-up work; see section 4's Resolution for exactly what's covered and what still isn't.

### 3. Dev-only style guide route

`client/src/features/style-guide/StyleGuide.tsx` renders every component and every variant/color/size combination on one page, for visual verification during this round (no screens consume these components yet).

Wired into `routes/index.ts` guarded by Vite's build-time `import.meta.env.DEV` constant:

```ts
import { styleGuideRoutes } from '../features/style-guide/routes'
// ...
const allRoutes = [...navTree, ...footerNavTree, ...(import.meta.env.DEV ? styleGuideRoutes : [])]
```

Vite statically replaces `import.meta.env.DEV` with a literal `true`/`false` at build time; Rollup's tree-shaking then eliminates the `false` branch and the now-unreachable `styleGuideRoutes` import entirely, so `StyleGuide.tsx` ships in dev builds only, not in `npm run build -w client`'s output. The route is reachable at `/style-guide` directly by URL in dev; it is deliberately **not** added to `navTree`/`footerNavTree` (so it never appears in the sidebar) and has no `permission` gate (any logged-in user can view it — it's a scaffold, not a real screen).

Verification step for the implementation plan: after building, grep `dist/assets/*.js` for `StyleGuide`/`style-guide` to confirm the tree-shake actually happened, rather than trusting the mechanism blindly.

A one-line comment in `features/style-guide/routes.ts` should note that this route is meant to be deleted once real screens are retrofitted to use these components (tracked by the user outside this document).

**Resolution:** Implemented essentially as specced, and empirically verified rather than assumed: built, ran `npm run build -w client`, and grepped `dist/assets/*.js` for `StyleGuide`/`style-guide` — no matches, confirming the dev-only gate and tree-shake both work as designed. Not added to the nav tree, no permission gate, both as planned.

### 4. Testing (Vitest, matching existing per-file convention)

- `Button.test.tsx`: the one component with real branching logic — assert each `variant` and `size` produces the expected classes.
- `Table.test.tsx`: assert striping actually lands on alternating rows, not just "renders without crashing."
- `Input.test.tsx` / `Select.test.tsx` / `Panel.test.tsx` / `PageHeader.test.tsx` / `PageStack.test.tsx`: light smoke tests (renders, label/value wiring, slot content appears) — no variant logic to exercise.
- No test for `StyleGuide.tsx` itself — it's a visual scaffold, not app logic.

**Resolution:** Initially none of this section was implemented, and the two concrete bugs this round actually caught (a `Record<SemanticColor, string>`/`Record<ButtonSize, string>` exhaustiveness hole from a missing `as const`, and a `Surface`/`w-max` overflow bug) were both found through manual `tsc` probes and a headless-Chrome screenshot during review rather than any test — exactly the regression this section's `Button.test.tsx` plan would have caught automatically.

That gap was closed in later follow-up sessions, though not exactly as this section specified:
- `Button.test.tsx` **does** exist now — asserts every `color` × `size` combination produces the real expected classes (not just "renders"), plus `onClick` firing and `disabled` suppressing it. `Button` also gained full native-prop forwarding (`React.ComponentProps<'button'>` + `...props` spread) as part of making it testable this way — it couldn't receive `onClick` at all before.
- `Form.tsx`'s components (`Input`/`Select`/`TextArea`, plus `LabelContainer`) are tested, but not as `Input.test.tsx`/`Select.test.tsx` one-per-file as this section specified — they share one `Form.test.tsx`, using a single parameterized `testsLabeledControl(name, Component, role)` runner applied to all three rather than a hand-copied `describe` block per component. This was a deliberate improvement over per-file duplication: it's what caught `TextArea`'s hand-copied tests having already drifted thinner than `Input`/`Select`'s during the brief period they were separate blocks in the same file.
- `useGeneratedId` (the hook `Input`/`Select`/`TextArea` share for id-fallback) has its own direct test, `hooks/generated-id.test.tsx`.
- **Still true, unresolved:** `Table.test.tsx` doesn't exist — the 0-row/1-row striping edge case this plan called out as a specific risk is still unverified either way. `Surface`, `Header.tsx` (`PageHeader`/`SectionHeader`/`SubsectionHeader`), and `PageStack` also still have no tests.
- A real gotcha hit while writing these tests, now documented in `CLAUDE.md`'s Client section: `fireEvent.change` does **not** respect a native element's `disabled` state the way a real user interaction would (unlike `fireEvent.click`, which jsdom does gate correctly) — an early draft of the disabled-input test passed for the wrong reason before this was caught and fixed to assert `toBeDisabled()` directly instead.

## Open Questions

- Exact Tailwind shade picks for each semantic role (`--color-primary`, etc.) — left to the user to choose when implementing; placeholders above (`blue-900`, `gray-500`, `green-600`, `red-600`, `amber-500`) are illustrative only. **Resolved:** `primary` → `sky-950`, `secondary` → `gray-500`, `success` → `green-700`, `danger` → `red-700`, `warning` → `amber-600`, `info` → `sky-700`.
- `Table`'s striping mechanism (CSS `nth-child` selector vs. an explicit row-index prop) — left as an implementation-plan-level decision. **Resolved:** CSS `nth-child` selectors (`[&_tr:nth-child(odd)]:bg-surface` / `(even)]:bg-paper` on `<tbody>`), no row-index prop.
- Whether `info` needs to be visually distinct from `primary`, or can simply alias it — left to the user's judgment when picking shades (Bootstrap conventionally keeps them distinct; not load-bearing either way). **Resolved:** kept distinct — both land in the `sky` family but at very different lightness steps (`sky-950` vs `sky-700`), not a shared value.
