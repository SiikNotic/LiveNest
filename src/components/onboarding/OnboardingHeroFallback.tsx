import type { OnboardingVariant } from "./onboardingScreens";

// Versión 2D/CSS de cada hero — se usa cuando el dispositivo no puede
// sostener WebGL con comodidad (allow3D === false: reduced-motion o tier
// "performance", ver motion/performanceTier.tsx) o mientras el chunk 3D
// todavía está cargando. Mismo espíritu visual que la versión 3D, sin
// sacrificar la experiencia — "nunca sacrificar funcionalidad" (sección 17
// del pedido).
const WAVE_BARS = [
  { delay: 0, duration: 0.9 }, { delay: 0.1, duration: 1.05 }, { delay: 0.2, duration: 0.8 },
  { delay: 0.3, duration: 1.1 }, { delay: 0.08, duration: 0.95 }, { delay: 0.25, duration: 0.85 },
  { delay: 0.15, duration: 1.0 },
];

export function OnboardingHeroFallback({ variant, color }: { variant: OnboardingVariant; color: string }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="absolute w-40 h-40 rounded-full blur-3xl animate-pulse-soft"
        style={{ background: color, opacity: 0.35 }}
      />
      {variant === "chat" ? (
        <div className="relative w-44 h-44">
          <div className="absolute inset-0 m-auto w-20 h-20 rounded-3xl animate-float" style={{ background: color, opacity: 0.85 }} />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute w-9 h-6 rounded-lg animate-float"
              style={{
                background: color,
                opacity: 0.4,
                top: `${[8, 20, 70, 55][i]}%`,
                left: `${[65, 5, 10, 70][i]}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${4 + i}s`,
              }}
            />
          ))}
        </div>
      ) : variant === "voice" ? (
        <div className="flex items-end gap-1.5 h-24">
          {WAVE_BARS.map((bar, i) => (
            <span
              key={i}
              className="w-2.5 rounded-full animate-wave-bar origin-bottom"
              style={{ background: color, height: "100%", animationDelay: `${bar.delay}s`, animationDuration: `${bar.duration}s` }}
            />
          ))}
        </div>
      ) : variant === "music" ? (
        <div
          className="relative w-32 h-32 rounded-full border-[10px] animate-float"
          style={{ borderColor: color, animationDuration: "6s" }}
        >
          <div className="absolute inset-0 m-auto w-4 h-4 rounded-full" style={{ background: color }} />
        </div>
      ) : variant === "gifts" ? (
        <div className="relative w-36 h-36">
          <div className="absolute inset-0 m-auto w-20 h-20 rounded-3xl rotate-45 animate-float" style={{ background: color, opacity: 0.85 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full animate-pulse-soft"
              style={{
                background: color,
                top: `${[10, 85, 50, 5, 90][i]}%`,
                left: `${[85, 15, 95, 50, 55][i]}%`,
                animationDelay: `${i * 0.25}s`,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="w-28 h-28 rounded-[2rem] animate-float" style={{ background: color }} />
      )}
    </div>
  );
}
