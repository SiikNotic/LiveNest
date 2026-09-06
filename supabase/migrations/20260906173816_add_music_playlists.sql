-- Playlists propias del usuario (estilo "guardar canciones en una lista
-- para reproducirla cuando quiera"), separadas de song_requests (la cola
-- de pedidos en vivo) y separadas también de fallback_playlist_id (que
-- apunta a una playlist YA EXISTENTE en YouTube, no a una armada acá
-- adentro). Cada canción se agrega a mano desde el reproductor (botón
-- "Agregar a playlist" sobre lo que está sonando) o podría agregarse por
-- link más adelante — por ahora solo lo primero.
create table if not exists music_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists music_playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references music_playlists(id) on delete cascade,
  -- Denormalizado a propósito (en vez de resolverlo con un JOIN en la
  -- política de RLS) — mismo patrón simple que ya usan filters/templates/
  -- song_requests en esta base.
  user_id uuid not null default auth.uid(),
  video_id text not null,
  video_title text,
  video_channel text,
  created_at timestamptz not null default now()
);

create index if not exists music_playlist_items_playlist_id_idx on music_playlist_items(playlist_id);

alter table music_playlists enable row level security;
alter table music_playlist_items enable row level security;

create policy "Users manage their own playlists"
  on music_playlists for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own playlist items"
  on music_playlist_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
