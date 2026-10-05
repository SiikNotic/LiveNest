import { useEffect, useRef, useState } from "react";
import { Gift, UserPlus, Crown, Share2 } from "lucide-react";
import { useStore } from "../lib/store";
import { useI18n } from "../lib/i18n";
import { shortenDefaultUsername } from "../lib/voiceManager";
import { AnimatePresence, motion, giftVariants, subscriberVariants, followerVariants, useMotionPreference } from "../motion";
import type { LiveEvent, LiveEventType } from "../lib/supabase";

// Sistema de prioridad pedido: gifts/subs (alta), follows/shares (media),
// likes/viewer no generan toast — ya es la misma línea que el overlay de
// OBS traza hoy (ver broadcastOverlayAlert en store.ts: "los likes no van
// al overlay, llegan en ráfagas"), así que esto mantiene la misma lógica
// consistente en vez de inventar un criterio nuevo.
type Priority = "high" | "medium";
const PRIORITY: Partial<Record<LiveEventType, Priority>> = {
  gift: "high",
  sub: "high",
  follow: "medium",
  share: "medium",
};

const AUTO_DISMISS_MS: Record<Priority, number> = { high: 4200, medium: 2600 };
// Nunca más de esta cantidad animando a la vez en pantalla — si llegan
// varios eventos juntos, el resto espera su turno en cola en vez de
// apilar animaciones simultáneas sin límite (sección 15 del pedido).
const MAX_VISIBLE = 3;

type ToastItem = { key: string; event: LiveEvent; priority: Priority };

const ICONS: Partial<Record<LiveEventType, typeof Gift>> = { gift: Gift, sub: Crown, follow: UserPlus, share: Share2 };

export function LiveEventToasts() {
  const events = useStore((s) => s.events);
  const { t } = useI18n();
  const { allowParticles } = useMotionPreference();
  const [visible, setVisible] = useState<ToastItem[]>([]);
  // Fuente de verdad real de "qué está visible ahora" — `visible` (el
  // state) es solo su reflejo para poder renderizar. Importante que las
  // mutaciones de queueRef/visibleRef vivan en funciones comunes, nunca
  // dentro del callback de un setState: React 18 en modo Strict invoca ese
  // callback dos veces para detectar que sea puro, y una mutación ahí
  // adentro (como un .splice() de la cola) hacía que la segunda invocación
  // viera la cola ya vaciada por la primera y pisara el resultado correcto
  // con uno vacío — por eso los toasts no llegaban a aparecer nunca.
  const queueRef = useRef<ToastItem[]>([]);
  const visibleRef = useRef<ToastItem[]>([]);
  const seenIds = useRef<Set<string> | null>(null);

  function flush() {
    const room = MAX_VISIBLE - visibleRef.current.length;
    if (room <= 0 || queueRef.current.length === 0) return;
    const next = queueRef.current.splice(0, room);
    visibleRef.current = [...visibleRef.current, ...next];
    setVisible(visibleRef.current);
  }

  function dismiss(key: string) {
    visibleRef.current = visibleRef.current.filter((t) => t.key !== key);
    setVisible(visibleRef.current);
    flush(); // puede haber algo esperando en la cola — le hace lugar ya mismo
  }

  useEffect(() => {
    // Primera vez que vemos `events` (al conectar, o al montar con
    // historial ya cargado): solo registramos los ids existentes, no
    // mostramos un toast por cada evento viejo de golpe.
    if (seenIds.current === null) {
      seenIds.current = new Set(events.map((e) => e.id));
      return;
    }
    for (const evt of events) {
      if (seenIds.current.has(evt.id)) continue;
      seenIds.current.add(evt.id);
      const priority = PRIORITY[evt.type];
      if (!priority) continue; // like/viewer — sin toast, a propósito
      queueRef.current.push({ key: evt.id, event: evt, priority });
    }
    flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  useEffect(() => {
    const timers = visible.map((item) =>
      setTimeout(() => dismiss(item.key), AUTO_DISMISS_MS[item.priority])
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function label(evt: LiveEvent): string {
    if (evt.type === "gift" && evt.detail) return `${evt.detail}${evt.count > 1 ? ` ×${evt.count}` : ""}`;
    if (evt.type === "sub" && evt.detail) return evt.detail;
    if (evt.type === "follow") return t("event_follow");
    if (evt.type === "share") return t("event_share");
    return "";
  }

  return (
    // Antes ocupaba casi todo el ancho en mobile (inset-x-3) y tapaba lo
    // que hubiera justo debajo del header — "bonitas pero estorban" fue el
    // feedback. Ahora es una tarjeta angosta anclada a la derecha en todos
    // los tamaños, como una notificación de esquina, no un banner.
    <div
      className="fixed top-[calc(4.5rem+env(safe-area-inset-top))] right-3 sm:right-4 z-[90] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {visible.map((item) => {
          const Icon = ICONS[item.event.type] ?? Gift;
          const isHigh = item.priority === "high";
          const variants =
            item.event.type === "gift" ? giftVariants : item.event.type === "sub" ? subscriberVariants : followerVariants;
          return (
            <motion.div
              key={item.key}
              layout
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => dismiss(item.key)}
              className={`pointer-events-auto card flex items-center gap-3 w-72 max-w-[calc(100vw-1.5rem)] cursor-pointer ${
                isHigh ? "border-primary/40" : ""
              }`}
              style={isHigh ? { boxShadow: "0 8px 28px var(--c-glow), 0 0 0 1px rgba(255,255,255,0.04) inset" } : undefined}
            >
              <div
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isHigh ? "bg-primary/15" : "bg-accent/15"
                }`}
              >
                <Icon className={`w-5 h-5 ${isHigh ? "text-primary" : "text-accent"}`} />
                {isHigh && allowParticles && (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                    <span
                      className="absolute -bottom-0.5 -left-0.5 w-1 h-1 rounded-full bg-primary animate-pulse-soft"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">@{shortenDefaultUsername(item.event.username)}</p>
                <p className={`text-xs truncate ${isHigh ? "text-primary" : "text-accent"} font-medium`}>
                  {label(item.event)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
