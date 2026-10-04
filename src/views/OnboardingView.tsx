import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import { ChevronRight, Check } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { OnboardingHero } from "../components/onboarding/OnboardingHero";
import { ONBOARDING_SCREENS, markOnboardingSeen } from "../components/onboarding/onboardingScreens";
import { useMotionPreference } from "../motion";
import { DURATION, EASE } from "../motion/tokens";

// Transición combinada (no un fade genérico) — entra desde el lado hacia
// donde se navega, con algo de escala/blur/profundidad, y sale hacia el
// lado contrario. `direction` viene de qué botón/swipe se usó.
const screenVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 80 : -80,
    scale: 0.94,
    rotateY: direction > 0 ? -8 : 8,
    filter: "blur(6px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    rotateY: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.cinematic, ease: EASE.out },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -80 : 80,
    scale: 0.96,
    rotateY: direction > 0 ? 8 : -8,
    filter: "blur(6px)",
    transition: { duration: DURATION.slow, ease: EASE.inOut },
  }),
};

export function OnboardingView({ userId, onDone }: { userId: string; onDone: () => void }) {
  const { t } = useI18n();
  const { reducedMotion } = useMotionPreference();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const dragStartX = useRef(0);

  const screen = ONBOARDING_SCREENS[index];
  const isLast = index === ONBOARDING_SCREENS.length - 1;

  // El color del orbe/forma 3D sigue el tema que la persona ya tiene
  // elegido (o el default) en vez de un color fijo — se lee una sola vez
  // al montar, no hace falta que reaccione a cambios de tema en medio del
  // onboarding.
  const [primaryColor] = useState(() => {
    if (typeof window === "undefined") return "#d89a16";
    const v = getComputedStyle(document.documentElement).getPropertyValue("--c-primary").trim();
    return v || "#d89a16";
  });

  const finish = () => {
    markOnboardingSeen(userId);
    onDone();
  };

  const goTo = (next: number) => {
    if (next < 0 || next >= ONBOARDING_SCREENS.length) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x < -threshold) goTo(index + 1);
    else if (info.offset.x > threshold) goTo(index - 1);
  };

  // Navegación por teclado — el onboarding es una pantalla completa
  // propia, conviene que flechas/Enter funcionen para quien usa teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "Enter") (isLast ? finish : () => goTo(index + 1))();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isLast]);

  return (
    <div className="fixed inset-0 z-[200] bg-bg flex flex-col safe-top safe-bottom overflow-hidden">
      {/* Fondo premium: el mismo mesh de manchas de color que ya usa el
          resto de la app (index.css), más marcado acá porque es pantalla
          completa y sin cards encima compitiendo. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 20% 10%, var(--c-bg-gradient1), transparent), radial-gradient(ellipse 60% 55% at 80% 90%, var(--c-bg-gradient2), transparent)",
        }}
      />

      <div className="relative flex justify-between items-center px-5 pt-4 shrink-0">
        <div className="flex gap-1.5">
          {ONBOARDING_SCREENS.map((s, i) => (
            <span
              key={s.id}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 22 : 7,
                background: i <= index ? "var(--c-primary)" : "var(--c-border)",
              }}
            />
          ))}
        </div>
        {!isLast && (
          <button onClick={finish} className="text-xs font-semibold text-muted hover:text-text transition-colors">
            {t("onboarding_skip")}
          </button>
        )}
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center" style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={screen.id}
            custom={direction}
            variants={reducedMotion ? undefined : screenVariants}
            initial={reducedMotion ? { opacity: 0 } : "enter"}
            animate={reducedMotion ? { opacity: 1 } : "center"}
            exit={reducedMotion ? { opacity: 0 } : "exit"}
            drag={reducedMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragStart={(_, info) => (dragStartX.current = info.point.x)}
            onDragEnd={handleDragEnd}
            className="w-full h-full flex flex-col items-center justify-center px-6 cursor-grab active:cursor-grabbing"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="w-full max-w-xs h-56 sm:h-64">
              <OnboardingHero variant={screen.id} color={primaryColor} />
            </div>
            <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight text-center max-w-sm">
              {t(screen.titleKey)}
            </h1>
            <p className="mt-3 text-sm text-text-soft text-center max-w-xs leading-relaxed">{t(screen.descKey)}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative shrink-0 px-6 pb-8 pt-2">
        {isLast ? (
          <button onClick={finish} className="btn-primary w-full text-sm py-3.5 glow-primary">
            <Check className="w-4 h-4" /> {t("onboarding_get_started")}
          </button>
        ) : (
          <button onClick={() => goTo(index + 1)} className="btn-primary w-full text-sm py-3.5">
            {t("onboarding_next")} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
