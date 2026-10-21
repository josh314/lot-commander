# Modernization TODOs

Ad-hoc feature/task list for the new client (`client/`), separate from the
phased migration checklists in `docs/modernization/`. Check items off as
they're done; split into per-area files if this grows too large.

## Pages

### ListLots (`client/src/features/lots/ListLots.tsx`)
- [ ] Add controls to adjust the sort options
- [ ] Add a control to set page size
- [ ] Header position is weird (especially horizontally when the page is wide as it's way off to the left while content is centered) — still true after the design-system retrofit; `<PageHeader>` isn't wrapped in the same `flex flex-col items-center` container as the filters/table below it
- [x] Retrofitted to use the design-system components (`Input`/`SelectInput`/`FieldSet` for filters, `Surface`/`Table` for the list) — see `docs/superpowers/specs/2026-10-08-client-design-system-foundation-design.md`

### List Manifests (`client/src/features/manifests/ListManifests.tsx` — not yet created)
- [ ] Blocked on deciding how to serve `ManifestSvcConstants` to the new
      client — see Cross-cutting concerns below.

### Style Guide
- [ ] demo inputs in tables

## Cross-cutting concerns

- [ ] add title attruibutes to any controls that use icons instead of words

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
- [ ] Nothing enforces that a `layout()`-wrapped component (`components/layout/Layout.tsx`)
      actually renders an `<Outlet/>` — not fixable at the type level (TS can't
      see into a component's returned JSX), so the real safeguard is a test.
      Plan: a sweep test that discovers every `Layout` by walking the real
      `RouteConfigNode` tree (not one hardcoded test per component, so it
      automatically covers layouts added later), asserting each renders a
      synthetic child route's marker content. Two prerequisites, neither
      done yet:
      - `routes/index.ts` doesn't export its root `tree` (only the already-
        flattened `routes`, and `navTree`/`footerNavTree` which are just
        `mainRoutes`/`footerRoutes` — the root `{ layout: layout(AppShell), ... }`
        node isn't reachable from anything exported today).
      - No shared test-render helper exists. `AppShell` needs a real user in
        `AuthContext` to get past its own `if (!user) return null` (verified:
        `useAuthUser()` degrades to `undefined` safely with no provider, but
        AppShell still returns `null` before ever reaching its `<Outlet/>`),
        and there's no reusable `renderWithProviders()`-style helper yet —
        only `AuthProvider.test.tsx` touches `AuthProvider` directly. Any
        future layout under the same provider stack needs the same setup.
- [ ] Migrate the ModalSvc utility modals
- [ ] global styling
- [ ] dark mode support
- [ ] spacing model (margins, padding, gaps)
  - [x] component-level spacing convention documented (interior padding, label-to-control gap, inter-section gap) — see the spacing table in `docs/superpowers/specs/2026-10-08-client-design-system-foundation-design.md`
  - "global" or "container-level" spacing guidance is still not established (e.g. the main viewport, `AppShell`'s own padding is still ad hoc)
- [x] icon set — chose `lucide-react` (see `CLAUDE.md`'s Client section); installed and in use in `ListPaginationControls.tsx` and the style guide
  
## Global styling

Cross-cutting concern but there's enough of it to get it's own section.

- [ ] dark mode

- [x] re-assign the --color-accent variable to match the new design system — done; `--color-accent` removed outright (not kept as an alias), sidebar active-nav-link border now uses `border-info`
- decided against `clsx`/`cva` for conditional classes — plain template literals over lookup objects were sufficient (see spec's Non-Goals)

- [x] background colors
  - scheme established: `paper` (page), `shell` (sidebar/chrome, deliberately separate from `surface`), `surface` (grouped content, input borders, table stripes) — see `CLAUDE.md`'s Client section
- [ ] margins
- [ ] padding

- components
  - [x] headers — `PageHeader`/`SectionHeader`/`SubsectionHeader` (`components/ui/Header.tsx`); no `actions` slot on `PageHeader` yet, unlike the original spec's design
  - [x] inputs — `Input`/`TextInput`/`NumberInput`/`SelectInput`/`FieldSet` (`components/ui/Form.tsx`)
  - [x] buttons
  - [ ] panels/containers — `Surface` (`components/ui/Surface.tsx`) exists as a generic shrink-wrapped grouping container, but the originally-specced `Panel` (bordered, semantic-color-aware, optional header/footer) was never built — `Surface` is a simpler, different thing, not a drop-in for that design
  - [x] tables
    - [x] striped tables — CSS `nth-child` striping on `<tbody>`, see `components/ui/Table.tsx`

  - [ ] anchors
    - they aren't given a color to imply clickability
  - [ ] no automated tests exist yet for any `components/ui/` component — the spec/plan called for a `.test.tsx` per component; none were written

## Server / Backend

- [ ] Apply the stashed fix for `server.js`'s global error handler (doesn't
      set an HTTP status before `res.json()`, so every error currently
      returns 200) — see `WIP / TODO` in `CLAUDE.md`.
- [ ] Migrate config loading from SSM Parameter Store to ECS task-definition
      envars — see `Infrastructure` in `CLAUDE.md`.

- [ ] non-handlebars login page

- [ ] LAST!: deprecate server features that are no longer needed by the new client
  - [ ] most or all of handlebars?
  - [ ] the endpoints that create angular scripts