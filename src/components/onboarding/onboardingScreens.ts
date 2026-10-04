import type { TranslationKey } from "../../lib/i18n";

export type OnboardingVariant = "live" | "chat" | "voice" | "music" | "gifts" | "start";

export interface OnboardingScreen {
  id: OnboardingVariant;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  /** Render premium en /public/onboarding/<id>.png — oro+plata sobre
   *  transparente, encargado aparte (ver prompts en el historial de la
   *  conversación) en vez de geometría procedural de Three.js, que se veía
   *  genérica. Reemplazó por completo al hero 3D con WebGL. */
  image: string;
}

// Las 6 pantallas pedidas: Live, Chat, Voice Engine, Music, Gifts, Get
// Started — contenido real de LiveNest (identidad LIVE/VOICE/MUSIC/CHAT/
// CREATOR/STREAMING, sin pájaros/nidos/plumas), nunca texto hardcodeado
// (todo sale de i18n.ts, ES+EN).
export const ONBOARDING_SCREENS: OnboardingScreen[] = [
  { id: "live", titleKey: "onboarding_live_title", descKey: "onboarding_live_desc", image: "/onboarding/live.png" },
  { id: "chat", titleKey: "onboarding_chat_title", descKey: "onboarding_chat_desc", image: "/onboarding/chat.png" },
  { id: "voice", titleKey: "onboarding_voice_title", descKey: "onboarding_voice_desc", image: "/onboarding/voice.png" },
  { id: "music", titleKey: "onboarding_music_title", descKey: "onboarding_music_desc", image: "/onboarding/music.png" },
  { id: "gifts", titleKey: "onboarding_gifts_title", descKey: "onboarding_gifts_desc", image: "/onboarding/gifts.png" },
  { id: "start", titleKey: "onboarding_start_title", descKey: "onboarding_start_desc", image: "/onboarding/start.png" },
];

const SEEN_KEY_PREFIX = "livenest_onboarding_seen_";

// localStorage, no Supabase — no hay ninguna razón técnica para agregar
// una columna nueva a `profiles` solo para un flag de "ya vio el
// onboarding una vez" (el pedido original es explícito: no tocar el
// esquema sin necesidad). Si la persona cambia de navegador/dispositivo,
// en el peor caso vuelve a ver el onboarding — no rompe nada.
export function hasSeenOnboarding(userId: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY_PREFIX + userId) === "1";
  } catch {
    return true; // si localStorage no está disponible, no bloquear al usuario
  }
}

export function markOnboardingSeen(userId: string): void {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + userId, "1");
  } catch {
    // best-effort
  }
}
