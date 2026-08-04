-- Reseller registry plus the referral lookup used at checkout.
-- Safe to run more than once.

create table if not exists public.resellers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null,
  referral_code text not null unique,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);

alter table public.resellers enable row level security;

drop policy if exists "resellers_select_own" on public.resellers;
create policy "resellers_select_own" on public.resellers for select using (auth.uid() = profile_id);

drop policy if exists "resellers_insert_own" on public.resellers;
create policy "resellers_insert_own" on public.resellers for insert with check (auth.uid() = profile_id);

drop policy if exists "resellers_select_staff" on public.resellers;
create policy "resellers_select_staff" on public.resellers for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'finance_admin'))
);

-- A shopper resolving a referral code is never the reseller who owns the row,
-- so the code lookup goes through a view that bypasses RLS and exposes only
-- active rows and the three columns checkout needs.
create or replace view public.reseller_referrals
  with (security_invoker = false) as
  select referral_code, profile_id, status from public.resellers where status = 'active';

grant select on public.reseller_referrals to authenticated;
