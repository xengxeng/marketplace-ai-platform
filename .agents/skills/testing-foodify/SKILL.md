---
name: testing-foodify
description: How to stand up and end-to-end test the Foodify marketplace (Next.js + Supabase) locally, including auth, seed data, and role-based dashboards.
---

# Testing Foodify (marketplace-ai-platform) end to end

## Deployed instance

There is a production deployment at `https://marketplace-platform-eosin.vercel.app/`. Plenty can be
verified there with **no credentials at all**: landing page, `/products` (anonymous reads of `active`
products are allowed by RLS), anonymous `Add to cart` → `/auth` redirect, `/dashboard/*` → `/auth`
redirect, `/api/health` (`configured:true`), and `{"error":"Not signed in"}` from `/api/orders`,
`/api/commissions`, `/api/wallet-ledger`. Do this first — it is fast and needs nothing from the user.

**Authenticated production testing needs the user in the loop.** Sign-in is magic-link only; there is
**no OTP code input in the UI**, so a relayed 6-digit code is useless. Ask the user to either click the
sign-in link in a browser you control, paste the fresh single-use
`.../auth/v1/verify?token=...` (or `#access_token=...`) URL, or hand over the service-role key so an
admin sign-in link can be generated. `src/app/auth/page.tsx` has an implicit-flow fallback that consumes
`#access_token=...&refresh_token=...` from the URL hash, so admin-generated links work.

## Credentials

The repo ships **no** `.env` files and the session may have **no** Supabase secrets. Check first:
`find . -maxdepth 2 -name ".env*"`, `env | grep -i supabase`, `list_secrets`.

If real credentials are needed, ask the lead for: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPER_ADMIN_EMAIL`, plus a
deployed URL and a way to receive the Gmail magic link.

### Devin Secrets Needed
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPER_ADMIN_EMAIL` (only for testing against the real project)

## Fully local stack (works with no user secrets — preferred fallback)

Docker is available on the box; the Supabase CLI is not installed by default. GitHub's
`/releases/latest/download/...` URL 404s and the API is rate-limited — download a pinned version:

```bash
curl -fsSL -o /tmp/sb.deb https://github.com/supabase/cli/releases/download/v2.34.3/supabase_2.34.3_linux_amd64.deb
sudo dpkg -i /tmp/sb.deb
mkdir -p ~/sbtest && cd ~/sbtest && supabase init --force && supabase start   # first run pulls images, ~2-4 min
```

Then, from the repo root:

```bash
docker exec -i supabase_db_sbtest psql -U postgres -d postgres < src/lib/supabase/schema.sql
```

Write `.env.local` with the printed local API URL / anon key / service_role key and a
`SUPER_ADMIN_EMAIL` you control (must end in `@gmail.com` — the sign-in form rejects other domains).

Note: `supabase stop --no-backup` **wipes the DB and the mailbox** — re-apply schema and seeds after any restart.
Add your app origin to `additional_redirect_urls` in `~/sbtest/supabase/config.toml` if the magic link
redirect is rejected.

## Signing in (Gmail OTP, no password auth)

