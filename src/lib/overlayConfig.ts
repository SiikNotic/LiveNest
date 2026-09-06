// Configuración por evento de la alerta visual para OBS (ver
// src/views/OverlayPage.tsx y la sección "Alerta visual" en
// NotificationsView). Vive en su propio archivo porque la usan tres
// lugares que si no tendrían que duplicarla: store.ts (arma el payload que
// se manda por Realtime), NotificationsView.tsx (el editor + preview) y
// OverlayPage.tsx (cómo se ve cada evento).
export type OverlayAnimation = "slide" | "fade" | "pop" | "bounce";
export type OverlayFont = "clean" | "impact";
export type OverlayEventType = "gift" | "follow" | "sub" | "share";

export type OverlayEventConfig = {
  // Control simple, al mismo nivel que ya tienen el sonido (interruptor
  // global + "ninguno" por evento) y la voz (interruptor por evento): sin
  // esto, la única forma de "apagar" la alerta visual de un evento puntual
  // era no abrir la fuente de OBS — quedaba desalineado con cómo se
  // apagan las otras dos, que es justo lo que hace sentir todo esto
  // "desincronizado" al configurarlo.
  enabled: boolean;
  animation: OverlayAnimation;
  font: OverlayFont;
  // null = usar la misma frase que ya está configurada para la alerta de
  // voz de ese evento (ver voice_alert_* en Settings) — mismos placeholders
  // {name}/{gift}/{count}. No-null la pisa solo para el cartel visual.
  text_template: string | null;
  // Gif/png subido por el usuario (ver uploadOverlayImage en supabase.ts).
  image_url: string | null;
  // Solo tiene efecto en el evento "gift": si TikTok mandó la imagen real
  // del regalo (ver extractGiftImage en tiktokConnection.ts) y esto está
  // activado, se prioriza sobre image_url. Si no hay imagen real
  // disponible, cae a image_url igual.
  use_real_gift_image: boolean;
};

export type OverlayConfig = Record<OverlayEventType, OverlayEventConfig>;

const BASE_EVENT_CONFIG: OverlayEventConfig = {
  enabled: true,
  animation: "slide",
  font: "clean",
  text_template: null,
  image_url: null,
  use_real_gift_image: false,
};

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  gift: { ...BASE_EVENT_CONFIG, use_real_gift_image: true },
  follow: { ...BASE_EVENT_CONFIG },
  sub: { ...BASE_EVENT_CONFIG },
  share: { ...BASE_EVENT_CONFIG },
};

// Lo que de verdad viaja por Realtime — ya resuelto (texto final, imagen
// final, animación, tipografía). A propósito no lleva el evento crudo ni
// la config: así OverlayPage.tsx (sin sesión, sin i18n) no necesita saber
// nada de plantillas ni de dónde salió la imagen, solo pintar lo que le
// llega. Toda esa resolución pasa una sola vez, en store.ts, con acceso
// completo a settings/i18n. Ver también OverlayAlertCard.tsx, el
// componente que de verdad la dibuja (compartido entre OverlayPage y el
// preview en vivo de NotificationsView).
export type OverlayAlertPayload = {
  type: OverlayEventType;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  animation: OverlayAnimation;
  font: OverlayFont;
};

export const OVERLAY_EVENT_TYPES: OverlayEventType[] = ["gift", "follow", "sub", "share"];
export const OVERLAY_ANIMATIONS: OverlayAnimation[] = ["slide", "fade", "pop", "bounce"];
export const OVERLAY_FONTS: OverlayFont[] = ["clean", "impact"];

// `settings.overlay_config` llega como JSON crudo desde la base — puede
// venirle faltando eventos o campos (una fila vieja, un valor tocado a
// mano). Nunca hay que confiar en el tipo de TypeScript solo: esto
// completa cualquier hueco con el default antes de usarlo.
export function normalizeOverlayConfig(raw: unknown): OverlayConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<OverlayEventType, Partial<OverlayEventConfig>>>;
  const merge = (base: OverlayEventConfig, over: Partial<OverlayEventConfig> | undefined): OverlayEventConfig => ({
    ...base,
    ...(over ?? {}),
  });
  return {
    gift: merge(DEFAULT_OVERLAY_CONFIG.gift, r.gift),
    follow: merge(DEFAULT_OVERLAY_CONFIG.follow, r.follow),
    sub: merge(DEFAULT_OVERLAY_CONFIG.sub, r.sub),
    share: merge(DEFAULT_OVERLAY_CONFIG.share, r.share),
  };
}
