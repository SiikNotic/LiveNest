-- Agrega "enabled" (interruptor por evento) al default de overlay_config y
-- a las filas ya existentes que no lo tengan — mismo nivel de control que
-- ya tienen el sonido (opción "ninguno" por evento) y la voz (interruptor
-- por evento). La app igual lo resuelve en runtime vía
-- normalizeOverlayConfig() aunque falte, pero conviene que el default de
-- la columna quede alineado con el de la app para las filas nuevas.
alter table settings
  alter column overlay_config set default '{
    "gift": {"enabled":true,"animation":"slide","font":"clean","text_template":null,"image_url":null,"use_real_gift_image":true},
    "follow": {"enabled":true,"animation":"slide","font":"clean","text_template":null,"image_url":null,"use_real_gift_image":false},
    "sub": {"enabled":true,"animation":"slide","font":"clean","text_template":null,"image_url":null,"use_real_gift_image":false},
    "share": {"enabled":true,"animation":"slide","font":"clean","text_template":null,"image_url":null,"use_real_gift_image":false}
  }'::jsonb;

update settings
set overlay_config = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(overlay_config, '{gift,enabled}', 'true'::jsonb, true),
      '{follow,enabled}', 'true'::jsonb, true
    ),
    '{sub,enabled}', 'true'::jsonb, true
  ),
  '{share,enabled}', 'true'::jsonb, true
)
where not (
  overlay_config->'gift' ? 'enabled'
  and overlay_config->'follow' ? 'enabled'
  and overlay_config->'sub' ? 'enabled'
  and overlay_config->'share' ? 'enabled'
);
