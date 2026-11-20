-- Apply after the base schema and world inventory. Browser roles only read.
alter table public.entitlements add column if not exists card_id text
  check(card_id is null or card_id ~ '^growth-(C|R|S|SR|SSR)$');
alter table public.entitlements add column if not exists payment_intent_id text;
alter table public.entitlements add column if not exists revoked_at timestamptz;
create unique index if not exists entitlements_payment_intent on public.entitlements(payment_intent_id) where payment_intent_id is not null;
create index if not exists entitlements_owner_card on public.entitlements(user_id,card_id);
grant select,insert,update on public.entitlements to service_role;

-- Keep refund facts even if the refund arrives before purchase fulfillment.
create table if not exists public.payment_refunds (
  payment_intent_id text primary key check(payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
  refunded_at timestamptz not null default now()
);
alter table public.payment_refunds enable row level security;
revoke all on public.payment_refunds from public,anon,authenticated;
grant select,insert on public.payment_refunds to service_role;

create or replace function public.fulfill_card_bundle(p_user uuid,p_session text,p_intent text,p_card text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare purchase public.entitlements; new_id bigint;
begin
  if p_user is null or p_session is null or p_session !~ '^cs_[A-Za-z0-9_]+$'
    or p_intent is null or p_intent !~ '^pi_[A-Za-z0-9]+$'
    or p_card is null or p_card !~ '^growth-(C|R|S|SR|SSR)$' then raise exception 'invalid_purchase'; end if;
  perform pg_advisory_xact_lock(hashtextextended('moojai-payment:'||p_intent,0));
  if exists(select 1 from public.payment_refunds where payment_intent_id=p_intent) then return jsonb_build_object('revoked',true); end if;
  insert into public.entitlements(user_id,product,stripe_session_id,payment_intent_id,card_id,amount_total,currency)
    values(p_user,'cardWallpaper',p_session,p_intent,p_card,4900,'thb')
    on conflict(stripe_session_id) do nothing returning id into new_id;
  select * into purchase from public.entitlements where stripe_session_id=p_session for update;
  if purchase.user_id<>p_user or purchase.card_id is distinct from p_card or purchase.payment_intent_id is distinct from p_intent then raise exception 'purchase_mismatch'; end if;
  if purchase.revoked_at is not null then return jsonb_build_object('revoked',true); end if;
  if new_id is null then return jsonb_build_object('replayed',true,'cardId',p_card); end if;
  insert into public.charm_collection(user_id,card_id,quantity) values(p_user,p_card,1)
    on conflict(user_id,card_id) do update set quantity=public.charm_collection.quantity+1;
  insert into public.world_roster_data(user_id,card_ids)
    select p_user,array_agg(card_id order by card_id) from public.charm_collection where user_id=p_user
    on conflict(user_id) do update set card_ids=excluded.card_ids;
  return jsonb_build_object('replayed',false,'cardId',p_card);
end $$;
revoke all on function public.fulfill_card_bundle(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.fulfill_card_bundle(uuid,text,text,text) to service_role;

create or replace function public.revoke_card_bundle(p_intent text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare purchase public.entitlements;
begin
  if p_intent is null or p_intent !~ '^pi_[A-Za-z0-9]+$' then raise exception 'invalid_purchase'; end if;
  perform pg_advisory_xact_lock(hashtextextended('moojai-payment:'||p_intent,0));
  insert into public.payment_refunds(payment_intent_id) values(p_intent) on conflict do nothing;
  select * into purchase from public.entitlements where payment_intent_id=p_intent for update;
  if not found or purchase.revoked_at is not null then return jsonb_build_object('replayed',true); end if;
  update public.entitlements set revoked_at=now() where id=purchase.id;
  if purchase.card_id is not null then
    -- A purchased duplicate is removed once; other acquired copies remain.
    delete from public.charm_collection where user_id=purchase.user_id and card_id=purchase.card_id and quantity=1;
    update public.charm_collection set quantity=quantity-1 where user_id=purchase.user_id and card_id=purchase.card_id and quantity>1;
    update public.world_roster_data set card_ids=coalesce((select array_agg(card_id order by card_id) from public.charm_collection where user_id=purchase.user_id),'{}') where user_id=purchase.user_id;
  end if;
  return jsonb_build_object('replayed',false);
end $$;
revoke all on function public.revoke_card_bundle(text) from public,anon,authenticated;
grant execute on function public.revoke_card_bundle(text) to service_role;
