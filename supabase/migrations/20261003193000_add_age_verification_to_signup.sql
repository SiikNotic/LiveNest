/*
# Verificación de edad en el alta de cuenta

## Resumen
- `profiles.birth_date` (date, nullable): fecha de nacimiento declarada.
  Nullable porque las cuentas de Google/Discord (OAuth) no pasan por el
  formulario de registro de LiveNest — nunca se les pide ahí. Para esas
  cuentas, App.tsx pide la fecha en un paso aparte después del login (ver
  AgeConfirmationRequiredView.tsx), igual que ya hace con el username.
- `profiles.parental_consent` (boolean, default false): declarado por
  quien se registra, confirmando que un padre/madre/tutor autorizó el uso
  de la cuenta — obligatorio solo para menores de 18.

## Enforcement
El chequeo real vive en handle_new_user() (SECURITY DEFINER, ya corre en
cada alta) — no solo en el formulario del cliente:
- Si el signup manda birth_date y la edad calculada es menor a 13, se
  rechaza el alta por completo (RAISE EXCEPTION aborta el INSERT en
  auth.users también, porque este trigger corre AFTER INSERT dentro de
  la misma transacción que Supabase Auth usa para crear la cuenta).
- Si la edad está entre 13 y 17 y no vino parental_consent=true, se
  rechaza igual.
- Si no vino birth_date en absoluto (típicamente OAuth), no se bloquea
  acá — queda pendiente y la app lo pide después, server-side también
  (ver confirm_birth_date() más abajo, usada por esa pantalla).
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS parental_consent boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_birth_date date := NULLIF(new.raw_user_meta_data->>'birth_date', '')::date;
  v_parental_consent boolean := COALESCE((new.raw_user_meta_data->>'parental_consent')::boolean, false);
  v_age int;
BEGIN
  IF v_birth_date IS NOT NULL THEN
    v_age := date_part('year', age(v_birth_date));
    IF v_age < 13 THEN
      RAISE EXCEPTION 'signup_under_minimum_age';
    END IF;
    IF v_age < 18 AND NOT v_parental_consent THEN
      RAISE EXCEPTION 'signup_requires_parental_consent';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, role, username, birth_date, parental_consent)
  VALUES (
    new.id,
    new.email,
    CASE WHEN new.email = 'siiknotic@gmail.com' THEN 'admin' ELSE 'user' END,
    NULLIF(TRIM(new.raw_user_meta_data->>'username'), ''),
    v_birth_date,
    v_parental_consent
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- La prueba gratis nunca debe poder tumbar el alta de la cuenta: si algo
  -- sale mal acá (constraint, lo que sea), se ignora y el signup sigue.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.used_trial_emails WHERE email = new.email) THEN
      INSERT INTO public.user_licenses (user_id, source, expires_at, status, auto_renew)
      VALUES (new.id, 'trial', now() + interval '7 days', 'active', false);
      INSERT INTO public.used_trial_emails (email) VALUES (new.email)
        ON CONFLICT (email) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN new;
END;
$function$;

-- ============================================================
-- confirm_birth_date — para cuentas que llegaron sin birth_date
-- (típicamente OAuth: Google/Discord nunca pasan por el formulario de
-- registro de LiveNest). La pantalla AgeConfirmationRequiredView llama
-- a esto una sola vez, server-side, con la misma regla de arriba — no
-- alcanza con que el cliente oculte el checkbox de consentimiento.
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_birth_date(p_birth_date date, p_parental_consent boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_age int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_birth_date IS NULL THEN
    RAISE EXCEPTION 'birth_date_required';
  END IF;

  v_age := date_part('year', age(p_birth_date));
  IF v_age < 13 THEN
    RAISE EXCEPTION 'signup_under_minimum_age';
  END IF;
  IF v_age < 18 AND NOT COALESCE(p_parental_consent, false) THEN
    RAISE EXCEPTION 'signup_requires_parental_consent';
  END IF;

  UPDATE public.profiles
  SET birth_date = p_birth_date, parental_consent = COALESCE(p_parental_consent, false)
  WHERE id = v_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_birth_date(date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_birth_date(date, boolean) TO authenticated;
