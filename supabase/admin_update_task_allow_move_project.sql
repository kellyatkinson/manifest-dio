-- admin_update_task: allow moving a task to a different project.
--
-- Adds a `project_id` branch to the JSONB payload: validates the target
-- project exists, records the move in task_history, and updates the row.
-- All other behaviour is unchanged from the prior definition.
--
-- Applied to the live Supabase project (uiejznlwwafyvrjgdiug) on 2026-06-16.

CREATE OR REPLACE FUNCTION public.admin_update_task(p_task_id uuid, p_payload jsonb, p_note text DEFAULT NULL::text, p_called_by text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_new_project   uuid;
  v_new_todoist   text;
  v_new_todo_url  text;
  v_new_sync_at   timestamptz;
  v_new_sync_src  text;
  v_new_tickets   integer[];
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

  -- project_id (move task to a different project) ---------------------
  if p_payload ? 'project_id' then
    v_new_project := nullif(p_payload->>'project_id', '')::uuid;
    if v_new_project is null then
      return json_build_object('ok', false, 'error', 'project_id_required');
    end if;
    if not exists (select 1 from public.projects where id = v_new_project) then
      return json_build_object('ok', false, 'error', 'invalid_project');
    end if;
    if v_new_project is distinct from v_old.project_id then
      perform public._record_task_history(p_task_id, v_group_id, 'project_id', v_old.project_id::text, v_new_project::text, v_email, p_note);
      update public.tasks set project_id = v_new_project where id = p_task_id;
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

  -- zendesk_tickets ---------------------------------------------------
  if p_payload ? 'zendesk_tickets' then
    begin
      v_new_tickets := public._parse_zendesk_tickets(p_payload->'zendesk_tickets');
    exception when others then
      return json_build_object('ok', false, 'error', 'invalid_zendesk_tickets');
    end;
    if v_new_tickets is distinct from v_old.zendesk_tickets then
      perform public._record_task_history(
        p_task_id, v_group_id, 'zendesk_tickets',
        v_old.zendesk_tickets::text, v_new_tickets::text, v_email, p_note
      );
      update public.tasks set zendesk_tickets = v_new_tickets where id = p_task_id;
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
$function$;
