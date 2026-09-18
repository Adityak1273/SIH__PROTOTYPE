-- Phase: dedicated Admin access for the SIH prototype.
-- The allowlist is private and the browser cannot grant itself admin.
create table if not exists public.admin_allowlist (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_allowlist enable row level security;
revoke all on public.admin_allowlist from anon, authenticated;

insert into public.admin_allowlist(email, active)
values ('adityak1273@gmail.com', true)
on conflict (email) do update set active = excluded.active;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('patient','caregiver','health_worker','admin'));
alter table public.profiles drop constraint if exists profiles_requested_role_check;
alter table public.profiles add constraint profiles_requested_role_check check (requested_role is null or requested_role in ('patient','caregiver','health_worker','admin'));

create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_admin_email boolean := false;
begin
  select exists (
    select 1
    from public.admin_allowlist a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = new.user_id and a.active = true
  ) into is_admin_email;

  if is_admin_email then
    new.role := 'admin';
    new.requested_role := 'admin';
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role in ('health_worker','admin') then new.role := 'patient'; end if;
    if new.requested_role is null or new.requested_role = 'admin' then new.requested_role := new.role; end if;
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_role on public.profiles;
create trigger enforce_profile_role
before insert or update of role,requested_role on public.profiles
for each row execute function public.enforce_profile_role();
revoke execute on function public.enforce_profile_role() from public, anon, authenticated;

-- Existing admin profile (if the email has already authenticated) is promoted immediately.
update public.profiles p
set role = 'admin', requested_role = 'admin'
from auth.users u
join public.admin_allowlist a on lower(a.email) = lower(u.email) and a.active = true
where p.user_id = u.id;

-- Secure, read-only admin report RPC. It returns aggregates rather than exposing raw tables to admins.
create or replace function public.get_admin_patient_reports()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  last_session_at timestamptz,
  sessions_count bigint,
  average_accuracy numeric,
  average_score numeric,
  games_played bigint,
  active_alerts bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.user_id,
    coalesce(p.full_name, p.display_name, 'Unnamed user') as full_name,
    u.email,
    p.role,
    max(s.started_at) as last_session_at,
    count(distinct s.id) as sessions_count,
    coalesce(round(avg(s.accuracy), 4), 0) as average_accuracy,
    coalesce(round(avg(s.score), 2), 0) as average_score,
    count(g.id) as games_played,
    count(distinct a.id) filter (where a.acknowledged_at is null) as active_alerts
  from public.profiles p
  join auth.users u on u.id = p.user_id
  left join public.cognitive_sessions s on s.user_id = p.user_id
  left join public.game_results g on g.session_id = s.id
  left join public.caregiver_alerts a on a.patient_id = p.user_id
  where p.role <> 'admin'
    and exists (
      select 1
      from public.admin_allowlist aa
      where aa.active = true
        and lower(aa.email) = lower((select email from auth.users where id = (select auth.uid())))
    )
  group by p.user_id, p.full_name, p.display_name, p.role, u.email
  order by max(s.started_at) desc nulls last, full_name asc;
$$;
revoke execute on function public.get_admin_patient_reports() from public, anon;
grant execute on function public.get_admin_patient_reports() to authenticated;

comment on table public.admin_allowlist is 'Private server-controlled allowlist for Cognitive Care NER admin access.';
comment on function public.get_admin_patient_reports() is 'Admin-only aggregate patient report endpoint; does not expose raw protected tables.';
