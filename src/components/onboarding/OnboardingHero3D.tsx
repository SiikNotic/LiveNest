// Este archivo se carga con React.lazy() desde OnboardingHero.tsx — recién
// ahí entra Three.js/@react-three/fiber/drei al bundle. El resto de la app
// (chat, dashboard, todo lo que se usa durante un directo) nunca paga ese
// peso, porque nunca lo importa.
import { Scene3D } from "../../motion/three/Scene";
import { FloatingOrb, OrbitingChips, Waveform3D, SpinningDisc, GiftBurst } from "../../motion/three/shapes";
import type { OnboardingVariant } from "./onboardingScreens";

export default function OnboardingHero3D({ variant, color }: { variant: OnboardingVariant; color: string }) {
  return (
    <Scene3D cameraPosition={[0, 0, 5]}>
      {variant === "live" && <FloatingOrb color={color} />}
      {variant === "chat" && <OrbitingChips color={color} />}
      {variant === "voice" && <Waveform3D color={color} />}
      {variant === "music" && <SpinningDisc color={color} />}
      {variant === "gifts" && <GiftBurst color={color} />}
      {variant === "start" && <FloatingOrb color={color} radius={1.3} />}
    </Scene3D>
  );
}
