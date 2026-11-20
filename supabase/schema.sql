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
create policy "Read own entitlements" on public.entitlements for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role can write.

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
