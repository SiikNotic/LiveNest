/*
# Tabla api_secrets — almacenamiento seguro de claves

Almacena claves de APIs de terceros (ej. Euler Stream) para que las Edge Functions
las lean con el service role. El frontend NUNCA debe leer esta tabla — las políticas
de RLS bloquean completamente el acceso anónimo/autenticado.

1. Nueva tabla
- `api_secrets`: id, provider, key_name, secret_value (text), created_at, updated_at.

2. Seguridad
- RLS habilitado.
- NO se crean políticas para anon ni authenticated → la tabla es inaccesible
  desde el cliente (anon key). Solo el service role (que bypassa RLS) puede leerla,
  exclusivamente desde las Edge Functions.
*/

CREATE TABLE IF NOT EXISTS api_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  key_name text NOT NULL,
  secret_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (provider, key_name)
);

ALTER TABLE api_secrets ENABLE ROW LEVEL SECURITY;

-- Intencionalmente SIN políticas: bloquea todo acceso desde el cliente (anon/auth).
-- Solo el service role puede acceder (bypassa RLS), usado por las Edge Functions.

INSERT INTO api_secrets (provider, key_name, secret_value)
VALUES ('eulerstream', 'api_key', 'tk_d771cba8da0f150e481735bdac166c8c45f09c1338f3504d')
ON CONFLICT (provider, key_name) DO UPDATE
  SET secret_value = EXCLUDED.secret_value, updated_at = now();
