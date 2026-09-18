-- Phase 1 authorization hardening: role elevation cannot be performed by browser clients.
create or replace function public.enforce_profile_role() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'health_worker' then new.role := 'patient'; end if;
    if new.requested_role is null then new.requested_role := new.role; end if;
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_profile_role on public.profiles;
create trigger enforce_profile_role before insert or update of role,requested_role on public.profiles for each row execute function public.enforce_profile_role();
revoke all on function public.enforce_profile_role() from public;

drop policy if exists audit_log_own_insert on public.audit_log;
drop policy if exists audit_log_own_select on public.audit_log;
create policy audit_log_own_insert on public.audit_log for insert to authenticated with check ((select auth.uid()) = user_id);
create policy audit_log_own_select on public.audit_log for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists caregiver_links_delete_participant on public.caregiver_links;
create policy caregiver_links_delete_participant on public.caregiver_links for delete to authenticated using ((select auth.uid()) = patient_user_id or (select auth.uid()) = caregiver_user_id);
