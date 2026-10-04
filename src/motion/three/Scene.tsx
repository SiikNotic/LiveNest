import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";

// Envoltorio único del Canvas de Three.js — reservado a propósito para
// onboarding/elementos decorativos premium (sección 14 del pedido: "NO
// utilizar 3D para todo"). El resto de la app (chat, dashboard, cards)
// usa transformaciones CSS normales vía el resto del Motion System.
//
// R3F libera el contexto WebGL solo al desmontar el <Canvas> — por eso
// este componente nunca debe quedar montado "de fondo": quien lo use tiene
// que des-renderizarlo del todo cuando ya no se ve (ver OnboardingView,
// que lo carga con React.lazy y lo saca del árbol al cerrar el
// onboarding).
export function Scene3D({
  children,
  cameraPosition = [0, 0, 5],
  fov = 45,
}: {
  children: ReactNode;
  cameraPosition?: [number, number, number];
  fov?: number;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: cameraPosition, fov }}
      // No hace falta re-renderizar a 60fps constantes para el onboarding
      // nomás; "demand" + que cada forma pida invalidate() en su propio
      // useFrame cuando corresponde sería ideal, pero dado que TODAS las
      // formas de acá tienen movimiento continuo (flotar/rotar), el modo
      // "always" simple es más simple y predecible sin costar más —
      // igual se libera todo al desmontar.
      frameloop="always"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
