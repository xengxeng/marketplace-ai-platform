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

-- Platform-owned product taxonomy. Created/edited only by admin/super_admin;
-- merchants select from this tree. Seeded with the v1 food categories.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.categories (name, slug, sort_order) values
  ('All', 'all', 0),
  ('Fresh Produce', 'fresh-produce', 1),
  ('Meat & Seafood', 'meat-seafood', 2),
  ('Dairy & Eggs', 'dairy-eggs', 3),
  ('Bakery', 'bakery', 4),
  ('Pantry Staples', 'pantry-staples', 5),
  ('Beverages', 'beverages', 6),
  ('Snacks', 'snacks', 7)
on conflict (slug) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  category_id uuid references public.categories(id),
  name text not null,
  description text,
  category text,
  sku text,
  compare_at_price_cents bigint,
  image_url text,
  price_cents bigint not null default 0,
  stock_int bigint not null default 0,
  low_stock_threshold bigint not null default 5,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  reseller_id uuid references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending','paid','confirmed','processing','shipped','delivered','cancelled','refunded')),
  total_cents bigint not null default 0,
  tracking_number text,
  carrier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only audit trail for every order status transition. A row is
-- written atomically with each orders.status change (see transition_order()).
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references public.profiles(id),
  actor_role text not null default 'system',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_idx
  on public.order_status_history (order_id, created_at);

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

alter table public.categories enable row level security;

drop policy if exists "categories_select_active" on public.categories;
create policy "categories_select_active" on public.categories for select using (is_active = true);
drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all" on public.categories for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
);

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
-- Merchants can see orders that contain their own products (via the
-- order_items -> products -> merchants ownership chain).
drop policy if exists "orders_select_merchant" on public.orders;
create policy "orders_select_merchant" on public.orders for select using (
  exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    join public.merchants m on m.id = p.merchant_id
    where oi.order_id = orders.id and m.owner_id = auth.uid()
  )
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
-- Merchants can read order_items for orders that contain their own products.
drop policy if exists "order_items_select_merchant" on public.order_items;
create policy "order_items_select_merchant" on public.order_items for select using (
  exists (
    select 1
    from public.products p
    join public.merchants m on m.id = p.merchant_id
    where p.id = order_items.product_id and m.owner_id = auth.uid()
  )
);

-- Atomic checkout: validates stock, creates order + order_items, decrements stock,
-- marks the cart converted, and (if placed through a reseller) records a pending
-- commission. SECURITY DEFINER because it performs a multi-table transaction on
-- the caller's behalf; it re-implements the authorization check itself below.
create or replace function public.place_order(p_customer_id uuid, p_reseller_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
  v_order_id uuid;
  v_total_cents bigint := 0;
  v_item record;
  v_commission_rate numeric := 0.10; -- flat platform-default rate (MVP; no tiered commission_rules table yet)
  v_commission_cents bigint;
begin
  if p_customer_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  select id into v_cart_id from public.carts where customer_id = p_customer_id and status = 'active';
  if v_cart_id is null then
    raise exception 'no active cart';
  end if;

  if not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception 'cart is empty';
  end if;

  insert into public.orders (customer_id, reseller_id, status, total_cents)
  values (p_customer_id, p_reseller_id, 'pending', 0)
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

  if p_reseller_id is not null then
    v_commission_cents := round(v_total_cents * v_commission_rate);

    insert into public.commissions (order_id, reseller_id, amount_cents, status)
    values (v_order_id, p_reseller_id, v_commission_cents, 'pending');
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(uuid, uuid) to authenticated;

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

-- Order status history: append-only audit trail. Readable by anyone who can
-- read the parent order (customer/reseller via order ownership, merchant via
-- the product chain, staff via admin/finance roles).

alter table public.order_status_history enable row level security;

drop policy if exists "order_status_history_select_via_order" on public.order_status_history;
create policy "order_status_history_select_via_order" on public.order_status_history for select using (
  order_id in (
    select o.id from public.orders o
    where auth.uid() = o.customer_id or auth.uid() = o.reseller_id
  )
);
drop policy if exists "order_status_history_select_merchant" on public.order_status_history;
create policy "order_status_history_select_merchant" on public.order_status_history for select using (
  exists (
    select 1
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    join public.merchants m on m.id = p.merchant_id
    where oi.order_id = order_status_history.order_id and m.owner_id = auth.uid()
  )
);
drop policy if exists "order_status_history_select_admin" on public.order_status_history;
create policy "order_status_history_select_admin" on public.order_status_history for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'finance_admin'))
);

