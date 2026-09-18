-- Phase 1 security hardening: protected profile fields, consent records and private avatars.
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists role text not null default 'patient',
  add column if not exists requested_role text,
  add column if not exists emergency_contact text,
  add column if not exists emergency_relationship text,
  add column if not exists momo_name text not null default 'Momo',
  add column if not exists voice_preference text not null default 'default',
  add column if not exists region text,
  add column if not exists accessibility text,
  add column if not exists avatar_path text,
  add column if not exists profile_complete boolean not null default false;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('patient','caregiver','health_worker'));
alter table public.profiles drop constraint if exists profiles_requested_role_check;
alter table public.profiles add constraint profiles_requested_role_check check (requested_role is null or requested_role in ('patient','caregiver','health_worker'));
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check check (gender is null or gender in ('Female','Male','Other','Prefer not to say'));
alter table public.profiles drop constraint if exists profiles_voice_preference_check;
alter table public.profiles add constraint profiles_voice_preference_check check (voice_preference in ('default','slow','loud'));
alter table public.profiles drop constraint if exists profiles_dob_check;
alter table public.profiles add constraint profiles_dob_check check (date_of_birth is null or date_of_birth <= current_date);

create table if not exists public.privacy_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_version text not null,
  purpose text not null check (purpose in ('core_app','analytics','notifications')),
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, consent_version, purpose)
);
create index if not exists privacy_consents_user_idx on public.privacy_consents(user_id, accepted_at desc);
alter table public.privacy_consents enable row level security;
revoke all on public.privacy_consents from anon;
grant select, insert, update, delete on public.privacy_consents to authenticated;
drop policy if exists privacy_consents_own_select on public.privacy_consents;
drop policy if exists privacy_consents_own_insert on public.privacy_consents;
drop policy if exists privacy_consents_own_update on public.privacy_consents;
drop policy if exists privacy_consents_own_delete on public.privacy_consents;
create policy privacy_consents_own_select on public.privacy_consents for select to authenticated using ((select auth.uid()) = user_id);
create policy privacy_consents_own_insert on public.privacy_consents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy privacy_consents_own_update on public.privacy_consents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy privacy_consents_own_delete on public.privacy_consents for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos','profile-photos',false,1048576,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=1048576, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists profile_photos_select_own on storage.objects;
drop policy if exists profile_photos_insert_own on storage.objects;
drop policy if exists profile_photos_update_own on storage.objects;
drop policy if exists profile_photos_delete_own on storage.objects;
create policy profile_photos_select_own on storage.objects for select to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_photos_insert_own on storage.objects for insert to authenticated with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_photos_update_own on storage.objects for update to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_photos_delete_own on storage.objects for delete to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- No anonymous CRUD path for protected patient data.
revoke all on public.profiles, public.cognitive_sessions, public.game_results, public.daily_tasks, public.reminders from anon;
