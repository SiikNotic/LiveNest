-- Limpieza de filas huérfanas dejadas por borrados de cuenta anteriores
-- (settings.user_id que ya no corresponde a ningún auth.users existente)
-- antes de poder agregar la FK de abajo, que necesita que no queden.
delete from public.settings where user_id not in (select id from auth.users);
delete from public.filters where user_id not in (select id from auth.users);
delete from public.templates where user_id not in (select id from auth.users);
delete from public.chat_messages where user_id not in (select id from auth.users);
delete from public.live_events where user_id not in (select id from auth.users);
delete from public.song_requests where user_id not in (select id from auth.users);

-- Encontrado al implementar "eliminar mi cuenta": varias tablas con datos
-- por usuario nunca tuvieron una foreign key hacia auth.users, así que
-- borrar la cuenta (aunque cascadeara bien profiles -> user_licenses/
-- saved_channels/tts_usage/music_playlists) dejaba estas filas huérfanas
-- en vez de borrarlas de verdad. Se agrega la FK que faltaba, con
-- cascada. stats_daily queda afuera a propósito: es una fila agregada
-- GLOBAL por fecha (no por usuario) y ningún código de la app la usa.
alter table public.settings
  add constraint settings_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.filters
  add constraint filters_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.templates
  add constraint templates_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.chat_messages
  add constraint chat_messages_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.live_events
  add constraint live_events_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.song_requests
  add constraint song_requests_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

-- license_keys.created_by/redeemed_by tenían NO ACTION: hoy mismo,
-- borrar la cuenta de un admin que generó claves (o de cualquier usuario
-- que canjeó una) revienta con un error de foreign key y la cuenta queda
-- sin poder borrarse. La clave en sí es un registro administrativo que
-- conviene conservar — solo se limpia la referencia a quién fue.
alter table public.license_keys drop constraint license_keys_created_by_fkey;
alter table public.license_keys add constraint license_keys_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;
alter table public.license_keys drop constraint license_keys_redeemed_by_fkey;
alter table public.license_keys add constraint license_keys_redeemed_by_fkey
  foreign key (redeemed_by) references public.profiles(id) on delete set null;

-- Emails que ya gastaron su semana de prueba gratis alguna vez — evita
-- que alguien borre la cuenta y se registre de nuevo con el mismo email
-- para conseguir otros 7 días gratis. Se completa la primera vez que se
-- otorga la prueba (no al borrar la cuenta), así que también protege a
-- las cuentas que ya tuvieron una prueba desde antes de este cambio, no
-- solo las que se borren de acá en adelante. Sin RLS de cliente: solo la
-- tocan funciones SECURITY DEFINER.
create table if not exists public.used_trial_emails (
  email text primary key,
  first_trial_started_at timestamptz not null default now()
);
alter table public.used_trial_emails enable row level security;
revoke all on public.used_trial_emails from authenticated, anon;

insert into public.used_trial_emails (email)
  select distinct p.email from public.user_licenses ul
  join public.profiles p on p.id = ul.user_id
  where ul.source = 'trial'
  on conflict (email) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, email, role, username)
  values (
    new.id,
    new.email,
    case when new.email = 'siiknotic@gmail.com' then 'admin' else 'user' end,
    nullif(trim(new.raw_user_meta_data->>'username'), '')
  )
  on conflict (id) do update set email = excluded.email;

  -- La prueba gratis nunca debe poder tumbar el alta de la cuenta: si algo
  -- sale mal acá (constraint, lo que sea), se ignora y el signup sigue.
  begin
    if not exists (select 1 from public.used_trial_emails where email = new.email) then
      insert into public.user_licenses (user_id, source, expires_at, status, auto_renew)
      values (new.id, 'trial', now() + interval '7 days', 'active', false);
      insert into public.used_trial_emails (email) values (new.email)
        on conflict (email) do nothing;
    end if;
  exception when others then
    null;
  end;

  return new;
end;
$$;
