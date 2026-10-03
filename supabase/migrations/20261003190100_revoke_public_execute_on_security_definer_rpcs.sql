-- El linter de seguridad de Supabase (get_advisors) marcó 10 funciones
-- SECURITY DEFINER como ejecutables por `anon` (sin login) y por PUBLIC —
-- el mismo bug que ya se había encontrado y corregido para
-- expire_stale_licenses/sync_profile_email en
-- fix_execute_revoke_target_public_not_roles.sql: Postgres otorga EXECUTE
-- a PUBLIC por default en toda función nueva, y anon/authenticated heredan
-- ese grant aparte de lo que se les otorgue explícito — un
-- "GRANT ... TO authenticated" nunca saca lo heredado de PUBLIC, hace
-- falta revocarlo de PUBLIC directamente.
--
-- Impacto real verificado antes de este fix (ninguna fuga de datos): las
-- 10 funciones ya validan auth.uid() internamente (lo rechazan si es NULL,
-- o solo operan sobre la fila del propio usuario) — admin_set_* además
-- re-chequean el rank del que llama. Para una llamada anónima de verdad
-- (sin JWT), auth.uid() es NULL, así que todas terminaban en
-- "not_authenticated"/"insufficient_permissions" o simplemente no
-- afectaban ninguna fila. El problema no era una fuga, era superficie de
-- ataque innecesaria: cualquiera sin cuenta podía golpear estos endpoints
-- RPC públicos (vía /rest/v1/rpc/<función>) para probar/martillar el
-- backend sin motivo.
--
-- has_active_license(uuid) y tts-proxy: el Edge Function tts-proxy llama a
-- esta RPC reenviando el Authorization del propio usuario (su JWT real),
-- no la service role ni una sesión anónima de verdad — Postgres ve ese
-- llamado como el rol `authenticated`, nunca `anon`. Revocar de PUBLIC/anon
-- acá no rompe ese flujo.
--
-- Verificado con has_function_privilege() en vivo que REVOKE ... FROM
-- PUBLIC NO alcanzaba acá: Supabase además le otorga EXECUTE a `anon`
-- (y a `authenticated`) de forma directa a nivel de esquema para toda
-- función nueva en `public` — un default propio de la plataforma, aparte
-- del default de PUBLIC de Postgres. Hace falta revocarlo de `anon`
-- explícitamente, no solo de PUBLIC.
REVOKE EXECUTE ON FUNCTION public.admin_set_ban_status(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_rank(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_staff_permission(text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_profile() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_settings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_rank() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_license(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_tts_usage() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_license_key(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.self_heal_expired_license() FROM PUBLIC, anon;

-- Re-confirmar (idempotente) que los usuarios logueados de verdad siguen
-- pudiendo llamarlas — el REVOKE de PUBLIC de arriba no les saca nada,
-- pero se deja explícito para que este archivo sea la fuente de verdad
-- completa de a quién le queda EXECUTE en cada una.
GRANT EXECUTE ON FUNCTION public.admin_set_ban_status(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_rank(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_permission(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_rank() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_license(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_tts_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_license_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.self_heal_expired_license() TO authenticated;
