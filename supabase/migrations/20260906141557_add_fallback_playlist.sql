-- Lista de YouTube de respaldo: cuando la cola de pedidos está
-- completamente vacía (nadie pidió nada) y el autoplay está activado, se
-- reproduce un tema de esta lista en vez de quedarse en silencio. Un
-- pedido real de chat siempre entra en la cola normal y se reproduce en
-- cuanto termina el tema de respaldo actual — nunca lo interrumpe a
-- mitad, pero tampoco espera detrás de una lista entera precargada,
-- porque los temas de respaldo se van pidiendo de a uno, nunca en bloque.
alter table settings
  add column if not exists fallback_playlist_id text,
  add column if not exists fallback_playlist_enabled boolean not null default false;

-- Distingue un tema de respaldo (username = "LiveNest" u otro genérico)
-- de un pedido real, para que la UI de la cola pueda mostrarlo distinto
-- si hace falta más adelante.
alter table song_requests
  add column if not exists is_fallback boolean not null default false;
