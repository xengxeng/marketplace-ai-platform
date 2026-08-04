-- Run this against an existing Supabase project (schema.sql already contains
-- the same objects for fresh installs). Safe to run more than once.

-- 1. Widen the orders status chain.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','paid','confirmed','processing','shipped','delivered','fulfilled','cancelled'));

-- 2. Append-only audit trail of every transition.
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_created_idx
  on public.order_status_history (order_id, created_at);

alter table public.order_status_history enable row level security;

drop policy if exists "order_status_history_select_participant" on public.order_status_history;
create policy "order_status_history_select_participant" on public.order_status_history for select using (
  order_id in (select id from public.orders where customer_id = auth.uid() or reseller_id = auth.uid())
);

drop policy if exists "order_status_history_select_staff" on public.order_status_history;
create policy "order_status_history_select_staff" on public.order_status_history for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'finance_admin'))
);

drop policy if exists "order_status_history_insert_admin" on public.order_status_history;
create policy "order_status_history_insert_admin" on public.order_status_history for insert with check (
  changed_by = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
);
