import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { OverlayAlertPayload } from "../lib/overlayConfig";
import { OverlayAlertCard } from "../components/OverlayAlertCard";

// Cuánto tiempo queda un cartel en pantalla antes de esconderse solo.
const DISPLAY_MS = 5000;
// Duración de la transición de entrada/salida — tiene que coincidir con la
// clase `duration-300` de OverlayAlertCard.
const TRANSITION_MS = 300;

// Página pensada para pegar como "Fuente de navegador" en OBS/Streamlabs/
// XSplit (URL: livenest.net/?overlay=<token>, ver Notificaciones para
// copiar la propia). Sin login, sin el resto de la app — solo escucha por
// Realtime las alertas que el dashboard (la pestaña normal, ya conectada a
// TikTok) reenvía a ese token, ya resueltas del todo (texto, imagen,
// animación, tipografía — ver broadcastOverlayAlert en store.ts), y las
// muestra una a la vez, en cola si llegan varias juntas.
export function OverlayPage({ token }: { token: string }) {
  const [queue, setQueue] = useState<OverlayAlertPayload[]>([]);
  const [current, setCurrent] = useState<OverlayAlertPayload | null>(null);
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
        setQueue((q) => [...q, payload as OverlayAlertPayload]);
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

  return (
    <div className="min-h-screen flex items-start justify-center pt-10 px-4">
      <OverlayAlertCard alert={current} visible={visible} />
    </div>
  );
}
