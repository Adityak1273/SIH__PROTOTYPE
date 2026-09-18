-- Expand profiles and clinical reports with structured domains, confirmation flow, and source attribution
alter table public.profiles
  add column if not exists preferred_name text,
  add column if not exists age integer,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text default 'India',
  add column if not exists additional_languages jsonb default '[]'::jsonb,
  add column if not exists caregiver_info jsonb default '{}'::jsonb,
  add column if not exists health_background jsonb default '{}'::jsonb,
  add column if not exists daily_life_background jsonb default '{}'::jsonb,
  add column if not exists accessibility_settings jsonb default '{}'::jsonb,
  add column if not exists privacy_preferences jsonb default '{}'::jsonb,
  add column if not exists onboarding_step integer default 1,
  add column if not exists profile_completion_pct integer default 20;

-- Expand clinical_reports
alter table public.clinical_reports
  add column if not exists original_filename text,
  add column if not exists extracted_text text,
  add column if not exists extracted_entities jsonb default '{}'::jsonb,
  add column if not exists confirmed_entities jsonb default '{}'::jsonb,
  add column if not exists confirmation_status text default 'pending_confirmation',
  add column if not exists source_attribution text default 'doctor_report',
  add column if not exists report_date date;

create index if not exists idx_clinical_reports_status on public.clinical_reports(user_id, confirmation_status);