-- Single, audited path for order status transitions. Validates the caller's
-- role against the state machine, updates orders.status, writes an atomic
-- order_status_history row, restocks inventory on cancel/refund, and inserts
-- a notification to the order's customer. SECURITY DEFINER because it spans
-- several RLS-protected tables; it re-implements authorization itself.
create or replace function public.transition_order(
  p_order_id uuid,
  p_to_status text,
  p_note text default null,
  p_tracking_number text default null,
  p_carrier text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_order record;
  v_from_status text;
  v_allowed boolean := false;
  v_history_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'not authorized';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  v_from_status := v_order.status;

  -- State machine: only legal forward transitions are allowed.
  if v_from_status = 'pending' then
    v_allowed := p_to_status in ('paid', 'confirmed', 'cancelled');
  elsif v_from_status = 'paid' then
    v_allowed := p_to_status in ('confirmed', 'fulfilled', 'cancelled');
  elsif v_from_status = 'confirmed' then
    v_allowed := p_to_status in ('processing', 'cancelled');
  elsif v_from_status = 'processing' then
    v_allowed := p_to_status in ('shipped', 'cancelled');
  elsif v_from_status = 'shipped' then
    v_allowed := p_to_status in ('delivered', 'cancelled');
  elsif v_from_status = 'delivered' then
    v_allowed := p_to_status in ('refunded');
  else
    v_allowed := false;
  end if;

  if not v_allowed then
    raise exception 'INVALID_TRANSITION: % to %', v_from_status, p_to_status;
  end if;

  -- Role-to-transition matrix.
  if v_role in ('admin', 'super_admin') then
    -- admin can perform any legal transition
    null;
  elsif v_role = 'finance_admin' then
    if p_to_status not in ('refunded', 'cancelled') then
      raise exception 'TRANSITION_NOT_ALLOWED_FOR_ROLE';
    end if;
  elsif v_role = 'merchant' then
    -- merchant owner can move their own orders along the fulfillment chain
    if p_to_status not in ('confirmed', 'processing', 'shipped', 'cancelled') then
      raise exception 'TRANSITION_NOT_ALLOWED_FOR_ROLE';
    end if;
    if not exists (
      select 1
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      join public.merchants m on m.id = p.merchant_id
      where oi.order_id = p_order_id and m.owner_id = auth.uid()
    ) then
      raise exception 'ORDER_NOT_FOUND';
    end if;
  elsif v_role = 'reseller' then
    -- reseller can only cancel their own pending orders
    if p_to_status <> 'cancelled' or v_order.reseller_id <> auth.uid() or v_from_status <> 'pending' then
      raise exception 'TRANSITION_NOT_ALLOWED_FOR_ROLE';
    end if;
  else
    raise exception 'TRANSITION_NOT_ALLOWED_FOR_ROLE';
  end if;

  -- Tracking info is required when marking an order shipped.
  if p_to_status = 'shipped' and (p_tracking_number is null or p_carrier is null) then
    raise exception 'MISSING_TRACKING_INFO';
  end if;

  update public.orders
  set status = p_to_status,
      tracking_number = coalesce(p_tracking_number, tracking_number),
      carrier = coalesce(p_carrier, carrier),
      updated_at = now()
  where id = p_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, actor_id, actor_role, note)
  values (p_order_id, v_from_status, p_to_status, auth.uid(), v_role, p_note)
  returning id into v_history_id;

  -- Restock inventory when an order is cancelled or refunded.
  if p_to_status in ('cancelled', 'refunded') then
    update public.products p
    set stock_int = p.stock_int + oi.quantity,
        updated_at = now()
    from public.order_items oi
    where oi.order_id = p_order_id and p.id = oi.product_id;
  end if;

  -- Notify the customer about the status change.
  if v_order.customer_id is not null then
    insert into public.notifications (recipient_id, title, body, link)
    values (
      v_order.customer_id,
      'Order ' || p_to_status,
      'Your order ' || p_order_id || ' is now ' || p_to_status || '.',
      '/orders/' || p_order_id
    );
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'from_status', v_from_status,
    'to_status', p_to_status,
    'history_id', v_history_id
  );
end;
$$;

grant execute on function public.transition_order(uuid, text, text, text, text) to authenticated;
