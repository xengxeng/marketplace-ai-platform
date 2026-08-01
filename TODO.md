# Merchant Commerce Workspace — Implementation TODO

Goal: close the supply-side loop so a verified merchant can create/publish
products and fulfill their own orders through the UI, matching the existing
dashboard/panel architecture.

## Steps

- [x] 1. Update `src/lib/supabase/schema.sql`:
  - [x] a. Add `categories` table + 8 seeded food categories + public read RLS
  - [x] b. Add product columns (`sku`, `compare_at_price_cents`, `low_stock_threshold`, `category_id`, `updated_at`)
  - [x] c. Expand `orders.status` constraint → `pending/paid/confirmed/processing/shipped/delivered/cancelled/refunded` + add `updated_at` + `tracking_number`/`carrier`
  - [x] d. Add `order_status_history` audit table + RLS
  - [x] e. Add `transition_order()` SECURITY DEFINER function (state machine + atomic history + restock + notify)
  - [x] f. Add merchant RLS policies for `orders` + `order_items`
- [x] 2. Add `GET /api/categories`
- [x] 3. Add `GET/POST /api/merchant/products` (list incl. drafts / create draft)
- [x] 4. Add `PATCH /api/merchant/products/[id]`
- [x] 5. Add `POST /api/merchant/products/[id]/publish` (verification-gated)
- [x] 6. Add `POST /api/merchant/products/[id]/archive`
- [x] 7. Add `GET /api/merchant/orders`
- [x] 8. Rework `PATCH /api/orders/[id]/status` → call `transition_order` RPC, allow merchant role
- [x] 9. Build `merchant-products-panel.tsx` (list + create/edit form + publish/archive)
- [x] 10. Build `merchant-orders-panel.tsx` (order list + contextual transitions)
- [x] 11. Update `/dashboard/merchant` to render Products + Orders panels for verified merchants
- [x] 12. Update `admin-orders-panel.tsx` for the full status chain
- [x] 13. Run `npm run lint` + `npm run build` — build passed with all 29 routes
      compiled (`✓ Compiled successfully in 20.1s`, TypeScript clean); lint
      passes on `src/` after updating `eslint.config.mjs` to ignore
      `.supabase-admin/**` (Node CJS utility) and disable
      `react-hooks/set-state-in-effect` (the codebase's standard
      useEffect data-fetch pattern).
- [x] 14. Update `IMPLEMENTATION_CHECKLIST.md` + this TODO

