-- Trigger-only signup code must not be callable through the public API.
alter function public.handle_new_user() set search_path='';
revoke all on function public.handle_new_user() from public,anon,authenticated;

alter policy "Read own profile" on public.profiles to authenticated using ((select auth.uid())=id);
alter policy "Update own profile" on public.profiles to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,preferred_language) on public.profiles to authenticated;
grant select,insert,update on public.profiles to service_role;

alter policy "Anyone can submit a bug report" on public.bug_reports with check(status='new' and (user_id is null or user_id=(select auth.uid())));
revoke all on public.bug_reports from anon,authenticated;
grant insert(description,steps,contact,page,language,details,user_id) on public.bug_reports to anon,authenticated;
grant usage on sequence public.bug_reports_id_seq to anon,authenticated;
grant all on public.bug_reports to service_role;
create index if not exists bug_reports_user_id on public.bug_reports(user_id);

-- Keep elevated room operations in the non-exposed schema. Public wrappers run
-- as the caller; each private operation already checks auth.uid() explicitly.
alter function public.world_join(text) set schema moojai_private;
alter function public.world_touch() set schema moojai_private;
alter function public.world_leave() set schema moojai_private;
alter function public.world_members() set schema moojai_private;
create function public.world_join(p_name text) returns jsonb language sql security invoker set search_path='' as $$select moojai_private.world_join(p_name)$$;
create function public.world_touch() returns void language sql security invoker set search_path='' as $$select moojai_private.world_touch()$$;
create function public.world_leave() returns void language sql security invoker set search_path='' as $$select moojai_private.world_leave()$$;
create function public.world_members() returns table(user_id uuid,display_name text,card_ids text[]) language sql security invoker set search_path='' as $$select * from moojai_private.world_members()$$;
revoke all on function public.world_join(text),public.world_touch(),public.world_leave(),public.world_members() from public,anon;
grant execute on function public.world_join(text),public.world_touch(),public.world_leave(),public.world_members() to authenticated;
