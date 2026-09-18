create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default false,
  reminder_enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz not null default now()
);
create table if not exists public.caregiver_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  caregiver_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('reminder_missed','performance_change','sync_issue','care_note')),
  severity text not null default 'info' check (severity in ('info','attention','urgent')),
  title text not null,
  message text not null,
  source_session_id uuid references public.cognitive_sessions(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists caregiver_alerts_patient_created_idx on public.caregiver_alerts(patient_id, created_at desc);
create index if not exists caregiver_alerts_caregiver_created_idx on public.caregiver_alerts(caregiver_id, created_at desc);
create index if not exists caregiver_alerts_source_session_idx on public.caregiver_alerts(source_session_id);
create table if not exists public.training_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  baseline_type text not null check (baseline_type in ('overall','memory','attention','pattern','daily_life')),
  score numeric not null check (score >= 0 and score <= 100),
  sample_count integer not null default 1 check (sample_count > 0),
  captured_at timestamptz not null default now()
);
create index if not exists training_baselines_user_type_idx on public.training_baselines(user_id, baseline_type, captured_at desc);
alter table public.notification_preferences enable row level security;
alter table public.caregiver_alerts enable row level security;
alter table public.training_baselines enable row level security;
revoke all on public.notification_preferences from anon;
revoke all on public.caregiver_alerts from anon;
revoke all on public.training_baselines from anon;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update on public.caregiver_alerts to authenticated;
grant select, insert on public.training_baselines to authenticated;
create policy notification_preferences_own on public.notification_preferences for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy caregiver_alerts_participant_select on public.caregiver_alerts for select to authenticated using (patient_id = (select auth.uid()) or caregiver_id = (select auth.uid()) or exists (select 1 from public.caregiver_links cl where cl.patient_user_id = caregiver_alerts.patient_id and cl.caregiver_user_id = (select auth.uid())));
create policy caregiver_alerts_patient_insert on public.caregiver_alerts for insert to authenticated with check (patient_id = (select auth.uid()));
create policy caregiver_alerts_caregiver_update on public.caregiver_alerts for update to authenticated using (caregiver_id = (select auth.uid())) with check (caregiver_id = (select auth.uid()));
create policy training_baselines_participant_select on public.training_baselines for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.caregiver_links cl where cl.patient_user_id = training_baselines.user_id and cl.caregiver_user_id = (select auth.uid())));
create policy training_baselines_own_insert on public.training_baselines for insert to authenticated with check (user_id = (select auth.uid()));
