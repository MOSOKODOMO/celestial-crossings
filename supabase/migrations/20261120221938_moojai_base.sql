-- MooJai database schema for Supabase. Run once in Supabase → SQL Editor.
-- Phase 2 pet world: run supabase/world.sql after this initial schema.
-- Accounts themselves live in Supabase Auth (auth.users); passwords are hashed by
-- Supabase and never touch this schema. Birth details are never stored.

-- 1. Profiles: one row per account, created automatically on sign-up.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  preferred_language text not null default 'th' check (preferred_language in ('th','en')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Entitlements: what a paid checkout unlocks. Written only by the
--    stripe-webhook Edge Function (service role); users can read their own.
create table if not exists public.entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null,
  stripe_session_id text unique,
  amount_total integer,
  currency text,
  granted_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "Read own entitlements" on public.entitlements for select to authenticated using ((select auth.uid()) = user_id);
-- No insert/update/delete policies: only the service role can write.
revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;
grant select, insert on public.entitlements to service_role;
grant usage, select on sequence public.entitlements_id_seq to service_role;

-- 3. Bug reports from the on-site "Report a problem" button.
--    Anyone may submit; nobody can read them through the public API.
--    Read them in Supabase → Table Editor.
create table if not exists public.bug_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  description text not null check (char_length(description) between 1 and 2000),
  steps text check (char_length(steps) <= 2000),
  contact text check (char_length(contact) <= 200),
  page text check (char_length(page) <= 200),
  language text check (language in ('th','en')),
  details text check (char_length(details) <= 4000),
  status text not null default 'new' check (status in ('new','investigating','fixed','closed'))
);
alter table public.bug_reports enable row level security;
create policy "Anyone can submit a bug report" on public.bug_reports
  for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = auth.uid()));

-- Phase 2 additions. Run AFTER schema.sql; this file is safe to rerun.
-- No collection, draw, or stardust writes are granted to browser roles.
create schema if not exists moojai_private;
revoke all on schema moojai_private from public, anon, authenticated;

create table if not exists public.draw_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{"version":1,"preferences":["love","career"],"cycle":[],"history":[],"total":0}',
  version integer not null default 0 check (version >= 0),
  free_draws_day date, free_draws_used integer not null default 0 check (free_draws_used >= 0),
  credits integer not null default 0 check (credits >= 0)
);
create table if not exists public.charm_collection (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null check (card_id ~ '^(love|career|wealth|wellbeing|connection|growth)-(C|R|S|SR|SSR)$'),
  quantity integer not null check (quantity > 0),
  first_drawn_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
create table if not exists public.draw_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null, result jsonb not null, state jsonb not null,
  created_at timestamptz not null default now(), unique (user_id, request_id)
);
-- Explicit, minimal public projection. The view does not bypass collection RLS.
create table if not exists public.world_roster_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Visitor' check (char_length(display_name) between 2 and 16),
  card_ids text[] not null default '{}'
);
create or replace view public.world_roster with (security_invoker = true) as
select user_id, display_name, card_ids from public.world_roster_data;

create table if not exists public.chat_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('harassment','scam','personal')),
  messages jsonb not null default '[]' check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 10 and octet_length(messages::text) <= 8000),
  created_at timestamptz not null default now(), check (reporter_id <> reported_id)
);
create index if not exists chat_reports_reporter_time on public.chat_reports(reporter_id, created_at desc);
create index if not exists chat_reports_reported on public.chat_reports(reported_id);

create table if not exists moojai_private.world_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  room integer not null check (room > 0), expires_at timestamptz not null
);
create index if not exists world_sessions_room on moojai_private.world_sessions(room, expires_at);
alter table moojai_private.world_sessions enable row level security;
create table if not exists public.world_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ledger jsonb not null default '{"version":1,"earned":0,"spent":0,"lastVisit":"","lastPrayer":"","careDay":"","careCount":0,"glowUntil":0}',
  version integer not null default 0
);
create table if not exists moojai_private.world_actions (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null, result jsonb not null, created_at timestamptz not null default now(),
  primary key(user_id, request_id)
);
alter table moojai_private.world_actions enable row level security;
create table if not exists public.world_lotuses (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  room integer not null, x double precision not null check(x between 80 and 108),
  z double precision not null check(z between 44 and 60), expires_at timestamptz not null
);
create index if not exists world_lotuses_room_expiry on public.world_lotuses(room, expires_at);
create index if not exists world_lotuses_user on public.world_lotuses(user_id);

