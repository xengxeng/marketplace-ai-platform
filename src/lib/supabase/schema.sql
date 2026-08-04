create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'guest' check (role in ('guest','merchant','reseller','finance_admin','admin','super_admin')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  status text not null default 'pending' check (status in ('pending','verified','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  description text,
  category text,
  image_url text,
  price_cents bigint not null default 0,
  stock_int bigint not null default 0,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  reseller_id uuid references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','paid','fulfilled','cancelled')),
  total_cents bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entry_type text not null check (entry_type in ('credit','debit')),
  amount_cents bigint not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reseller_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents bigint not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','paid')),
  created_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','converted','abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists carts_one_active_per_customer
  on public.carts (customer_id)
  where status = 'active';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity int not null check (quantity > 0),
  unit_price_cents bigint not null,
  subtotal_cents bigint not null,
  created_at timestamptz not null default now()
);

-- Row Level Security

alter table public.profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.commissions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "merchants_select_own" on public.merchants;
create policy "merchants_select_own" on public.merchants for select using (auth.uid() = owner_id);
drop policy if exists "merchants_insert_own" on public.merchants;
create policy "merchants_insert_own" on public.merchants for insert with check (auth.uid() = owner_id);
drop policy if exists "merchants_update_own" on public.merchants;
create policy "merchants_update_own" on public.merchants for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "merchants_select_admin" on public.merchants;
create policy "merchants_select_admin" on public.merchants for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
);
drop policy if exists "merchants_update_admin" on public.merchants;
create policy "merchants_update_admin" on public.merchants for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
);
-- Verified status is meant to be publicly checkable (it's a trust badge, and
-- the products verification-gate policy's EXISTS subquery needs to be able
-- to see it for anon/public readers, or every "verified merchant" product
-- silently disappears from browsing).
drop policy if exists "merchants_select_public_verified" on public.merchants;
create policy "merchants_select_public_verified" on public.merchants for select using (status = 'verified');

drop policy if exists "products_select_active_or_own" on public.products;
create policy "products_select_active_or_own" on public.products for select using (
  (status = 'active' and exists (
    select 1 from public.merchants m where m.id = products.merchant_id and m.status = 'verified'
  ))
  or merchant_id in (select id from public.merchants where owner_id = auth.uid())
);
drop policy if exists "products_insert_own" on public.products;
create policy "products_insert_own" on public.products for insert with check (
  merchant_id in (select id from public.merchants where owner_id = auth.uid())
);
drop policy if exists "products_update_own" on public.products;
create policy "products_update_own" on public.products for update using (
  merchant_id in (select id from public.merchants where owner_id = auth.uid())
) with check (
  merchant_id in (select id from public.merchants where owner_id = auth.uid())
);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders for select using (auth.uid() = customer_id or auth.uid() = reseller_id);
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = customer_id);
drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin" on public.orders for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'finance_admin'))
);
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
);

-- Ledger tables are select-only for owners; writes are performed by trusted server-side code only.
drop policy if exists "wallet_ledger_select_own" on public.wallet_ledger;
create policy "wallet_ledger_select_own" on public.wallet_ledger for select using (auth.uid() = profile_id);
drop policy if exists "wallet_ledger_select_admin" on public.wallet_ledger;
create policy "wallet_ledger_select_admin" on public.wallet_ledger for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'finance_admin'))
);

drop policy if exists "commissions_select_own" on public.commissions;
create policy "commissions_select_own" on public.commissions for select using (auth.uid() = reseller_id);

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "carts_select_own" on public.carts;
create policy "carts_select_own" on public.carts for select using (auth.uid() = customer_id);
drop policy if exists "carts_insert_own" on public.carts;
create policy "carts_insert_own" on public.carts for insert with check (auth.uid() = customer_id);
drop policy if exists "carts_update_own" on public.carts;
create policy "carts_update_own" on public.carts for update using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

drop policy if exists "cart_items_select_own" on public.cart_items;
create policy "cart_items_select_own" on public.cart_items for select using (
  cart_id in (select id from public.carts where customer_id = auth.uid())
);
drop policy if exists "cart_items_insert_own" on public.cart_items;
create policy "cart_items_insert_own" on public.cart_items for insert with check (
  cart_id in (select id from public.carts where customer_id = auth.uid())
);
drop policy if exists "cart_items_update_own" on public.cart_items;
create policy "cart_items_update_own" on public.cart_items for update using (
  cart_id in (select id from public.carts where customer_id = auth.uid())
) with check (
  cart_id in (select id from public.carts where customer_id = auth.uid())
);
drop policy if exists "cart_items_delete_own" on public.cart_items;
create policy "cart_items_delete_own" on public.cart_items for delete using (
  cart_id in (select id from public.carts where customer_id = auth.uid())
);

