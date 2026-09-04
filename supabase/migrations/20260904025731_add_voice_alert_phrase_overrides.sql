-- Permite personalizar qué dice la voz en cada tipo de alerta (regalo,
-- follow, like, share, sub) — antes era una frase fija en el código
-- (voice_alert_* en i18n.ts). NULL = seguir usando esa frase por defecto
-- según el idioma; si tiene texto, se usa eso (con placeholders {name},
-- {gift}, {count} reemplazados en el cliente, mismo patrón que ya usa la
-- plantilla de lectura de chat con {user}/{message}/{time}).
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS voice_alert_gift_single text,
  ADD COLUMN IF NOT EXISTS voice_alert_gift_multi text,
  ADD COLUMN IF NOT EXISTS voice_alert_follow text,
  ADD COLUMN IF NOT EXISTS voice_alert_like_single text,
  ADD COLUMN IF NOT EXISTS voice_alert_like_multi text,
  ADD COLUMN IF NOT EXISTS voice_alert_share text,
  ADD COLUMN IF NOT EXISTS voice_alert_sub text;
