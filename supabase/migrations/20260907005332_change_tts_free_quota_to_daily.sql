-- La cuota de mensajes gratis por voz (200) pasa de "cada 30 días" a
-- "cada 24 horas" (no acumulable: usar 50 de 200 un día no deja 350 al
-- día siguiente, siempre vuelve a 200) — ver TTS_FREE_LIMIT/TTS_CYCLE_MS
-- en src/lib/store.ts, que es donde vive el límite real. Este mismo
-- cálculo también existía duplicado del lado del cliente en
-- consumeTtsQuota() como chequeo optimista, pero la fuente de verdad
-- real siempre fue esta función (SECURITY DEFINER) corriendo en el
-- servidor.
create or replace function public.increment_tts_usage()
returns public.tts_usage
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.tts_usage%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.tts_usage (user_id, messages_read, cycle_start)
    values (v_uid, 0, now())
    on conflict (user_id) do nothing;

  select * into v_row from public.tts_usage where user_id = v_uid for update;

  if v_row.cycle_start < now() - interval '1 day' then
    v_row.messages_read := 0;
    v_row.cycle_start := now();
  end if;

  v_row.messages_read := v_row.messages_read + 1;

  update public.tts_usage
    set messages_read = v_row.messages_read,
        cycle_start = v_row.cycle_start,
        updated_at = now()
    where user_id = v_uid;

  select * into v_row from public.tts_usage where user_id = v_uid;
  return v_row;
end;
$$;
