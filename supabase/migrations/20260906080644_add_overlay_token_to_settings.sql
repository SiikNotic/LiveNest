-- Token público (no requiere login) que identifica el canal de Realtime
-- por el que el dashboard reenvía las alertas visuales (regalo, follow,
-- sub, compartido) para que las consuma la página de overlay pensada
-- para pegar como "Fuente de navegador" en OBS/Streamlabs/etc.
-- No es sensible en el sentido de datos privados, pero SÍ es una
-- capacidad: quien lo tenga puede ver las alertas de ese canal en
-- tiempo real, así que es regenerable desde Notificaciones si se filtra.
alter table settings
  add column if not exists overlay_token uuid unique default gen_random_uuid();

update settings set overlay_token = gen_random_uuid() where overlay_token is null;

alter table settings alter column overlay_token set not null;
