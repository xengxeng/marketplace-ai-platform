# FOODIFY / Marketplace-AI — Business Process & Layout Overview

This document explains **how the business is supposed to work**, according to
the 40-document specification (`Marketplace-AI-Specification/`). It is
written for a founder, not an engineer — plain language, short sentences,
tables instead of paragraphs where possible.

**Important:** this document describes the *plan*, not what is currently
built. For "what actually exists in the code today," see
`IMPLEMENTATION_CHECKLIST.md` in this same folder. Almost none of what is
described below is functional yet — this is the blueprint the team is
building toward.

---

## 1. Roles overview

Everyone who touches the platform is one of seven roles. Every account starts
as a `guest` the moment someone signs in — no one applies to be a guest, it's
just the default. From there, a person can choose to become a seller
(`merchant_owner`), an agent (`reseller`), or stay a shopper.

| Role | Who they are | What they can do (plain language) |
|---|---|---|
| **guest** | Anyone who signs in with Gmail but hasn't applied to sell or resell anything. Includes ordinary shoppers. | Browse and buy products directly, like any online store. No approval needed to shop. |
| **reseller** | An independent sales agent — think of a *sari-sari* store owner or a Messenger-based seller who takes orders from real customers and places them through Foodify on their behalf. | Once approved: builds a customer list, sells to those customers, earns a commission on every sale, withdraws that commission as cash. Before approval: can still explore, prepare their customer list, and browse the catalog — just can't sell yet. |
| **merchant_staff** | An employee of a merchant, invited by the merchant owner (never signs up on their own). | Helps run the store — e.g., fulfill orders, manage stock — with only the permissions the owner explicitly switches on for them. Never has access to the store's money by default. |
| **merchant_owner** | A business that registers to sell products directly on Foodify. | Once approved: lists products, fulfills orders, invites staff, withdraws sales proceeds. Before approval: can still prepare their whole product catalog in draft — it just can't go live yet. |
| **finance_admin** | Platform staff whose whole job is money — never added by self-signup, only invited by an admin. | Reviews and approves withdrawals, refunds, and top-ups; watches over the company's books; has zero access to products or staff management (money and catalog are kept separate on purpose). |
| **admin** | Platform staff who run day-to-day operations — also invite-only. | Approves or rejects merchant/reseller applications, resolves disputes, moderates the catalog, sees everything operationally — but cannot touch platform-wide settings or move money directly. |
| **super_admin** | The platform owner(s) — the very first one is set up manually when the system launches; all others are invited by an existing super_admin. | Sees and controls everything: platform settings, fees, commission rules, maintenance mode, and can grant `admin`/`finance_admin` roles to other people. The only role that can create another super_admin. |

**Two important habits to remember, because they explain almost every rule in
this document:**

1. **Signing up never blocks anyone from looking around.** A brand-new
   merchant or reseller can log in and see their full dashboard immediately —
   no waiting screen. What's blocked until they're *approved* is specifically
   the money-and-inventory parts: publishing a product live, completing a
   sale, or withdrawing money.
2. **One account = one role.** A person can't be both a reseller and a
   merchant owner on the same Gmail account in version 1 — they'd need a
   second account for the second role.

---

## 2. End-to-end commerce flow (the story)

This is the journey money and goods take through the platform, from a
merchant joining to a customer receiving their order to everyone getting
paid.

### Part A — Getting a merchant on board

1. **Someone signs in with Gmail.** There are no passwords anywhere on this
   platform — ever. You type your email, get a one-time code (or a
   click-through link), and you're in.
2. On their first login, they land as a plain **guest**. From there they can
   choose: "Shop as Guest," "Become a Reseller," or "Register a Merchant
   Business."
3. If they choose **Register a Merchant**, they fill out a form: business
   name, description, address, and business type — then upload five things:
   a Business Permit, a DTI-or-SEC registration, a BIR registration, a
   business logo, and complete business information.
4. The moment they submit, their account role becomes `merchant_owner` and
   their verification status becomes **pending**. They can immediately start
   building their product catalog in draft — but nothing is visible to the
   public yet.
