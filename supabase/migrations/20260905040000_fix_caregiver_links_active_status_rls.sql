-- Fix caregiver RLS policies: require status = 'active' on caregiver_links
-- Prevents revoked caregivers from accessing patient alerts and training baselines.

drop policy if exists caregiver_alerts_participant_select on public.caregiver_alerts;
create policy caregiver_alerts_participant_select on public.caregiver_alerts
for select to authenticated
using (
  patient_id = (select auth.uid())
  or caregiver_id = (select auth.uid())
  or exists (
    select 1 from public.caregiver_links cl
    where cl.patient_user_id = caregiver_alerts.patient_id
      and cl.caregiver_user_id = (select auth.uid())
      and cl.status = 'active'
  )
);

drop policy if exists training_baselines_participant_select on public.training_baselines;
create policy training_baselines_participant_select on public.training_baselines
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.caregiver_links cl
    where cl.patient_user_id = training_baselines.user_id
      and cl.caregiver_user_id = (select auth.uid())
      and cl.status = 'active'
  )
);