1. Open `http://localhost:3000/auth`, type a `@gmail.com` address, click "Send sign-in link".
2. Read the magic link from the local mail catcher (Mailpit, port 54324 — despite the container being
   named `supabase_inbucket_*`, the API is Mailpit's):
   `curl -s http://127.0.0.1:54324/api/v1/messages` then
   `curl -s http://127.0.0.1:54324/api/v1/message/<ID>` and extract the
   `http://127.0.0.1:54321/auth/v1/verify?...` URL (unescape `&amp;`).
3. Paste that URL in the browser → it lands on `/dashboard` with a session.

Roles: the email equal to `SUPER_ADMIN_EMAIL` becomes `super_admin`; every other sign-in becomes `guest`
(`src/app/auth/callback/route.ts`). To get `merchant` / `finance_admin`, update `public.profiles.role`
directly in SQL. **`reseller` no longer needs SQL** — submitting the reseller apply form sets
`profiles.role='reseller'` for you (`src/app/api/resellers/apply/route.ts`).

### Testing multiple roles simultaneously

Many flows (e.g. applicant + reviewing admin) need two live sessions. Use a normal Chrome window for
one account and an **incognito** window for the other. All incognito windows share one session, so to
swap the second account you must **close the incognito window entirely** (which clears its cookies) and
open a fresh one — there is no sign-out control in the dashboard UI.

Mailpit accumulates every magic link, so filter by recipient rather than taking the newest message:

```bash
ID=$(curl -s http://127.0.0.1:54324/api/v1/messages | python3 -c "import sys,json;m=json.load(sys.stdin)['messages'];print([x['ID'] for x in m if 'THE_ADDRESS' in json.dumps(x)][0])")
curl -s http://127.0.0.1:54324/api/v1/message/$ID | python3 -c "
import sys,json,re,html
t=json.load(sys.stdin);b=t.get('HTML') or t.get('Text')
print(html.unescape(re.findall(r'http://127.0.0.1:54321/auth/v1/verify[^\"\s<]+', b)[0]))"
```

## Gotcha: use `localhost`, not `127.0.0.1`

At `http://127.0.0.1:3000` Next.js dev blocks `/_next/webpack-hmr` as cross-origin and client-side
buttons silently do nothing (no console error). Always drive the app at `http://localhost:3000`
(or add `allowedDevOrigins: ['127.0.0.1']` to `next.config.ts`).

## `schema.sql` is flat and idempotent — re-apply it after pulling any branch

`src/lib/supabase/schema.sql` is a single idempotent file (not numbered migrations), and branches change
it substantially — including dropping/recreating RPCs such as `place_order`. **Always re-apply it before
testing a new branch**, otherwise new tables/columns/signatures are missing and features fail in
confusing ways. It is safe to re-run over an existing DB and does not wipe data:

```bash
docker exec -i supabase_db_sbtest psql -U postgres -d postgres < src/lib/supabase/schema.sql
```

After applying, sanity-check what the branch added, e.g. `\d resellers`, `\d customers`, and confirm the
expected RPC arity with `\df place_order`.

## Seed data you need for the golden path

- a `profiles` row + `merchants` row with `status='verified'`
- `products` with `status='active'` (only active products appear on `/products`)
- Commissions: as of the reseller module, **UI checkout does create commissions** — an approved reseller
  checking out for one of their customers inserts a pending `commissions` row at a flat 10% inside
  `place_order`. (Historically `/api/checkout` hardcoded `p_reseller_id: null` and the row had to be
  seeded via SQL; if you see no commission, check whether the caller's `profiles.role` is `reseller` and
  the reseller is `approved`.)

## Reseller / customer-gated checkout flow

The reseller module gates a reseller's cart on a chosen customer. To exercise it end to end through the UI:

1. Sign in a fresh Gmail account → `/dashboard/reseller` shows the "Become a reseller" apply form.
   Only "Full legal name" (≥2 chars) and "Mobile number" (≥7 chars) are required; the Submit button stays
   disabled until both are valid. Submitting sets status `pending`.
2. As an `admin`/`super_admin`, go to `/dashboard/admin` and scroll to **Reseller verification** →
   **Approve** / **Request changes** / **Reject**. The latter two require text in the review-note input
   (enforced both in the route and in the `review_reseller` RPC). Note: when a review call fails, the panel
   replaces the whole list with the error, so the row vanishes until reload.
3. As the approved reseller, `/products` → "Add to cart". `POST /api/cart/items` answers
   `422 {code:"customer_required"}` and the button opens the **Select a customer** modal
   (tabs "Search existing" / "New customer"), then retries with `customerId`. Once the cart is attributed,
   later adds go straight through without the modal.
4. `/cart` and `/checkout` show a "Buying for: <name> · <phone>" pill with **Change**
   (`PATCH /api/cart/customer`), which re-attributes without clearing line items.

Gotchas when testing this:

- **Order of the guards matters.** `/api/cart/items` checks `customer_required` (422) *before*
  `verification_required` (403). So a *pending* reseller still gets the customer modal first, and only
  after picking a customer sees "Your reseller account is not verified yet". Don't mistake the modal for
  proof that the reseller is approved.
- **The refusal text can be hidden behind the modal**: it renders under the product's Add-to-cart button,
  which the modal overlay covers. Dismiss the modal (Cancel) before asserting on it in a screenshot.
- Customer management is deliberately *not* gated on verification — a pending reseller can build their
  customer book, they just cannot add to cart or check out.
- A user with **no** `resellers` row (a plain consumer) is not gated at all: no modal, no "Buying for" pill.
  Use such an account as a control to prove the gate is scoped correctly.
- The customer modal's fields are placeholder-only (`Name`, `Phone number`, `Email (optional)`, …) and the
  modal is vertically centered, so it shifts as content changes. Re-screenshot before clicking a field —
  it is easy to type into the wrong input.
- Verify attribution in the DB, not just the pill: an approved reseller's order must have non-null
  `orders.reseller_id` **and** `orders.for_customer_id`, plus a `commissions` row with `status='pending'`
  and `amount_cents = round(total_cents * 0.10)`.
- `customers.reseller_id` is immutable (trigger `customers_freeze_reseller`); there is no customer transfer.

## UI paths

- Storefront: `/products` → "Add to cart" (now shows an "Added to cart ✓" state that reverts after ~2s —
  screenshot within a second or verify via `/cart`) → `/cart` → `/checkout` → "Place order" → `/orders/<id>`
- Reseller: `/dashboard/reseller` — apply form when there is no reseller row, otherwise a status banner
  (+ reviewer note), Customers / Pending commission / Wallet KPIs, a "Browse catalog" link that appears
  only when `approved`, and the Customer book panel with "Add customer".
- Dashboards: sidebar Overview / Merchants / Reseller / Finance / Admin. Non-permitted roles get an
  "Access restricted" panel; unauthenticated users are redirected to `/auth` by `dashboard/layout.tsx`.
- Finance: "Approve & credit wallet" on a pending commission → status `approved` + a `credit` wallet-ledger row.
- Admin: "Mark fulfilled" on an order, "Suspend" on a merchant, audit trail below.
- `POST /api/upload` has **no UI caller** anywhere in `src/` — it can't be tested through the UI.
- The dashboard topbar user chip is driven by `dashboard/layout.tsx`: it prefers `profiles.full_name` and
  only falls back to the email local-part. Since sign-up populates `full_name` with the email address, a
  freshly created account's chip shows the **full email**, not just the local-part. (It used to be a
  hardcoded "Aubrey" — if you ever see that string, the chip regressed.)