5. **An admin reviews the documents** (this is a human review, not
   automatic) and decides: **Approved**, **Rejected** (with a reason —
   application ends here, they'd need to contact support), or
   **Resubmission Required** (something specific needs fixing, like a blurry
   scan — they can just re-upload that one item and resubmit).
6. Once **approved**, the merchant can publish products to the live
   marketplace and, eventually, withdraw money from their wallet.

### Part B — Getting a reseller on board

1. Same Gmail sign-in. This time they choose "Become a Reseller."
2. They submit: full legal name, a government ID, a selfie holding that ID,
   their address, and their phone number.
3. Role becomes `reseller` immediately; verification status is **pending**.
   While pending, they can already build their customer list (see below) —
   they just can't complete a sale yet.
4. An admin reviews and decides Approved / Rejected / Resubmission Required —
   same three outcomes as the merchant flow.
5. Once **approved**, the reseller can start actually selling to their
   customers and earning commission.

### Part C — A reseller makes a sale (the defining feature of this platform)

This is what makes Foodify different from a normal online store: a reseller
never sells "for themselves" — every sale is on behalf of a specific,
named customer.

1. The reseller browses the same product catalog any shopper sees.
2. The moment they click **"Add to Cart"** or **"Buy Now,"** a pop-up called
   the **Customer Selection Modal** forces them to either pick an existing
   customer from their own list or create a new one on the spot (name,
   phone, address). There is no way around this step — it's built into the
   system at every level, not just something the screen shows.
3. That customer stays "attached" to the cart for the rest of the shopping
   session, so the reseller doesn't have to repeat the step for every item.
4. At checkout, the order is delivered either to that customer's saved
   address or to an address the reseller specifies themselves (e.g., their
   own pickup point).
5. Payment options: Cash on Delivery, GCash, Bank Transfer, Wallet Balance —
   or, uniquely for resellers, "I'll collect payment from the customer
   myself," which is really Cash on Delivery with the reseller marked as the
   collector.
6. The order is placed. The reseller's estimated commission is shown, clearly
   labeled "estimated — finalized on delivery."

### Part D — What happens after an order is placed

1. The order starts as **pending**.
2. The merchant reviews and accepts it → **confirmed**.
3. The merchant prepares it → **processing**.
4. The merchant ships it (with a tracking number) → **shipped**.
5. The customer confirms they received it (or, if 3 days pass with no
   confirmation, the system auto-confirms) → **delivered**.
6. **`delivered` is the single most important moment in this whole system.**
   The instant an order reaches `delivered`, two things happen automatically,
   in the same instant, so they can never happen one without the other:
   - The merchant's share of the sale is released from an "escrow" holding
     state into their spendable wallet balance.
   - If the order was reseller-generated, the reseller's commission is
     calculated and credited to their wallet.
7. An order can also end in **cancelled** (before shipping — inventory goes
   back into stock, no money has moved yet since money only moves at
   delivery) or **refunded** (after delivery — see Part F below).

### Part E — How commission is actually calculated

Commission isn't a flat percentage across the whole platform — it's resolved
per product, with a fallback chain:

1. Does this exact **product** have its own special commission rule? Use it.
2. If not, does this product's **category** have a rule? Use it.
3. If not, fall back to the **platform-wide default rate**.

On top of whichever rate applies, the reseller's **performance tier** adds a
boost:

| Tier | Requirement (trailing 30-day sales) | Commission boost |
|---|---|---|
| Bronze | ₱0+ | ×1.00 (no boost) |
| Silver | ₱25,000+ | ×1.10 (10% more) |
| Gold | ₱100,000+ | ×1.25 (25% more) |

Tiers are recalculated automatically every night based on the last 30 days of
sales — nobody manually assigns a tier.

If an order is later refunded or cancelled, the commission that was paid on
it is **reversed** — the platform never edits the original record, it adds a
new "reversing" entry, so the full history (what was paid, then taken back)
is always visible and provable.

### Part F — How money actually gets paid out

1. **Nothing is ever just a number in a column.** Every single change to a
   wallet balance — a sale, a commission, a refund, a withdrawal — is written
   as its own permanent, unchangeable line in a ledger. A wallet's "balance"
   is just the sum of all its ledger lines added up. This means the platform
   can always prove, line by line, how any balance was reached — the same
   principle a bank uses.
2. When a merchant or approved reseller wants their money, they submit a
   **withdrawal request** with their bank or GCash details.
3. **Small withdrawals** (₱25,000 or less by default) need approval from one
   `finance_admin`.
4. **Larger withdrawals** need approval from a `finance_admin` **and** a
   separate sign-off from an `admin` or `super_admin` — two different people
   have to agree before a large sum leaves the platform.
5. Once approved, `finance_admin` actually sends the money externally and
   uploads proof (a reference number or screenshot) before the withdrawal is
   marked **paid**.
6. **Top-ups** (someone adding money into their own wallet) work in reverse:
   they upload proof of payment, and `finance_admin` checks that the amount
   matches exactly before crediting the wallet.
7. Every night, the system automatically double-checks that every wallet's
   displayed balance matches what its ledger actually adds up to. Any
   mismatch — even one centavo — raises an alert for finance staff to
   investigate. This is a built-in safety net against bugs or fraud.

---

## 3. Approval & verification gates — every point a human has to say yes

| # | Gate | Who requests it | Who approves it | What it unlocks |
|---|---|---|---|---|
| 1 | Merchant verification | `merchant_owner`, on onboarding submission | `admin` or `super_admin` | Publishing products live, receiving payouts |
| 2 | Reseller verification | `reseller`, on onboarding submission | `admin` or `super_admin` | Completing sales, earning commission, requesting withdrawals |
| 3 | Withdrawal (small, ≤ ₱25,000) | `merchant_owner` or `reseller` | One `finance_admin` | Money leaves the platform to the requester's bank/GCash |
| 4 | Withdrawal (large, > ₱25,000) | `merchant_owner` or `reseller` | `finance_admin` **and then** `admin`/`super_admin` (two separate people) | Same as above, extra safeguard for big amounts |
| 5 | Top-up | Anyone adding funds to their wallet | `finance_admin` (must match proof of payment exactly) | Wallet balance increases |
| 6 | Refund | `finance_admin`/`admin` directly, or a merchant requesting on a customer's behalf | `finance_admin`, `admin`, or `super_admin` | Reverses the buyer's payment and any commission already paid on that item |
| 7 | Publishing a product | `merchant_owner` / staff with permission | Automatic, but *only* if the merchant is already approved (gate #1) | Product becomes visible to the public |
| 8 | New platform-staff accounts (`finance_admin`/`admin`) | N/A — never self-service | An existing `admin` or `super_admin` | Grants platform-operations access |
| 9 | New `super_admin` accounts | N/A — never self-service | An existing `super_admin` only | The single most sensitive action in the whole system |
| 10 | Merchant staff invite | `merchant_owner` | Nobody needs to approve it (owner's own decision) — but the invited person still must log in via Gmail OTP to accept | Staff member gets scoped access to that one merchant only |

**The golden rule behind every gate above:** hiding a button on the screen is
never treated as real security. Every one of these gates is re-checked by the
server and by the database itself, every single time — never just trusted
because the screen didn't show the option.

---

## 4. Org / dashboard layout — what each role should see when they log in

This section is "per the spec" — what each dashboard is *designed* to
contain, not what currently exists in the running app.

| Role | Landing page | What their dashboard is built to show |
|---|---|---|
| **guest** | Public marketplace / their own mini dashboard | Browse/search products, their own past orders (if they've bought before), account settings, an invitation to become a merchant or reseller. |
| **reseller** | `/dashboard/reseller` | Their customer list (CRM), a running order pipeline, this month's commission, wallet balance, and — front and center whenever they're not yet approved — a status banner explaining exactly where their application stands and what to do next. |
| **merchant_staff** | `/dashboard/merchant` (a cut-down version) | Only the sections their owner switched on for them — e.g., product management or order fulfillment — with everything else (like the wallet) simply not shown, not just greyed out. |
| **merchant_owner** | `/dashboard/merchant` (full) | Sales summary, low-stock alerts, product catalog management, staff management, order fulfillment, wallet and payout history — plus the same verification status banner reseller sees, worded for merchants. |
| **finance_admin** | `/dashboard/finance` | Platform-wide money view only: total sales value, total commissions paid, total money owed out (liabilities), a queue of pending withdrawal/top-up/refund approvals, and a daily "does the ledger add up" reconciliation report. No product or staff screens appear at all for this role. |
| **admin** | `/dashboard/admin` | Merchant and reseller verification queues, user account management, dispute/complaint handling, content moderation, and a read-only view into the finance ledger (they can see it, but only `finance_admin` can actually move money). |
| **super_admin** | `/dashboard/super-admin` | Everything `admin` and `finance_admin` can see, plus the platform's control room: fee and commission-rate defaults, feature toggles, maintenance-mode switch, platform-wide announcements, and the ability to grant or revoke `admin`/`finance_admin` access. Every change made here is permanently logged. |

**Design intent, in plain terms:** every role's dashboard is supposed to be
purpose-built for that person's actual job — a `finance_admin` should never
see a product-catalog menu item they can't use, and a `reseller` should never
see platform settings. It's not one dashboard with things hidden; each role
effectively gets its own app, built for the seven-role model this platform is
based on. The visual language across every one of those dashboards is meant
to be consistent — same colors, same card style, same motion — so it reads
as one product no matter which of the seven "versions" you're looking at.

---

*Source: read in full from the 41-document specification package
(`00_MASTER_PROMPT.md` through `40_FINAL_CHECKLIST.md`), specifically the
Business Rules, Workflow, and User Flow sections of
`01_PROJECT_OVERVIEW.md`, `08_AUTHENTICATION.md`, `09_USER_ROLES.md`,
`10_PERMISSION_MATRIX.md`, `11_MERCHANT_MODULE.md`, `12_RESELLER_MODULE.md`,
`13_PRODUCT_MODULE.md`, `14_CUSTOMER_MODULE.md`, `15_CART_MODULE.md`,
`16_CHECKOUT_MODULE.md`, `17_ORDER_SYSTEM.md`, `18_WALLET_LEDGER.md`,
`19_COMMISSION_ENGINE.md`, `20_FINANCE_MODULE.md`,
`21_APPROVAL_WORKFLOW.md`, `26_DASHBOARDS.md`, and `27_SUPER_ADMIN.md`.*