alter table public.draw_state enable row level security;
alter table public.charm_collection enable row level security;
alter table public.draw_history enable row level security;
alter table public.world_roster_data enable row level security;
alter table public.chat_reports enable row level security;
alter table public.world_state enable row level security;
alter table public.world_lotuses enable row level security;
revoke all on public.draw_state, public.charm_collection, public.draw_history, public.world_roster_data, public.world_roster, public.chat_reports, public.world_state, public.world_lotuses from anon, authenticated;
grant select on public.draw_state, public.charm_collection, public.world_state, public.world_roster_data, public.world_roster, public.world_lotuses to authenticated;
grant insert(reporter_id, reported_id, reason, messages) on public.chat_reports to authenticated;
grant all on public.draw_state, public.charm_collection, public.draw_history, public.world_roster_data, public.chat_reports, public.world_state, public.world_lotuses to service_role;
grant usage, select on all sequences in schema public to service_role;
grant usage, select on sequence public.chat_reports_id_seq to authenticated;
drop policy if exists "Own draw state" on public.draw_state;
create policy "Own draw state" on public.draw_state for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Own collection" on public.charm_collection;
create policy "Own collection" on public.charm_collection for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Own world state" on public.world_state;
create policy "Own world state" on public.world_state for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Signed in roster" on public.world_roster_data;
create policy "Signed in roster" on public.world_roster_data for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "Report as yourself" on public.chat_reports;
create policy "Report as yourself" on public.chat_reports for insert to authenticated with check ((select auth.uid()) = reporter_id);

-- Atomic draw commit: allowance, inventory, guarantee state and audit are one transaction.
create or replace function public.commit_draw(p_user uuid, p_request uuid, p_version integer, p_state jsonb, p_result jsonb, p_allowance integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare s public.draw_state; old public.draw_history; used integer; day date := (now() at time zone 'UTC')::date;
begin
  insert into public.draw_state(user_id) values(p_user) on conflict do nothing;
  select * into s from public.draw_state where user_id=p_user for update;
  select * into old from public.draw_history where user_id=p_user and request_id=p_request;
  if found then return jsonb_build_object('state',old.state,'result',old.result,'replayed',true); end if;
  if s.version <> p_version then raise exception 'version_conflict' using errcode='40001'; end if;
  used := case when s.free_draws_day=day then s.free_draws_used else 0 end;
  if used >= greatest(0,least(100,p_allowance)) and s.credits=0 then raise exception 'daily_limit' using errcode='P0001'; end if;
  if (p_state->>'total')::integer <> (s.state->>'total')::integer+1 or p_result->>'serial' <> p_state->>'total'
     or p_result->>'cardId' !~ '^(love|career|wealth|wellbeing|connection|growth)-(C|R|S|SR|SSR)$' then raise exception 'invalid_draw'; end if;
  update public.draw_state set state=p_state, version=version+1, free_draws_day=day,
    free_draws_used=used+case when used < p_allowance then 1 else 0 end,
    credits=credits-case when used >= p_allowance then 1 else 0 end where user_id=p_user;
  insert into public.charm_collection(user_id,card_id,quantity) values(p_user,p_result->>'cardId',1)
    on conflict(user_id,card_id) do update set quantity=public.charm_collection.quantity+1;
  insert into public.world_roster_data(user_id,card_ids)
    select p_user,array_agg(card_id order by card_id) from public.charm_collection where user_id=p_user
    on conflict(user_id) do update set card_ids=excluded.card_ids;
  insert into public.draw_history(user_id,request_id,result,state) values(p_user,p_request,p_result,p_state);
  return jsonb_build_object('state',p_state,'result',p_result);
end $$;
revoke all on function public.commit_draw(uuid,uuid,integer,jsonb,jsonb,integer) from public, anon, authenticated;
grant execute on function public.commit_draw(uuid,uuid,integer,jsonb,jsonb,integer) to service_role;

-- These narrowly scoped definer functions need a private session table. Every client-callable
-- function checks auth.uid(); the private helper is usable only inside Realtime policies.
create or replace function public.world_join(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); chosen integer := 1;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'signin'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 16 or p_name ~ '[[:cntrl:]]' then raise exception 'invalid_name'; end if;
  perform pg_advisory_xact_lock(771240);
  delete from moojai_private.world_sessions where expires_at < now();
  select room into chosen from moojai_private.world_sessions where user_id=uid;
  if not found then
    chosen:=1;
    while (select count(*) from moojai_private.world_sessions where room=chosen) >= 40 loop chosen:=chosen+1; end loop;
  end if;
  insert into public.world_roster_data(user_id,display_name) values(uid,btrim(p_name)) on conflict(user_id) do update set display_name=excluded.display_name;
  insert into moojai_private.world_sessions(user_id,room,expires_at) values(uid,chosen,now()+interval '12 seconds')
    on conflict(user_id) do update set room=excluded.room,expires_at=excluded.expires_at;
  return jsonb_build_object('room',chosen);
end $$;
create or replace function public.world_touch() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'signin'; end if;
  update moojai_private.world_sessions set expires_at=now()+interval '12 seconds' where user_id=auth.uid() and expires_at>now();
  if not found then raise exception 'session_expired'; end if;
end $$;
create or replace function public.world_leave() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'signin'; end if;
  delete from moojai_private.world_sessions where user_id=auth.uid();
end $$;
create or replace function public.world_members() returns table(user_id uuid,display_name text,card_ids text[])
language sql security definer set search_path = '' as $$
  select r.user_id,r.display_name,r.card_ids from public.world_roster_data r
  join moojai_private.world_sessions s on s.user_id=r.user_id
  where auth.uid() is not null and s.expires_at>now() and s.room=(select a.room from moojai_private.world_sessions a where a.user_id=auth.uid() and a.expires_at>now())
  order by r.user_id limit 40;
$$;
create or replace function moojai_private.world_topic_allowed(topic text, writing boolean, kind text) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from moojai_private.world_sessions s where s.user_id=auth.uid() and s.expires_at>now() and (
   (not writing and (topic='world:lobby-'||s.room or exists(select 1 from moojai_private.world_sessions p where p.room=s.room and p.expires_at>now() and topic='world:lobby-'||s.room||':'||p.user_id)))
   or (writing and kind='presence' and topic='world:lobby-'||s.room)
   or (writing and kind='broadcast' and topic='world:lobby-'||s.room||':'||s.user_id)
 ));
