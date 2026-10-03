// CORS compartido por todas las Edge Functions — antes cada una tenía su
// propio "Access-Control-Allow-Origin": "*", dejando que CUALQUIER sitio
// externo llamara a estos endpoints desde el navegador de un visitante
// (p. ej. para pegarse gratis del cupo de rate-limit de youtube-search, o
// para intentar llamadas usando la sesión de alguien que tuviera LiveNest
// abierto en otra pestaña). El header de CORS solo puede reflejar UN
// origen por respuesta (no una lista), así que se arma por request:
// si el Origin de quien llama está en la lista, se lo devuelve tal cual;
// si no, se devuelve el dominio real como fallback — eso hace que el
// navegador de quien llama desde otro sitio bloquee la respuesta por
// CORS (la Edge Function igual corre, pero el JS que la llamó nunca
// llega a leer el body).
//
// Esto protege llamadas desde OTRO SITIO WEB hechas por el navegador de
// un visitante — no es la barrera real contra un atacante con su propio
// backend/curl (que no manda Origin, o puede mandar cualquiera): esa
// barrera es la verificación de sesión/licencia que ya hace cada función
// (requireUser, has_active_license, etc.), que sigue corriendo igual.
const ALLOWED_ORIGINS = new Set([
  "https://livenest.net",
  // Fallback de GitHub Pages — por si alguna vez se sirve desde ahí en
  // vez del dominio propio (ver CLAUDE.md sobre los dos repos espejo).
  "https://siiknotic.github.io",
  // La app nativa de Android (Capacitor, sin server.hostname propio en
  // capacitor.config.ts) sirve el WebView desde este origen fijo.
  "https://localhost",
  "capacitor://localhost",
  // Desarrollo local (vite / vite preview).
  "http://localhost:5173",
  "http://localhost:4173",
]);

const FALLBACK_ORIGIN = "https://livenest.net";

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? req.headers.get("origin");
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : FALLBACK_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    // Le avisa a cualquier caché intermedio que la respuesta varía según
    // el Origin del pedido — sin esto, un CDN podría servirle a un sitio
    // la respuesta (con el Allow-Origin de otro) cacheada de otro.
    "Vary": "Origin",
  };
}
