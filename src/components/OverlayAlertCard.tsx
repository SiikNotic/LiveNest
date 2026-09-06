import { Gift, UserPlus, Crown, Share2 } from "lucide-react";
import type { OverlayEventType, OverlayAnimation, OverlayFont, OverlayAlertPayload } from "../lib/overlayConfig";

// El cartel en sí — lo comparten OverlayPage.tsx (lo que ve OBS) y el
// preview en vivo de NotificationsView (lo que ve la persona mientras
// configura). Un solo lugar para el look real, así el preview nunca queda
// desincronizado de cómo se ve de verdad en el stream.

const ICON: Record<OverlayEventType, { icon: typeof Gift; color: string; bg: string }> = {
  gift: { icon: Gift, color: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  follow: { icon: UserPlus, color: "#06b6d4", bg: "rgba(6,182,212,0.18)" },
  sub: { icon: Crown, color: "#10b981", bg: "rgba(16,185,129,0.18)" },
  share: { icon: Share2, color: "#38bdf8", bg: "rgba(56,189,248,0.18)" },
};

// Cada estilo define cómo se ve "oculto" (antes de entrar / después de
// salir) — el estado "visible" siempre vuelve a opacity-100 sin transformar.
// `bounce` usa una curva "back" (se pasa un poco y vuelve) para que se
// sienta distinto de `pop`, no solo más grande.
const ANIMATION_HIDDEN: Record<OverlayAnimation, string> = {
  slide: "opacity-0 -translate-y-4 scale-100",
  fade: "opacity-0 scale-100",
  pop: "opacity-0 scale-75",
  bounce: "opacity-0 scale-50",
};
const ANIMATION_TIMING: Partial<Record<OverlayAnimation, string>> = {
  bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

const FONT_CLASS: Record<OverlayFont, string> = {
  clean: "font-extrabold",
  // Con fallback explícito: si Bebas Neue no llegó a cargar (red lenta,
  // bloqueador de contenido) cae a un sans-serif del sistema en vez de al
  // serif por defecto del navegador, que se ve roto.
  impact: "font-[Bebas_Neue,sans-serif] tracking-wide text-xl",
};

export function OverlayAlertCard({ alert, visible }: { alert: OverlayAlertPayload; visible: boolean }) {
  const { icon: Icon, color, bg } = ICON[alert.type];
  const hiddenClasses = ANIMATION_HIDDEN[alert.animation];
  const timing = ANIMATION_TIMING[alert.animation];

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border px-6 py-4 shadow-2xl transition-all duration-300 max-w-lg ${
        visible ? "opacity-100 translate-y-0 scale-100" : hiddenClasses
      }`}
      style={{
        background: "rgba(10,11,15,0.92)",
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(6px)",
        transitionTimingFunction: timing,
      }}
    >
      {alert.imageUrl ? (
        <img src={alert.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon className="w-7 h-7" style={{ color }} />
        </div>
      )}
      <div className="leading-tight min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{alert.subtitle}</p>
        <p className={`text-lg text-white truncate ${FONT_CLASS[alert.font]}`}>{alert.title}</p>
      </div>
    </div>
  );
}
