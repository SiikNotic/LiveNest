import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// LiveNest se usa durante directos largos, muchas veces en el celular más
// viejo que tiene la persona a mano — no en una notebook de desarrollo. El
// nivel de efectos visuales (3D, partículas, parallax) se adapta a lo que
// el dispositivo puede sostener de verdad, nunca al revés: la
// funcionalidad (leer el chat, anunciar eventos) NUNCA se apaga por esto,
// solo el adorno visual alrededor.
export type PerformanceTier = "premium" | "balanced" | "performance";

export interface MotionPreference {
  tier: PerformanceTier;
  // true si el sistema operativo pide "reducir movimiento" — además de
  // bajar el tier, esto apaga parallax/rotación por completo (no solo
  // los reduce), como pide accesibilidad.
  reducedMotion: boolean;
  allow3D: boolean;
  allowParticles: boolean;
  allowParallax: boolean;
}

function detectStaticTier(): PerformanceTier {
  if (typeof navigator === "undefined") return "balanced";
  const cores = navigator.hardwareConcurrency ?? 4;
  // deviceMemory (GB) solo existe en Chrome/Edge/Android — en Safari/
  // Firefox no está, así que si falta nos quedamos con los cores nomás,
  // del lado conservador (mejor subestimar que trabar un directo).
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (mem !== undefined) {
    if (mem <= 2) return "performance";
    if (mem <= 4) return "balanced";
    return cores >= 6 ? "premium" : "balanced";
  }
  if (cores <= 2) return "performance";
  if (cores <= 4) return "balanced";
  return "premium";
}

// Un downgrade (nunca upgrade) basado en los primeros frames reales de la
// página — si el dispositivo YA viene lento con poco en pantalla, no tiene
// sentido creer en lo que dicen hardwareConcurrency/deviceMemory. Se mide
// una sola vez, en una ventana corta y acotada (~600ms), y el loop de
// requestAnimationFrame se cancela solo al terminar — nunca queda un timer
// vivo de por vida (ver sección de performance del pedido original).
function sampleFpsOnce(onResult: (fps: number) => void): () => void {
  if (typeof requestAnimationFrame === "undefined") {
    onResult(60);
    return () => {};
  }
  let frames = 0;
  let rafId = 0;
  let cancelled = false;
  const start = performance.now();
  const WINDOW_MS = 600;
  const tick = (now: number) => {
    if (cancelled) return;
    frames++;
    if (now - start >= WINDOW_MS) {
      const fps = (frames * 1000) / (now - start);
      onResult(fps);
      return;
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

function downgrade(tier: PerformanceTier): PerformanceTier {
  if (tier === "premium") return "balanced";
  if (tier === "balanced") return "performance";
  return "performance";
}

function toPreference(tier: PerformanceTier, reducedMotion: boolean): MotionPreference {
  if (reducedMotion) {
    // Accesibilidad gana siempre, sin importar qué tan potente sea el
    // equipo — nada de 3D/parallax/partículas, solo lo esencial.
    return { tier: "performance", reducedMotion: true, allow3D: false, allowParticles: false, allowParallax: false };
  }
  return {
    tier,
    reducedMotion: false,
    allow3D: tier === "premium",
    allowParticles: tier !== "performance",
    allowParallax: tier !== "performance",
  };
}

const DEFAULT_PREFERENCE: MotionPreference = toPreference("balanced", false);

const MotionPreferenceContext = createContext<MotionPreference>(DEFAULT_PREFERENCE);

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<MotionPreference>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFERENCE;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    return toPreference(detectStaticTier(), reduced);
  });
  const sampled = useRef(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPreference((prev) => toPreference(prev.tier, mql.matches));
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Ya sabemos que accesibilidad pidió menos movimiento — no hace falta
    // ni medir FPS, nos ahorramos el trabajo.
    if (sampled.current || preference.reducedMotion) return;
    sampled.current = true;
    const cancel = sampleFpsOnce((fps) => {
      if (fps < 45) {
        setPreference((prev) => toPreference(downgrade(prev.tier), prev.reducedMotion));
      }
    });
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <MotionPreferenceContext.Provider value={preference}>{children}</MotionPreferenceContext.Provider>;
}

export function useMotionPreference(): MotionPreference {
  return useContext(MotionPreferenceContext);
}
