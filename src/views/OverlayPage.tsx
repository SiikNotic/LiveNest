import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Gift, UserPlus, Crown, Share2 } from "lucide-react";

// Cuánto tiempo queda un cartel en pantalla antes de esconderse solo.
const DISPLAY_MS = 5000;
// Duración de la transición de entrada/salida — tiene que coincidir con la
// clase `duration-300` de abajo.
const TRANSITION_MS = 300;

type OverlayAlert = {
  type: "gift" | "follow" | "sub" | "share";
  username: string;
  nickname?: string;
  giftName?: string;
  count?: number;
};

const ALERT_STYLE: Record<OverlayAlert["type"], { icon: typeof Gift; color: string; bg: string }> = {
  gift: { icon: Gift, color: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  follow: { icon: UserPlus, color: "#06b6d4", bg: "rgba(6,182,212,0.18)" },
  sub: { icon: Crown, color: "#10b981", bg: "rgba(16,185,129,0.18)" },
  share: { icon: Share2, color: "#38bdf8", bg: "rgba(56,189,248,0.18)" },
};

// El overlay no tiene sesión ni ajustes cargados (OBS no inicia sesión),
// así que no puede usar useI18n — se guía solo por el idioma del sistema
// donde corre OBS. Nunca es el foco de atención (el texto grande es
// siempre el nombre de usuario, universal), así que un mini-diccionario
// local alcanza sin arrastrar todo el sistema de traducciones.
const isEnglish = typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("en");

function alertText(a: OverlayAlert): { title: string; subtitle: string } {
  const name = a.nickname || a.username;
  if (a.type === "gift") {
    const giftName = a.giftName || (isEnglish ? "a gift" : "un regalo");
    const countTxt = a.count && a.count > 1 ? ` x${a.count}` : "";
    return isEnglish
      ? { title: `${name} sent ${giftName}${countTxt}`, subtitle: "New gift" }
      : { title: `${name} envió ${giftName}${countTxt}`, subtitle: "Nuevo regalo" };
  }
  if (a.type === "follow") {
    return isEnglish
      ? { title: `${name} followed you`, subtitle: "New follower" }
      : { title: `${name} te siguió`, subtitle: "Nuevo seguidor" };
  }
  if (a.type === "sub") {
    return isEnglish
      ? { title: `${name} subscribed`, subtitle: "New subscriber" }
      : { title: `${name} se suscribió`, subtitle: "Nueva suscripción" };
  }
  return isEnglish
    ? { title: `${name} shared your stream`, subtitle: "New share" }
    : { title: `${name} compartió tu directo`, subtitle: "Nuevo compartido" };
}

// Página pensada para pegar como "Fuente de navegador" en OBS/Streamlabs/
// XSplit (URL: livenest.net/?overlay=<token>, ver Notificaciones para
// copiar la propia). Sin login, sin el resto de la app — solo escucha por
// Realtime las alertas que el dashboard (la pestaña normal, ya conectada a
// TikTok) reenvía a ese token, y muestra una encima de otra en cola.
export function OverlayPage({ token }: { token: string }) {
  const [queue, setQueue] = useState<OverlayAlert[]>([]);
  const [current, setCurrent] = useState<OverlayAlert | null>(null);
  const [visible, setVisible] = useState(false);

  // Fondo transparente de verdad — <body> normalmente pinta un degradé fijo
  // (ver index.css), que acá taparía toda la escena de OBS detrás.
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.backgroundImage = "none";
  }, []);

  useEffect(() => {
    const channel = supabase.channel(`overlay-${token}`);
    channel
      .on("broadcast", { event: "alert" }, ({ payload }) => {
        setQueue((q) => [...q, payload as OverlayAlert]);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [token]);

  // Cuando no hay nada en pantalla y hay algo esperando, mostrar lo próximo.
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    setVisible(false);
    // Un tick para que el navegador registre el estado "oculto" antes de
    // pasar a "visible" — si no, no hay transición, aparece de golpe.
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [current, queue]);

  // Ocultarlo solo después de DISPLAY_MS.
  useEffect(() => {
    if (!current || !visible) return;
    const hideTimer = setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => clearTimeout(hideTimer);
  }, [current, visible]);

  // Sacarlo del todo recién cuando termina la transición de salida, para
  // no cortarla a la mitad.
  useEffect(() => {
    if (!current || visible) return;
    const clearTimer = setTimeout(() => setCurrent(null), TRANSITION_MS);
    return () => clearTimeout(clearTimer);
  }, [current, visible]);

  if (!current) return null;

  const { icon: Icon, color, bg } = ALERT_STYLE[current.type];
  const { title, subtitle } = alertText(current);

  return (
    <div className="min-h-screen flex items-start justify-center pt-10 px-4">
      <div
        className={`flex items-center gap-4 rounded-2xl border px-6 py-4 shadow-2xl transition-all duration-300 max-w-lg ${
          visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-3 scale-95"
        }`}
        style={{ background: "rgba(10,11,15,0.92)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(6px)" }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon className="w-7 h-7" style={{ color }} />
        </div>
        <div className="leading-tight min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{subtitle}</p>
          <p className="text-lg font-extrabold text-white truncate">{title}</p>
        </div>
      </div>
    </div>
  );
}
