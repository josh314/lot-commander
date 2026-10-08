# Phase 3 — Screen-by-screen migration

*(in progress — Lots list/view done)* — back to [Frontend Modernization Plan](./PLAN.md)

## Per-screen checklist (copy this block per screen)

```
### <state name> — <nav label>
- [ ] Read legacy source: controller `client-legacy/src/js/ng/controllers/<x>-ctrl.js`,
      partial `client-legacy/src/partials/<x>.html`, any service(s) it injects.
- [ ] List the `/api/*` endpoints it calls (grep the service file(s) for axios/http calls).
- [ ] Design the React component + any hooks/types needed; add types for the
      API request/response shapes actually observed (don't guess — read the
      corresponding `server/routers/*.js` + model to confirm the real shape).
- [ ] Implement + add at least one Vitest test (render + one interaction, or
      one API-mocked data-flow test for read-heavy screens).
- [ ] Wire the route (add router entry once this phase has picked a router lib).
- [ ] Add the nav entry to `AppShell`'s nav data (respecting `userPermission`
      via `hasPermission`/the and/or helper from Phase 2.2).
- [ ] Manually verify against the real backend (not just legacy comparison).
- [ ] Mark done below.
```

## Screens (grouped as in `client-legacy/src/js/ng/app.js`'s `stateData`)

Lots
- [x] `main.lots.list` — List Lots — `list-lots-ctrl.js` / `_list_lots.html` — ported as `client/src/features/lots/ListLots.tsx` (filters, pagination; sort controls and page-size control still open, see `docs/modernization-todos/TODO.md`)
- [ ] `main.lots.new` — New Lot — `new-lot-ctrl.js` / `_new_lot.html`
- [x] `main.lots.view` — View Lot — `view-lot-ctrl.js` / `_view_lot.html` — ported as `client/src/features/lots/LotDetails.tsx`
- [ ] `main.lots.scan` — Scan — `scan-ctrl.js` / `_scan.html`
- [ ] `main.lots.review-manifest` — `review-manifest-ctrl.js` / `_review_manifest.html`
- [ ] `main.lots.submit-listing` — `submit-listing-ctrl.js` / `_submit_listing.html`
- [ ] `main.lots.image-editor` — `image-editor-ctrl.js` / `_image_editor.html`
- [ ] `main.lots.gallery` — `gallery-ctrl.js` / `_gallery.html`
- [ ] `main.lots.upload-manifest` — `upload-lot-manifest-ctrl.js` / `_upload_lot_manifest.html`

Manifests
- [ ] `main.manifests.clean` — Clean — `clean-manifest-ctrl.js` / `_clean_manifest.html`
- [ ] `main.manifests.list` — List — `list-manifests-ctrl.js` / `_list_manifests.html`

Shipments
- [ ] `main.shipments.list` — All shipments — `shipment-list-ctrl.js` / `receiving/_shipment_list.html`
- [ ] `main.shipments.creation` — New Shipment — `shipment-creation-ctrl.js` / `receiving/_shipment_creation.html`
- [ ] `main.shipments.details` — `shipment-details-ctrl.js` / `receiving/_shipment_details.html`
- [ ] `main.shipments.process-manifest` — `shipment-process-manifest-ctrl.js` / `receiving/_shipment_process_manifest.html`
- [ ] `main.shipments.receiving` — (no dedicated ctrl found — check `shipment-details-ctrl.js` or a directive) / `receiving/_shipment_receiving.html`
- [ ] `main.shipments.clean-manifest` — reuses `clean-manifest-ctrl.js` / `_clean_manifest.html`

Inventory Pallets
- [ ] `main.inventory-pallets.view` — All pallets — `inventory-pallet-view-ctrl.js` / `receiving/_inventory_pallet_view.html`
- [ ] `main.inventory-pallets.creation` — `inventory-pallet-creation-ctrl.js` / `receiving/_inventory_pallet_creation.html`
- [ ] `main.inventory-pallets.to-be-listed` — `inventory-pallets-to-be-listed-ctrl.js` / `production/_inventory_pallets_to_be_listed.html`
- [ ] `main.inventory-pallets.to-be-processed` — `inventory-pallets-to-be-processed-ctrl.js` / `production/_inventory_pallets_to_be_processed.html`
- [ ] `main.inventory-pallets.allocated-for-unmanifested-lots` — `inventory-pallets-allocated-for-unmanifested-lots-ctrl.js` / `production/_inventory_pallets_allocated_for_unmanifested_lots.html`
- [ ] `main.inventory-pallets.split` — `inventory-pallet-split-ctrl.js` / `production/_inventory_pallet_split.html`
- [ ] `main.inventory-pallets.repack` — `inventory-pallet-repack-ctrl.js` / `production/_inventory_pallet_repack.html`

Packages
- [ ] `main.packages.manage` — Packages — `packages-ctrl.js` / `production/_packages.html`

Orders
- [ ] `main.orders.queue` — Queue — `order-queue-ctrl.js` / `orders/_order_queue.html`
- [ ] `main.orders.pick` — `pick-order-ctrl.js` / `orders/_pick_order.html`

Costs
- [ ] `main.costs.purchases` — Purchases — `purchase-aggregation-ctrl.js` / `_purchase_aggregation.html`
- [ ] `main.costs.transportation` — Transportation — `transportation-cost-aggregation-ctrl.js` / `_transportation_cost_aggregation.html`

Manual Inventory
- [ ] `main.manual-inventory` — Inventory — `manual-inventory-ctrl.js` / `_manual_inventory.html`

Store
- [ ] `main.store.shipping-rates` — Shipping Rates — `store-shipping-rates-ctrl.js` / `_store_shipping_rates.html`
- [ ] `main.store.shipping-configurations` — Shipping Configs — `shipping-configurations-ctrl.js` / `_shipping_configurations.html`
- [ ] `main.store.content` — Content — `store-content-ctrl.js` / `_store_content.html`
- [ ] `main.store.bundles` — Bundles — `product-bundles-ctrl.js` / `_product_bundles.html`

App Settings / Announcements
- [ ] `main.app-settings.list` — App — `app-settings-ctrl.js` / `_app_settings.html`
- [ ] `main.site-announcements.manage` — Announcements — `site-announcements-ctrl.js` / `_site_announcements.html`

Users
- [ ] `main.users.list` — List — `list-users-ctrl.js` / `users/_list_users.html`
- [ ] `main.users.change-password` — Change Password — `change-user-password-ctrl.js` / `users/_change_password.html`
- [ ] `main.users.create` — New User — `create-new-user-ctrl.js` / `users/_create_user.html`
- [ ] `main.users.logout` — already handled by Phase 2's hard-nav Logout link; no React component needed.

Other
- [ ] `main.history` — `history-ctrl.js` / `_history.html`

Not currently active in nav (commented out in `app.js`'s `stateData` — skip
unless reactivated): `main.auctions.*`, `main.reports`, `main.tools.counter`,
`main.packages.packing`.

Shared/reused across screens above — port once, first screen that needs it
wins: modals (`edit-lot-modal-ctrl.js`, `pallets-from-manifest-modal-ctrl.js`,
`past-image-gallery-modal-ctrl.js`, `product-data-merge-modal-ctrl.js`,
`product-data-search-modal-ctrl.js`, `shipping-items-modal-ctrl.js`), and
directives (`camera-dir.js`, `collage-dir.js`, `editor-listing-dir.js`,
`lot-media-grid-dir.js`, `media-grid-dir.js`, `upload-files-dir.js`,
`shipping-items-dir.js`).