drop policy if exists "order_items_select_via_order" on public.order_items;
create policy "order_items_select_via_order" on public.order_items for select using (
  order_id in (select id from public.orders where customer_id = auth.uid() or reseller_id = auth.uid())
);
drop policy if exists "order_items_insert_via_order" on public.order_items;
create policy "order_items_insert_via_order" on public.order_items for insert with check (
  order_id in (select id from public.orders where customer_id = auth.uid())
);

-- Atomic checkout: validates stock, creates order + order_items, decrements stock,
-- marks the cart converted, and (if placed by an approved reseller on a customer's
-- behalf) records a pending commission. SECURITY DEFINER because it performs a
-- multi-table transaction on the caller's behalf; it re-implements the
-- authorization check itself below.
--
-- Reseller attribution is derived from the caller's own profile and reseller row,
-- never passed in, so a client cannot claim commission for an arbitrary account.
drop function if exists public.place_order(uuid, uuid);

create or replace function public.place_order(p_customer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart record;
  v_cart_id uuid;
  v_order_id uuid;
  v_total_cents bigint := 0;
  v_item record;
  v_role text;
  v_reseller record;
  v_reseller_id uuid;
  v_for_customer_id uuid;
  v_commission_rate numeric := 0.10; -- flat platform-default rate (MVP; no tiered commission_rules table yet)
  v_commission_cents bigint;
begin
  if p_customer_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  select * into v_cart from public.carts where customer_id = p_customer_id and status = 'active';
  if v_cart is null then
    raise exception 'no active cart';
  end if;
  v_cart_id := v_cart.id;

  if not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception 'cart is empty';
  end if;

  select role into v_role from public.profiles where id = p_customer_id;

  if v_role = 'reseller' then
    select * into v_reseller from public.resellers where user_id = p_customer_id;

    if v_reseller is null or v_reseller.verification_status <> 'approved' then
      raise exception 'reseller is not verified';
    end if;

    if v_cart.for_customer_id is null then
      raise exception 'select a customer before checking out';
    end if;

    if not exists (
      select 1 from public.customers c
      where c.id = v_cart.for_customer_id and c.reseller_id = v_reseller.id
    ) then
      raise exception 'customer does not belong to this reseller';
    end if;

    v_reseller_id := p_customer_id;
    v_for_customer_id := v_cart.for_customer_id;
  end if;

  insert into public.orders (customer_id, reseller_id, for_customer_id, status, total_cents)
  values (p_customer_id, v_reseller_id, v_for_customer_id, 'pending', 0)
  returning id into v_order_id;

  for v_item in
    select ci.product_id, ci.quantity, p.price_cents, p.stock_int
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id
    for update of p
  loop
    if v_item.stock_int < v_item.quantity then
      raise exception 'insufficient stock for product %', v_item.product_id;
    end if;

    insert into public.order_items (order_id, product_id, quantity, unit_price_cents, subtotal_cents)
    values (v_order_id, v_item.product_id, v_item.quantity, v_item.price_cents, v_item.price_cents * v_item.quantity);

    update public.products set stock_int = stock_int - v_item.quantity where id = v_item.product_id;

    v_total_cents := v_total_cents + (v_item.price_cents * v_item.quantity);
  end loop;

  update public.orders set total_cents = v_total_cents where id = v_order_id;
  update public.carts set status = 'converted', updated_at = now() where id = v_cart_id;

  if v_reseller_id is not null then
    v_commission_cents := round(v_total_cents * v_commission_rate);

    insert into public.commissions (order_id, reseller_id, amount_cents, status)
    values (v_order_id, v_reseller_id, v_commission_cents, 'pending');
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(uuid) to authenticated;

-- Activity logs

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);

alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs_insert_self" on public.activity_logs;
create policy "activity_logs_insert_self" on public.activity_logs for insert with check (auth.uid() = actor_id);

drop policy if exists "activity_logs_select_admin" on public.activity_logs;
create policy "activity_logs_select_admin" on public.activity_logs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
);

-- Commission approval + wallet crediting

drop policy if exists "commissions_select_admin" on public.commissions;
create policy "commissions_select_admin" on public.commissions for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'finance_admin'))
);

