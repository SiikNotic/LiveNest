# Login con Discord

El código de LiveNest (web y app) ya soporta "Continuar con Discord" —
mismo botón, mismo flujo, que "Continuar con Google" (`src/lib/auth.tsx`,
`src/views/AuthView.tsx`). Pero a diferencia de agregar código, **habilitar
un proveedor OAuth nuevo en Supabase requiere un par de pasos manuales
fuera de este repo** que nadie puede hacer por vos: crear la aplicación en
Discord y pegar sus credenciales en el dashboard de Supabase. Sin esto, el
botón va a aparecer pero al tocarlo Supabase va a devolver un error
("Unsupported provider" o similar).

## 1. Crear la app en el Discord Developer Portal

1. Entrá a <https://discord.com/developers/applications> con tu cuenta de
   Discord y creá una aplicación nueva (el nombre es solo lo que la gente
   va a ver en la pantalla de autorización — ej. "LiveNest").
2. En el menú de la izquierda, **OAuth2 → General**: ahí están el
   **Client ID** y el **Client Secret** (el secret hay que generarlo/verlo
   con "Reset Secret" si es la primera vez) — los vas a necesitar en el
   paso 3.
3. En la misma sección **OAuth2 → General → Redirects**, agregá esta URL
   exacta (es la de Supabase, no la de LiveNest — Discord siempre vuelve
   ahí primero, y Supabase es quien redirige después a la app/web):

   ```
   https://wlkzpvfkczkrvuueblfq.supabase.co/auth/v1/callback
   ```

## 2. Habilitarlo en Supabase

1. Dashboard de Supabase → el proyecto de LiveNest → **Authentication →
   Providers**.
2. Buscá **Discord** en la lista, activalo, y pegá el **Client ID** y
   **Client Secret** del paso 1.
3. Guardar. No hace falta tocar nada de **URL Configuration** — las
   Redirect URLs de la app (el dominio de `livenest.net` y el esquema
   nativo `net.livenest.app://auth-callback`) ya están ahí porque las usa
   Google, y valen para cualquier proveedor por igual.

## 3. Listo

Con eso, el botón "Continuar con Discord" que ya está en la pantalla de
login (`AuthView.tsx`) funciona tanto en la web como en la app — mismo
mecanismo que Google: en la web Supabase redirige de vuelta a la misma
pestaña, en la app nativa vuelve vía el esquema `net.livenest.app://` que
ya existe en `AndroidManifest.xml`.

Una cuenta que entra por primera vez con Discord se crea igual que una de
Google: sin username (pasa por `UsernameRequiredView` para elegir uno) y
sin membresía, salvo que sea la primera vez que ese email pasa por
LiveNest y todavía no gastó la prueba gratis de 7 días (ver
`handle_new_user()` / `used_trial_emails` en las migraciones de Supabase).
