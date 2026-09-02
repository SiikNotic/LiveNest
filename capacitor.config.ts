import type { CapacitorConfig } from "@capacitor/cli";

// Envuelve la SPA web existente (src/, misma build de Vite) en un shell
// nativo de Android con Capacitor. No reemplaza ni modifica el deploy
// web (GitHub Pages / livenest.net) — usa el mismo `dist/` como fuente,
// solo que empaquetado dentro de la app en vez de servido desde un CDN.
const config: CapacitorConfig = {
  appId: "net.livenest.app",
  appName: "LiveNest",
  webDir: "dist",
  android: {
    // El WebView de Android por defecto bloquea tráfico "cleartext" (http
    // sin TLS). Todo lo que usa LiveNest ya es https/wss (Supabase, la
    // Edge Function de TikTok, YouTube), así que no hace falta habilitarlo.
    allowMixedContent: false,
  },
};

export default config;
