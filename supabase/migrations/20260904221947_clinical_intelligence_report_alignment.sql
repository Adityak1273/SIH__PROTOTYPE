create table if not exists public.clinical_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_title text not null default 'Clinical report',
  source_type text not null default 'text' check (source_type in ('text','file','import')),
  report_date date,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists clinical_reports_user_created_idx on public.clinical_reports(user_id, created_at desc);
alter table public.clinical_reports enable row level security;
revoke all on public.clinical_reports from anon;
grant select, insert, update, delete on public.clinical_reports to authenticated;
drop policy if exists clinical_reports_self_select on public.clinical_reports;
drop policy if exists clinical_reports_self_insert on public.clinical_reports;
drop policy if exists clinical_reports_self_update on public.clinical_reports;
drop policy if exists clinical_reports_self_delete on public.clinical_reports;
drop policy if exists clinical_reports_linked_select on public.clinical_reports;
create policy clinical_reports_self_select on public.clinical_reports for select to authenticated using (user_id = auth.uid());
create policy clinical_reports_self_insert on public.clinical_reports for insert to authenticated with check (user_id = auth.uid());
create policy clinical_reports_self_update on public.clinical_reports for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy clinical_reports_self_delete on public.clinical_reports for delete to authenticated using (user_id = auth.uid());
create policy clinical_reports_linked_select on public.clinical_reports for select to authenticated using (
  exists (
    select 1 from public.caregiver_links cl
    where cl.patient_user_id = clinical_reports.user_id
      and cl.caregiver_user_id = auth.uid()
      and cl.status = 'active'
  )
);
comment on table public.clinical_reports is 'Structured, user-consented clinical report summaries. Raw report text is not stored by the browser analyzer.';
