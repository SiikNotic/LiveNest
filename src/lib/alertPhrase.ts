import { useI18n, type TranslationKey } from "./i18n";
import type { Settings } from "./supabase";
import { normalizeOverlayConfig, type OverlayEventType, type OverlayAlertPayload } from "./overlayConfig";

/** Frase que lee la voz (o se muestra en el cartel visual de OBS) para una
 *  alerta (regalo/follow/like/share/sub): usa la que la persona haya
 *  escrito si hay una, si no la de siempre según el idioma. Mismos
 *  placeholders {name}/{gift}/{count} en todos los casos, así da lo mismo
 *  cuál se use. */
export function fillAlertPhrase(
  custom: string | null | undefined,
  fallbackKey: TranslationKey,
  vars: Record<string, string | number>
): string {
  const tVoice = useI18n.getState().t;
  if (!custom?.trim()) return tVoice(fallbackKey, vars);
  let text = custom;
  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${key}}`, String(value));
  }
  return text;
}

const OVERLAY_LABEL_KEY: Record<OverlayEventType, TranslationKey> = {
  gift: "overlay_label_gift",
  follow: "overlay_label_follow",
  sub: "overlay_label_sub",
  share: "overlay_label_share",
};

/** Misma frase (y misma clave de respaldo) que ya usa la alerta de VOZ para
 *  este evento — así el texto visual por defecto dice exactamente lo mismo
 *  que se está leyendo en voz alta, salvo que el usuario haya puesto un
 *  texto propio solo para el cartel (overlay_config.text_template). */
function voicePhraseFor(s: Settings | null, type: OverlayEventType, count: number | undefined): [string | null, TranslationKey] {
  if (type === "gift") {
    return (count ?? 1) > 1
      ? [s?.voice_alert_gift_multi ?? null, "voice_alert_gift_multi"]
      : [s?.voice_alert_gift_single ?? null, "voice_alert_gift_single"];
  }
  if (type === "follow") return [s?.voice_alert_follow ?? null, "voice_alert_follow"];
  if (type === "sub") return [s?.voice_alert_sub ?? null, "voice_alert_sub"];
  return [s?.voice_alert_share ?? null, "voice_alert_share"];
}

/** Arma el cartel completo (texto, imagen, animación, tipografía) para un
 *  evento — la usan tanto el envío real por Realtime (store.ts) como el
 *  preview en vivo de Notificaciones, para que nunca queden
 *  desincronizados: lo que se ve al configurar es lo que se ve en OBS. */
export function resolveOverlayAlert(
  settings: Settings | null,
  type: OverlayEventType,
  vars: { name: string; gift?: string; count?: number },
  giftImage?: string | null
): OverlayAlertPayload {
  const cfg = normalizeOverlayConfig(settings?.overlay_config)[type];
  const [voiceCustom, fallbackKey] = voicePhraseFor(settings, type, vars.count);
  const title = fillAlertPhrase(cfg.text_template ?? voiceCustom, fallbackKey, vars);
  const subtitle = useI18n.getState().t(OVERLAY_LABEL_KEY[type]);
  const imageUrl = (type === "gift" && cfg.use_real_gift_image && giftImage) || cfg.image_url || null;
  return { type, title, subtitle, imageUrl, animation: cfg.animation, font: cfg.font };
}
