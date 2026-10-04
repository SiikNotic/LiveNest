import { lazy, Suspense } from "react";
import { useMotionPreference } from "../../motion";
import { OnboardingHeroFallback } from "./OnboardingHeroFallback";
import type { OnboardingVariant } from "./onboardingScreens";

const OnboardingHero3D = lazy(() => import("./OnboardingHero3D"));

/** El único punto donde el onboarding decide 2D vs 3D. Todo lo demás
 *  (OnboardingView) no sabe ni le importa si está mirando un <Canvas> de
 *  Three.js o un puñado de divs animados por CSS. */
export function OnboardingHero({ variant, color }: { variant: OnboardingVariant; color: string }) {
  const { allow3D } = useMotionPreference();
  if (!allow3D) return <OnboardingHeroFallback variant={variant} color={color} />;
  return (
    <Suspense fallback={<OnboardingHeroFallback variant={variant} color={color} />}>
      <OnboardingHero3D variant={variant} color={color} />
    </Suspense>
  );
}
