-- =============================================================
-- Migration: add p_called_by to all admin write RPCs
-- =============================================================
-- Allows service-role callers (e.g. Claude tools) to identify
-- themselves by passing p_called_by = 'katkinson@diocesan.school.nz'.
-- The UI continues to work unchanged — it sends a user JWT whose
-- email is picked up automatically by auth.jwt()->>'email'.
--
-- Pattern applied to every write RPC:
--   v_email := coalesce(auth.jwt()->>'email', p_called_by);
--
-- Idempotent: safe to re-run.
-- =============================================================


-- -------------------------------------------------------------
-- admin_create_project
-- -------------------------------------------------------------
drop function if exists public.admin_create_project(jsonb);
drop function if exists public.admin_create_project(jsonb, text);

create or replace function public.admin_create_project(
  p_payload    jsonb,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text := coalesce(auth.jwt()->>'email', p_called_by);
  v_id      uuid;
  v_now     timestamptz := now();
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return json_build_object('ok', false, 'error', 'invalid_payload');
  end if;

  if coalesce(trim(p_payload->>'name'), '') = '' then
    return json_build_object('ok', false, 'error', 'name_required');
  end if;

  if coalesce(p_payload->>'project_type', '') = '' then
    return json_build_object('ok', false, 'error', 'project_type_required');
  end if;

  if coalesce(p_payload->>'status', '') = '' then
    return json_build_object('ok', false, 'error', 'status_required');
  end if;

  if not exists (select 1 from public.project_types where id = p_payload->>'project_type') then
    return json_build_object('ok', false, 'error', 'invalid_project_type');
  end if;

  if not exists (select 1 from public.project_statuses where id = p_payload->>'status') then
    return json_build_object('ok', false, 'error', 'invalid_status');
  end if;

  insert into public.projects (
    name, project_type, owner, status, next_decision, deadline, canonical_location, logseq_page, parent_id,
    status_inferred, status_confidence, owner_inferred, owner_confidence,
    display_order,
    created_at, created_by_email, updated_at, updated_by_email
  ) values (
    trim(p_payload->>'name'),
    p_payload->>'project_type',
    nullif(trim(coalesce(p_payload->>'owner', '')), ''),
    p_payload->>'status',
    nullif(trim(coalesce(p_payload->>'next_decision', '')), ''),
    nullif(trim(coalesce(p_payload->>'deadline', '')), ''),
    nullif(trim(coalesce(p_payload->>'canonical_location', '')), ''),
    nullif(trim(coalesce(p_payload->>'logseq_page', '')), ''),
    nullif(nullif(trim(coalesce(p_payload->>'parent_id', '')), ''), 'null')::uuid,
    coalesce((p_payload->>'status_inferred')::boolean, false),
    nullif(p_payload->>'status_confidence', ''),
    coalesce((p_payload->>'owner_inferred')::boolean, false),
    nullif(p_payload->>'owner_confidence', ''),
    coalesce((p_payload->>'display_order')::int, (select coalesce(max(display_order), 0) + 10 from public.projects)),
    v_now, v_email, v_now, v_email
  )
  returning id into v_id;

  return json_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.admin_create_project(jsonb, text) to authenticated;


-- -------------------------------------------------------------
-- admin_update_project
-- -------------------------------------------------------------
drop function if exists public.admin_update_project(uuid, jsonb, text);
drop function if exists public.admin_update_project(uuid, jsonb, text, text);

create or replace function public.admin_update_project(
  p_project_id uuid,
  p_payload    jsonb,
  p_note       text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email           text := coalesce(auth.jwt()->>'email', p_called_by);
  v_now             timestamptz := now();
  v_group_id        uuid := gen_random_uuid();
  v_old             public.projects%rowtype;
  v_new_name        text;
  v_new_owner       text;
  v_new_status      text;
  v_new_type        text;
  v_new_decision    text;
  v_new_deadline    text;
  v_new_location    text;
  v_new_logseq      text;
  v_new_parent      uuid;
  v_new_display     int;
  v_changed         boolean := false;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_old from public.projects where id = p_project_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_payload ? 'name' then
    v_new_name := nullif(trim(p_payload->>'name'), '');
    if v_new_name is null then
      return json_build_object('ok', false, 'error', 'name_required');
    end if;
    if v_new_name is distinct from v_old.name then
      perform public._record_history(p_project_id, v_group_id, 'name', v_old.name, v_new_name, null, v_email, p_note);
      update public.projects set name = v_new_name where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'project_type' then
    v_new_type := p_payload->>'project_type';
    if not exists (select 1 from public.project_types where id = v_new_type) then
      return json_build_object('ok', false, 'error', 'invalid_project_type');
    end if;
    if v_new_type is distinct from v_old.project_type then
      perform public._record_history(p_project_id, v_group_id, 'project_type', v_old.project_type, v_new_type, null, v_email, p_note);
      update public.projects set project_type = v_new_type where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'owner' then
    v_new_owner := nullif(trim(coalesce(p_payload->>'owner', '')), '');
    if v_new_owner is distinct from v_old.owner then
      perform public._record_history(p_project_id, v_group_id, 'owner', v_old.owner, v_new_owner, v_old.owner_inferred, v_email, p_note);
      update public.projects
         set owner = v_new_owner,
             owner_inferred = false,
             owner_confidence = coalesce(nullif(p_payload->>'owner_confidence', ''), owner_confidence)
       where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'status' then
    v_new_status := p_payload->>'status';
    if not exists (select 1 from public.project_statuses where id = v_new_status) then
      return json_build_object('ok', false, 'error', 'invalid_status');
    end if;
    if v_new_status is distinct from v_old.status then
      perform public._record_history(p_project_id, v_group_id, 'status', v_old.status, v_new_status, v_old.status_inferred, v_email, p_note);
      update public.projects
         set status = v_new_status,
             status_inferred = false,
             status_confidence = coalesce(nullif(p_payload->>'status_confidence', ''), status_confidence)
       where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'next_decision' then
    v_new_decision := nullif(trim(coalesce(p_payload->>'next_decision', '')), '');
    if v_new_decision is distinct from v_old.next_decision then
      perform public._record_history(p_project_id, v_group_id, 'next_decision', v_old.next_decision, v_new_decision, null, v_email, p_note);
      update public.projects set next_decision = v_new_decision where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'deadline' then
    v_new_deadline := nullif(trim(coalesce(p_payload->>'deadline', '')), '');
    if v_new_deadline is distinct from v_old.deadline then
      perform public._record_history(p_project_id, v_group_id, 'deadline', v_old.deadline, v_new_deadline, null, v_email, p_note);
      update public.projects set deadline = v_new_deadline where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'canonical_location' then
    v_new_location := nullif(trim(coalesce(p_payload->>'canonical_location', '')), '');
    if v_new_location is distinct from v_old.canonical_location then
      perform public._record_history(p_project_id, v_group_id, 'canonical_location', v_old.canonical_location, v_new_location, null, v_email, p_note);
      update public.projects set canonical_location = v_new_location where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'logseq_page' then
    v_new_logseq := nullif(trim(coalesce(p_payload->>'logseq_page', '')), '');
    if v_new_logseq is distinct from v_old.logseq_page then
      perform public._record_history(p_project_id, v_group_id, 'logseq_page', v_old.logseq_page, v_new_logseq, null, v_email, p_note);
      update public.projects set logseq_page = v_new_logseq where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'parent_id' then
    v_new_parent := nullif(nullif(trim(coalesce(p_payload->>'parent_id', '')), ''), 'null')::uuid;
    if v_new_parent is distinct from v_old.parent_id then
      perform public._record_history(p_project_id, v_group_id, 'parent_id', v_old.parent_id::text, v_new_parent::text, null, v_email, p_note);
      update public.projects set parent_id = v_new_parent where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'display_order' then
    v_new_display := (p_payload->>'display_order')::int;
    if v_new_display is distinct from v_old.display_order then
      update public.projects set display_order = v_new_display where id = p_project_id;
      v_changed := true;
    end if;
  end if;

  if v_changed then
    update public.projects
       set updated_at = v_now, updated_by_email = v_email
     where id = p_project_id;
  end if;

  return json_build_object('ok', true, 'changed', v_changed, 'change_group_id', v_group_id);
end;
$$;

grant execute on function public.admin_update_project(uuid, jsonb, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_set_status  (convenience wrapper)
-- -------------------------------------------------------------
drop function if exists public.admin_set_status(uuid, text, text, text);
drop function if exists public.admin_set_status(uuid, text, text, text, text);

create or replace function public.admin_set_status(
  p_project_id uuid,
  p_status     text,
  p_confidence text default null,
  p_note       text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_update_project(
    p_project_id,
    jsonb_build_object('status', p_status, 'status_confidence', p_confidence),
    p_note,
    p_called_by
  );
end;
$$;

grant execute on function public.admin_set_status(uuid, text, text, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_set_owner  (convenience wrapper)
-- -------------------------------------------------------------
drop function if exists public.admin_set_owner(uuid, text, text, text);
drop function if exists public.admin_set_owner(uuid, text, text, text, text);

create or replace function public.admin_set_owner(
  p_project_id uuid,
  p_owner      text,
  p_confidence text default null,
  p_note       text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_update_project(
    p_project_id,
    jsonb_build_object('owner', p_owner, 'owner_confidence', p_confidence),
    p_note,
    p_called_by
  );
end;
$$;

grant execute on function public.admin_set_owner(uuid, text, text, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_confirm_inference
-- -------------------------------------------------------------
drop function if exists public.admin_confirm_inference(uuid, text);
drop function if exists public.admin_confirm_inference(uuid, text, text);

create or replace function public.admin_confirm_inference(
  p_project_id uuid,
  p_field      text,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := coalesce(auth.jwt()->>'email', p_called_by);
  v_group_id uuid := gen_random_uuid();
  v_old      public.projects%rowtype;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_old from public.projects where id = p_project_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_field = 'status' then
    if v_old.status_inferred then
      perform public._record_history(p_project_id, v_group_id, 'status_inferred', 'true', 'false', true, v_email, 'inference confirmed by admin');
      update public.projects
         set status_inferred = false, updated_at = now(), updated_by_email = v_email
       where id = p_project_id;
    end if;
  elsif p_field = 'owner' then
    if v_old.owner_inferred then
      perform public._record_history(p_project_id, v_group_id, 'owner_inferred', 'true', 'false', true, v_email, 'inference confirmed by admin');
      update public.projects
         set owner_inferred = false, updated_at = now(), updated_by_email = v_email
       where id = p_project_id;
    end if;
  else
    return json_build_object('ok', false, 'error', 'invalid_field');
  end if;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_confirm_inference(uuid, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_archive_project
-- -------------------------------------------------------------
drop function if exists public.admin_archive_project(uuid, text);
drop function if exists public.admin_archive_project(uuid, text, text);

create or replace function public.admin_archive_project(
  p_project_id uuid,
  p_reason     text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := coalesce(auth.jwt()->>'email', p_called_by);
  v_group_id uuid := gen_random_uuid();
  v_old      public.projects%rowtype;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_old from public.projects where id = p_project_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_old.state = 'archived' then
    return json_build_object('ok', true, 'changed', false);
  end if;

  perform public._record_history(p_project_id, v_group_id, 'state', v_old.state, 'archived', null, v_email, p_reason);
  update public.projects
     set state = 'archived', state_reason = p_reason,
         state_changed_at = now(), state_changed_by_email = v_email,
         updated_at = now(), updated_by_email = v_email
   where id = p_project_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_archive_project(uuid, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_hide_project
-- -------------------------------------------------------------
drop function if exists public.admin_hide_project(uuid, text);
drop function if exists public.admin_hide_project(uuid, text, text);

create or replace function public.admin_hide_project(
  p_project_id uuid,
  p_reason     text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := coalesce(auth.jwt()->>'email', p_called_by);
  v_group_id uuid := gen_random_uuid();
  v_old      public.projects%rowtype;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_old from public.projects where id = p_project_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_old.state = 'hidden_out_of_scope' then
    return json_build_object('ok', true, 'changed', false);
  end if;

  perform public._record_history(p_project_id, v_group_id, 'state', v_old.state, 'hidden_out_of_scope', null, v_email, p_reason);
  update public.projects
     set state = 'hidden_out_of_scope', state_reason = p_reason,
         state_changed_at = now(), state_changed_by_email = v_email,
         updated_at = now(), updated_by_email = v_email
   where id = p_project_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_hide_project(uuid, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_restore_project
-- -------------------------------------------------------------
drop function if exists public.admin_restore_project(uuid, text);
drop function if exists public.admin_restore_project(uuid, text, text);

create or replace function public.admin_restore_project(
  p_project_id uuid,
  p_reason     text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := coalesce(auth.jwt()->>'email', p_called_by);
  v_group_id uuid := gen_random_uuid();
  v_old      public.projects%rowtype;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_old from public.projects where id = p_project_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_old.state = 'active' then
    return json_build_object('ok', true, 'changed', false);
  end if;

  perform public._record_history(p_project_id, v_group_id, 'state', v_old.state, 'active', null, v_email, p_reason);
  update public.projects
     set state = 'active', state_reason = p_reason,
         state_changed_at = now(), state_changed_by_email = v_email,
         updated_at = now(), updated_by_email = v_email
   where id = p_project_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_restore_project(uuid, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_add_decision
-- -------------------------------------------------------------
drop function if exists public.admin_add_decision(jsonb);
drop function if exists public.admin_add_decision(jsonb, text);

create or replace function public.admin_add_decision(
  p_payload    jsonb,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email      text := coalesce(auth.jwt()->>'email', p_called_by);
  v_id         uuid;
  v_now        timestamptz := now();
  v_project_id uuid;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return json_build_object('ok', false, 'error', 'invalid_payload');
  end if;

  if coalesce(trim(p_payload->>'resolution'), '') = '' then
    return json_build_object('ok', false, 'error', 'resolution_required');
  end if;

  v_project_id := nullif(p_payload->>'project_id', '')::uuid;
  if v_project_id is not null
     and not exists (select 1 from public.projects where id = v_project_id) then
    return json_build_object('ok', false, 'error', 'invalid_project_id');
  end if;

  insert into public.decisions (
    project_id, question, resolution, decided_on, decided_by,
    created_at, created_by_email, updated_at, updated_by_email
  ) values (
    v_project_id,
    coalesce(trim(p_payload->>'question'), ''),
    trim(p_payload->>'resolution'),
    nullif(p_payload->>'decided_on', '')::date,
    nullif(trim(coalesce(p_payload->>'decided_by', '')), ''),
    v_now, v_email, v_now, v_email
  )
  returning id into v_id;

  return json_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.admin_add_decision(jsonb, text) to authenticated;


-- -------------------------------------------------------------
-- admin_update_decision
-- -------------------------------------------------------------
drop function if exists public.admin_update_decision(uuid, jsonb);
drop function if exists public.admin_update_decision(uuid, jsonb, text);

create or replace function public.admin_update_decision(
  p_decision_id uuid,
  p_payload     jsonb,
  p_called_by   text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email      text := coalesce(auth.jwt()->>'email', p_called_by);
  v_now        timestamptz := now();
  v_project_id uuid;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  if not exists (select 1 from public.decisions where id = p_decision_id) then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_payload ? 'project_id' then
    v_project_id := nullif(p_payload->>'project_id', '')::uuid;
    if v_project_id is not null
       and not exists (select 1 from public.projects where id = v_project_id) then
      return json_build_object('ok', false, 'error', 'invalid_project_id');
    end if;
    update public.decisions set project_id = v_project_id where id = p_decision_id;
  end if;

  if p_payload ? 'question' then
    update public.decisions
       set question = coalesce(trim(p_payload->>'question'), '')
     where id = p_decision_id;
  end if;

  if p_payload ? 'resolution' then
    if coalesce(trim(p_payload->>'resolution'), '') = '' then
      return json_build_object('ok', false, 'error', 'resolution_required');
    end if;
    update public.decisions
       set resolution = trim(p_payload->>'resolution')
     where id = p_decision_id;
  end if;

  if p_payload ? 'decided_on' then
    update public.decisions
       set decided_on = nullif(p_payload->>'decided_on', '')::date
     where id = p_decision_id;
  end if;

  if p_payload ? 'decided_by' then
    update public.decisions
       set decided_by = nullif(trim(coalesce(p_payload->>'decided_by', '')), '')
     where id = p_decision_id;
  end if;

  update public.decisions
     set updated_at = v_now, updated_by_email = v_email
   where id = p_decision_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_update_decision(uuid, jsonb, text) to authenticated;


-- -------------------------------------------------------------
-- admin_delete_decision
-- -------------------------------------------------------------
drop function if exists public.admin_delete_decision(uuid);
drop function if exists public.admin_delete_decision(uuid, text);

create or replace function public.admin_delete_decision(
  p_decision_id uuid,
  p_called_by   text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := coalesce(auth.jwt()->>'email', p_called_by);
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  delete from public.decisions where id = p_decision_id;
  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_delete_decision(uuid, text) to authenticated;


-- -------------------------------------------------------------
-- admin_set_setting
-- -------------------------------------------------------------
drop function if exists public.admin_set_setting(text, text);
drop function if exists public.admin_set_setting(text, text, text);

create or replace function public.admin_set_setting(
  p_key        text,
  p_value      text,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := coalesce(auth.jwt()->>'email', p_called_by);
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  if coalesce(trim(p_key), '') = '' then
    return json_build_object('ok', false, 'error', 'key_required');
  end if;

  insert into public.settings (key, value) values (p_key, coalesce(p_value, ''))
  on conflict (key) do update set value = excluded.value;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_set_setting(text, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_create_task
-- -------------------------------------------------------------
drop function if exists public.admin_create_task(jsonb);
drop function if exists public.admin_create_task(jsonb, text);

create or replace function public.admin_create_task(
  p_payload    jsonb,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email       text := coalesce(auth.jwt()->>'email', p_called_by);
  v_id          uuid;
  v_now         timestamptz := now();
  v_project_id  uuid;
  v_order       integer;
  v_priority    smallint;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return json_build_object('ok', false, 'error', 'invalid_payload');
  end if;

  if coalesce(trim(p_payload->>'title'), '') = '' then
    return json_build_object('ok', false, 'error', 'title_required');
  end if;

  v_project_id := nullif(p_payload->>'project_id', '')::uuid;
  if v_project_id is null then
    return json_build_object('ok', false, 'error', 'project_id_required');
  end if;

  if not exists (select 1 from public.projects where id = v_project_id) then
    return json_build_object('ok', false, 'error', 'invalid_project_id');
  end if;

  if p_payload ? 'status'
     and not exists (select 1 from public.task_statuses where id = p_payload->>'status') then
    return json_build_object('ok', false, 'error', 'invalid_status');
  end if;

  v_priority := nullif(p_payload->>'priority', '')::smallint;
  if v_priority is not null and (v_priority < 1 or v_priority > 4) then
    return json_build_object('ok', false, 'error', 'invalid_priority');
  end if;

  v_order := nullif(p_payload->>'order_index', '')::integer;
  if v_order is null then
    select coalesce(max(order_index), 0) + 10 into v_order
    from public.tasks
    where project_id = v_project_id and archived_at is null;
  end if;

  insert into public.tasks (
    project_id, title, description, status,
    due_date, priority, owner, order_index,
    todoist_id, todoist_url, last_synced_at, sync_source,
    created_at, created_by_email, updated_at, updated_by_email
  ) values (
    v_project_id,
    trim(p_payload->>'title'),
    nullif(trim(coalesce(p_payload->>'description', '')), ''),
    coalesce(p_payload->>'status', 'todo'),
    nullif(p_payload->>'due_date', '')::date,
    v_priority,
    nullif(trim(coalesce(p_payload->>'owner', '')), ''),
    v_order,
    nullif(trim(coalesce(p_payload->>'todoist_id', '')), ''),
    nullif(trim(coalesce(p_payload->>'todoist_url', '')), ''),
    nullif(p_payload->>'last_synced_at', '')::timestamptz,
    coalesce(nullif(p_payload->>'sync_source', ''), 'manifest'),
    v_now, v_email, v_now, v_email
  )
  returning id into v_id;

  return json_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.admin_create_task(jsonb, text) to authenticated;


-- -------------------------------------------------------------
-- admin_update_task
-- -------------------------------------------------------------
drop function if exists public.admin_update_task(uuid, jsonb, text);
drop function if exists public.admin_update_task(uuid, jsonb, text, text);

create or replace function public.admin_update_task(
  p_task_id    uuid,
  p_payload    jsonb,
  p_note       text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email         text := coalesce(auth.jwt()->>'email', p_called_by);
  v_now           timestamptz := now();
  v_group_id      uuid := gen_random_uuid();
  v_old           public.tasks%rowtype;
  v_new_title     text;
  v_new_desc      text;
  v_new_status    text;
  v_new_due       date;
  v_new_priority  smallint;
  v_new_owner     text;
  v_new_order     integer;
  v_new_todoist   text;
  v_new_todo_url  text;
  v_new_sync_at   timestamptz;
  v_new_sync_src  text;
  v_changed       boolean := false;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_old from public.tasks where id = p_task_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_payload ? 'title' then
    v_new_title := nullif(trim(p_payload->>'title'), '');
    if v_new_title is null then
      return json_build_object('ok', false, 'error', 'title_required');
    end if;
    if v_new_title is distinct from v_old.title then
      perform public._record_task_history(p_task_id, v_group_id, 'title', v_old.title, v_new_title, v_email, p_note);
      update public.tasks set title = v_new_title where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'description' then
    v_new_desc := nullif(trim(coalesce(p_payload->>'description', '')), '');
    if v_new_desc is distinct from v_old.description then
      perform public._record_task_history(p_task_id, v_group_id, 'description', v_old.description, v_new_desc, v_email, p_note);
      update public.tasks set description = v_new_desc where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'status' then
    v_new_status := p_payload->>'status';
    if not exists (select 1 from public.task_statuses where id = v_new_status) then
      return json_build_object('ok', false, 'error', 'invalid_status');
    end if;
    if v_new_status is distinct from v_old.status then
      perform public._record_task_history(p_task_id, v_group_id, 'status', v_old.status, v_new_status, v_email, p_note);
      update public.tasks set status = v_new_status where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'due_date' then
    v_new_due := nullif(p_payload->>'due_date', '')::date;
    if v_new_due is distinct from v_old.due_date then
      perform public._record_task_history(p_task_id, v_group_id, 'due_date', v_old.due_date::text, v_new_due::text, v_email, p_note);
      update public.tasks set due_date = v_new_due where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'priority' then
    v_new_priority := nullif(p_payload->>'priority', '')::smallint;
    if v_new_priority is not null and (v_new_priority < 1 or v_new_priority > 4) then
      return json_build_object('ok', false, 'error', 'invalid_priority');
    end if;
    if v_new_priority is distinct from v_old.priority then
      perform public._record_task_history(p_task_id, v_group_id, 'priority', v_old.priority::text, v_new_priority::text, v_email, p_note);
      update public.tasks set priority = v_new_priority where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'owner' then
    v_new_owner := nullif(trim(coalesce(p_payload->>'owner', '')), '');
    if v_new_owner is distinct from v_old.owner then
      perform public._record_task_history(p_task_id, v_group_id, 'owner', v_old.owner, v_new_owner, v_email, p_note);
      update public.tasks set owner = v_new_owner where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'order_index' then
    v_new_order := nullif(p_payload->>'order_index', '')::integer;
    if v_new_order is distinct from v_old.order_index then
      update public.tasks set order_index = v_new_order where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'todoist_id' then
    v_new_todoist := nullif(trim(coalesce(p_payload->>'todoist_id', '')), '');
    if v_new_todoist is distinct from v_old.todoist_id then
      update public.tasks set todoist_id = v_new_todoist where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'todoist_url' then
    v_new_todo_url := nullif(trim(coalesce(p_payload->>'todoist_url', '')), '');
    if v_new_todo_url is distinct from v_old.todoist_url then
      update public.tasks set todoist_url = v_new_todo_url where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'last_synced_at' then
    v_new_sync_at := nullif(p_payload->>'last_synced_at', '')::timestamptz;
    if v_new_sync_at is distinct from v_old.last_synced_at then
      update public.tasks set last_synced_at = v_new_sync_at where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if p_payload ? 'sync_source' then
    v_new_sync_src := p_payload->>'sync_source';
    if v_new_sync_src not in ('manifest', 'todoist') then
      return json_build_object('ok', false, 'error', 'invalid_sync_source');
    end if;
    if v_new_sync_src is distinct from v_old.sync_source then
      update public.tasks set sync_source = v_new_sync_src where id = p_task_id;
      v_changed := true;
    end if;
  end if;

  if v_changed then
    update public.tasks
       set updated_at = v_now, updated_by_email = v_email
     where id = p_task_id;
  end if;

  return json_build_object('ok', true, 'changed', v_changed, 'change_group_id', v_group_id);
end;
$$;

grant execute on function public.admin_update_task(uuid, jsonb, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_set_task_status  (convenience wrapper)
-- -------------------------------------------------------------
drop function if exists public.admin_set_task_status(uuid, text, text);
drop function if exists public.admin_set_task_status(uuid, text, text, text);

create or replace function public.admin_set_task_status(
  p_task_id    uuid,
  p_status     text,
  p_note       text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_update_task(
    p_task_id,
    jsonb_build_object('status', p_status),
    p_note,
    p_called_by
  );
end;
$$;

grant execute on function public.admin_set_task_status(uuid, text, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_complete_task  (convenience wrapper)
-- -------------------------------------------------------------
drop function if exists public.admin_complete_task(uuid, text);
drop function if exists public.admin_complete_task(uuid, text, text);

create or replace function public.admin_complete_task(
  p_task_id    uuid,
  p_note       text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_update_task(
    p_task_id,
    jsonb_build_object('status', 'done'),
    p_note,
    p_called_by
  );
end;
$$;

grant execute on function public.admin_complete_task(uuid, text, text) to authenticated;


-- -------------------------------------------------------------
-- admin_archive_task
-- -------------------------------------------------------------
drop function if exists public.admin_archive_task(uuid, text);
drop function if exists public.admin_archive_task(uuid, text, text);

create or replace function public.admin_archive_task(
  p_task_id    uuid,
  p_reason     text default null,
  p_called_by  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := coalesce(auth.jwt()->>'email', p_called_by);
  v_group_id uuid := gen_random_uuid();
  v_old      public.tasks%rowtype;
begin
  if not public.is_admin_email(v_email) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_old from public.tasks where id = p_task_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_old.archived_at is not null then
    return json_build_object('ok', true, 'changed', false);
  end if;

  perform public._record_task_history(p_task_id, v_group_id, 'archived_at', null, now()::text, v_email, p_reason);
  update public.tasks
     set archived_at = now(), archived_reason = p_reason,
         updated_at = now(), updated_by_email = v_email
   where id = p_task_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_archive_task(uuid, text, text) to authenticated;


-- -------------------------------------------------------------
-- Sanity check: call each function signature to confirm it exists
-- (comment out before pasting if you prefer a clean run)
-- -------------------------------------------------------------
-- select public.admin_create_project('{"name":"test","project_type":"project","status":"placeholder"}'::jsonb, 'katkinson@diocesan.school.nz');
-- select public.admin_update_project('00000000-0000-0000-0000-000000000001'::uuid, '{"name":"SIS replacement (Synergetic to Veracross)"}'::jsonb, null, 'katkinson@diocesan.school.nz');
