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
(`src/app/auth/callback/route.ts`). To get `merchant` / `reseller` / `finance_admin`, update
`public.profiles.role` directly in SQL.

## Gotcha: use `localhost`, not `127.0.0.1`

At `http://127.0.0.1:3000` Next.js dev blocks `/_next/webpack-hmr` as cross-origin and client-side
buttons silently do nothing (no console error). Always drive the app at `http://localhost:3000`
(or add `allowedDevOrigins: ['127.0.0.1']` to `next.config.ts`).

## Seed data you need for the golden path

- a `profiles` row + `merchants` row with `status='verified'`
- `products` with `status='active'` (only active products appear on `/products`)
- for the commission/wallet flow: an `orders` row with a non-null `reseller_id` and a `commissions` row with
  `status='pending'`. **UI checkout cannot create commissions** — `/api/checkout` hardcodes
  `p_reseller_id: null`, so seed the commission via SQL.

## UI paths

- Storefront: `/products` → "Add to cart" (no visible feedback; verify via `/cart`) → `/cart` → `/checkout`
  → "Place order" → `/orders/<id>`
- Dashboards: sidebar Overview / Merchants / Reseller / Finance / Admin. Non-permitted roles get an
  "Access restricted" panel; unauthenticated users are redirected to `/auth` by `dashboard/layout.tsx`.
- Finance: "Approve & credit wallet" on a pending commission → status `approved` + a `credit` wallet-ledger row.
- Admin: "Mark fulfilled" on an order, "Suspend" on a merchant, audit trail below.
- `POST /api/upload` has **no UI caller** anywhere in `src/` — it can't be tested through the UI.