$$;
revoke all on function public.world_join(text), public.world_touch(), public.world_leave(), public.world_members() from public, anon;
grant execute on function public.world_join(text), public.world_touch(), public.world_leave(), public.world_members() to authenticated;
revoke all on function moojai_private.world_topic_allowed(text,boolean,text) from public, anon;
grant usage on schema moojai_private to authenticated;
grant execute on function moojai_private.world_topic_allowed(text,boolean,text) to authenticated;
-- RLS policies validate topics, not user-controlled payload fields.
drop policy if exists "MooJai world read" on realtime.messages;
create policy "MooJai world read" on realtime.messages for select to authenticated
using (moojai_private.world_topic_allowed((select realtime.topic()),false,extension));
drop policy if exists "MooJai world publish" on realtime.messages;
create policy "MooJai world publish" on realtime.messages for insert to authenticated
with check (moojai_private.world_topic_allowed((select realtime.topic()),true,extension));
drop policy if exists "Room lotuses" on public.world_lotuses;
create policy "Room lotuses" on public.world_lotuses for select to authenticated
using (expires_at>now() and moojai_private.world_topic_allowed('world:lobby-'||room,false,'broadcast'));

create or replace function public.commit_world_action(p_user uuid,p_request uuid,p_version integer,p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.world_state; previous jsonb; room_number integer; flower jsonb;
begin
  -- Executable only by service_role; JWT identity is checked in the Edge Function.
  insert into public.world_state(user_id) values(p_user) on conflict do nothing;
  select * into s from public.world_state where user_id=p_user for update;
  select result into previous from moojai_private.world_actions where user_id=p_user and request_id=p_request;
  if found then return previous; end if;
  if s.version<>p_version then raise exception 'version_conflict' using errcode='40001'; end if;
  if jsonb_typeof(p_result->'ledger')<>'object' then raise exception 'invalid_ledger'; end if;
  update public.world_state set ledger=p_result->'ledger',version=version+1 where user_id=p_user;
  flower:=p_result->'lotus';
  if flower is not null then
    select room into room_number from moojai_private.world_sessions where user_id=p_user and expires_at>now();
    if not found then raise exception 'session_expired'; end if;
    delete from public.world_lotuses where expires_at<now();
    insert into public.world_lotuses(id,user_id,room,x,z,expires_at) values((flower->>'key')::uuid,p_user,room_number,(flower->>'x')::float8,(flower->>'z')::float8,to_timestamp((flower->>'expires')::double precision/1000));
  end if;
  insert into moojai_private.world_actions(user_id,request_id,result) values(p_user,p_request,p_result);
  return p_result;
end $$;
revoke all on function public.commit_world_action(uuid,uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.commit_world_action(uuid,uuid,integer,jsonb) to service_role;