create or replace function public.approve_commission(p_commission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_commission record;
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role not in ('admin', 'super_admin', 'finance_admin') then
    raise exception 'not authorized';
  end if;

  select * into v_commission from public.commissions where id = p_commission_id for update;

  if v_commission is null then
    raise exception 'commission not found';
  end if;

  if v_commission.status <> 'pending' then
    raise exception 'commission is already %', v_commission.status;
  end if;

  update public.commissions set status = 'approved' where id = p_commission_id;

  insert into public.wallet_ledger (profile_id, entry_type, amount_cents, reason)
  values (v_commission.reseller_id, 'credit', v_commission.amount_cents, 'commission for order ' || v_commission.order_id);
end;
$$;

grant execute on function public.approve_commission(uuid) to authenticated;

-- Storage: public "uploads" bucket used by /api/upload. Public read (files
-- are served by direct URL once uploaded), authenticated-only write.

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

drop policy if exists "uploads_public_read" on storage.objects;
create policy "uploads_public_read" on storage.objects for select using (bucket_id = 'uploads');

drop policy if exists "uploads_authenticated_insert" on storage.objects;
create policy "uploads_authenticated_insert" on storage.objects for insert with check (
  bucket_id = 'uploads' and auth.role() = 'authenticated'
);

-- Notifications

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = recipient_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create or replace function public.notify(p_recipient_id uuid, p_title text, p_body text, p_link text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role not in ('admin', 'super_admin', 'finance_admin') then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (recipient_id, title, body, link)
  values (p_recipient_id, p_title, p_body, p_link)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.notify(uuid, text, text, text) to authenticated;

-- Resellers and their customer book (CRM-lite)

create table if not exists public.resellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  full_name text not null,
  phone_number text not null,
  address_line text,
  address_city text,
  address_province text,
  address_postal_code text,
  verification_status text not null default 'pending'
    check (verification_status in ('unverified','pending','approved','rejected','resubmission_required')),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.resellers(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  address_line text,
  address_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_reseller_idx on public.customers (reseller_id, created_at desc);

-- "Buying for": the customer a reseller-authored cart/order is attributed to.
-- Distinct from carts.customer_id / orders.customer_id, which are the signed-in
-- account that owns the record.
alter table public.carts add column if not exists for_customer_id uuid references public.customers(id) on delete set null;
alter table public.orders add column if not exists for_customer_id uuid references public.customers(id) on delete set null;

alter table public.resellers enable row level security;
alter table public.customers enable row level security;

drop policy if exists "resellers_select_own" on public.resellers;
create policy "resellers_select_own" on public.resellers for select using (auth.uid() = user_id);
drop policy if exists "resellers_insert_own" on public.resellers;
create policy "resellers_insert_own" on public.resellers for insert with check (auth.uid() = user_id);
drop policy if exists "resellers_update_own" on public.resellers;
create policy "resellers_update_own" on public.resellers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "resellers_select_admin" on public.resellers;
create policy "resellers_select_admin" on public.resellers for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
);
drop policy if exists "resellers_update_admin" on public.resellers;
create policy "resellers_update_admin" on public.resellers for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
);

-- A customer belongs to exactly one reseller and is never visible to another.
drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own" on public.customers for select using (
  reseller_id in (select id from public.resellers where user_id = auth.uid())
);
drop policy if exists "customers_insert_own" on public.customers;
create policy "customers_insert_own" on public.customers for insert with check (
  reseller_id in (select id from public.resellers where user_id = auth.uid())
);
drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own" on public.customers for update using (
  reseller_id in (select id from public.resellers where user_id = auth.uid())
) with check (
  reseller_id in (select id from public.resellers where user_id = auth.uid())
);

-- reseller_id is set once at creation and is immutable (no customer transfer in v1).
create or replace function public.customers_freeze_reseller()
returns trigger
language plpgsql
as $$
begin
  if new.reseller_id <> old.reseller_id then
    raise exception 'customers.reseller_id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists customers_freeze_reseller on public.customers;
create trigger customers_freeze_reseller before update on public.customers
  for each row execute function public.customers_freeze_reseller();

-- Reseller verification review, mirroring the merchant verification loop.
create or replace function public.review_reseller(p_reseller_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_reseller record;
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role not in ('admin', 'super_admin') then
    raise exception 'not authorized';
  end if;

  if p_status not in ('approved', 'rejected', 'resubmission_required') then
    raise exception 'invalid status %', p_status;
  end if;

  if p_status <> 'approved' and coalesce(btrim(p_note), '') = '' then
    raise exception 'a review note is required to reject or request resubmission';
  end if;

  select * into v_reseller from public.resellers where id = p_reseller_id for update;

  if v_reseller is null then
    raise exception 'reseller not found';
  end if;

  update public.resellers
  set verification_status = p_status, review_note = p_note, updated_at = now()
  where id = p_reseller_id;

  perform public.notify(
    v_reseller.user_id,
    case p_status
      when 'approved' then 'Reseller verification approved'
      when 'rejected' then 'Reseller verification rejected'
      else 'Reseller verification needs changes'
    end,
    case p_status
      when 'approved' then 'You can now check out on behalf of your customers and earn commission.'
      else coalesce(p_note, 'Please review your submission.')
    end,
    '/dashboard/reseller'
  );
end;
$$;

grant execute on function public.review_reseller(uuid, text, text) to authenticated;
