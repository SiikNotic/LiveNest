-- Configuración por evento (regalo/seguidor/sub/compartido) de la alerta
-- visual para OBS: animación, tipografía, plantilla de texto propia
-- (null = usa la misma frase que la alerta de voz) e imagen/gif propia.
-- JSONB en vez de columnas sueltas a propósito acá: son 4 eventos x varios
-- campos que van a seguir creciendo (el usuario ya pidió más opciones una
-- vez), así que una columna por campo por evento se volvería inmanejable
-- rápido. El resto de la tabla sigue con el patrón de columna por campo.
alter table settings
  add column if not exists overlay_config jsonb not null default '{
    "gift": {"animation":"slide","font":"clean","text_template":null,"image_url":null,"use_real_gift_image":true},
    "follow": {"animation":"slide","font":"clean","text_template":null,"image_url":null,"use_real_gift_image":false},
    "sub": {"animation":"slide","font":"clean","text_template":null,"image_url":null,"use_real_gift_image":false},
    "share": {"animation":"slide","font":"clean","text_template":null,"image_url":null,"use_real_gift_image":false}
  }'::jsonb;

-- Bucket para las imágenes/gifs propios de cada alerta — mismo patrón que
-- alert-sounds: público para lectura (OBS necesita cargarlas por URL sin
-- login), solo el dueño autenticado puede escribir en su propia carpeta,
-- y subir requiere licencia activa desde el arranque (igual que los
-- sonidos personalizados) para no convertir el bucket en un CDN gratis.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'overlay-images',
  'overlay-images',
  true,
  8388608,
  ARRAY['image/png', 'image/gif', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for overlay images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'overlay-images');

CREATE POLICY "Members can upload their own overlay images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'overlay-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_active_license(auth.uid())
  );

CREATE POLICY "Users can update their own overlay images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'overlay-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'overlay-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own overlay images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'overlay-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
