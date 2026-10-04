import { motion } from "../../motion";
import { useMotionPreference } from "../../motion";
import type { OnboardingVariant } from "./onboardingScreens";

const IMAGE_BY_VARIANT: Record<OnboardingVariant, string> = {
  live: "/onboarding/live.png",
  chat: "/onboarding/chat.png",
  voice: "/onboarding/voice.png",
  music: "/onboarding/music.png",
  gifts: "/onboarding/gifts.png",
  start: "/onboarding/start.png",
};

/** Render premium (oro+plata, encargado aparte — ver onboardingScreens.ts)
 *  con un flotado muy sutil y un resplandor de fondo. Reemplaza al hero 3D
 *  con WebGL: las formas procedurales de Three.js se veían genéricas,
 *  estas imágenes se ven como el nivel de pulido real que pedía el
 *  proyecto, y de paso sacan a Three.js/R3F/drei del bundle entero. */
export function OnboardingHero({ variant }: { variant: OnboardingVariant }) {
  const { reducedMotion } = useMotionPreference();
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="absolute w-48 h-48 rounded-full blur-3xl animate-pulse-soft"
        style={{ background: "var(--c-primary)", opacity: 0.3 }}
      />
      <motion.img
        key={variant}
        src={IMAGE_BY_VARIANT[variant]}
        alt=""
        className="relative w-full h-full object-contain drop-shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={
          reducedMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: 1, y: [0, -10, 0] }
        }
        transition={
          reducedMotion
            ? { duration: 0.3 }
            : { opacity: { duration: 0.4 }, scale: { duration: 0.4 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }
        }
      />
    </div>
  );
}
