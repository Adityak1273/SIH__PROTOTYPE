-- Fix audit_sensitive_change so profiles inserts/updates do not reference a non-existent id column.
create or replace function public.audit_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  eid text;
  row_json jsonb;
begin
  row_json := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  uid := coalesce(auth.uid(), nullif(row_json->>'user_id','')::uuid);
  if TG_TABLE_NAME = 'caregiver_links' then
    uid := coalesce(auth.uid(), nullif(row_json->>'patient_user_id','')::uuid);
  end if;
  if uid is null then
    return coalesce(NEW, OLD);
  end if;
  eid := coalesce(nullif(row_json->>'id',''), nullif(row_json->>'user_id',''), uid::text);
  insert into public.audit_log(user_id, action, entity_type, entity_id, metadata)
  values(uid, lower(TG_OP), TG_TABLE_NAME, eid, jsonb_build_object('source','database_trigger'));
  return coalesce(NEW, OLD);
end;
$$;
