-- Adds the shipping address captured at checkout and widens place_order to
-- persist it. Safe to run more than once.

alter table public.orders add column if not exists shipping_address text;

-- The old 2-arg signature is dropped so `rpc('place_order', {...})` can never
-- resolve to a version that silently discards the address.
drop function if exists public.place_order(uuid, uuid);

create or replace function public.place_order(
  p_customer_id uuid,
  p_reseller_id uuid default null,
  p_shipping_address text default null
)
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
  v_commission_rate numeric := 0.10;
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

  insert into public.orders (customer_id, reseller_id, status, total_cents, shipping_address)
  values (p_customer_id, p_reseller_id, 'pending', 0, nullif(btrim(coalesce(p_shipping_address, '')), ''))
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

grant execute on function public.place_order(uuid, uuid, text) to authenticated;
