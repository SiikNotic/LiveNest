import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import type { Mesh, Group } from "three";

// Formas 3D genéricas y reutilizables para el onboarding — un vocabulario
// chico (orbe, chips orbitando, waveform, disco, partículas) en vez de
// seis escenas 3D completamente distintas escritas a mano. Cada pantalla
// del onboarding combina estas piezas con su propio color (tomado del
// tema activo) para sentirse distinta sin duplicar código.

/** Orbe central flotante — la base visual de casi todas las pantallas
 *  (representa "LiveNest" mismo: una presencia en vivo, sin ningún
 *  parecido a un pájaro/nido). */
export function FloatingOrb({ color = "#d89a16", radius = 1.1 }: { color?: string; radius?: number }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.6}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[radius, 1]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.6} emissive={color} emissiveIntensity={0.15} />
      </mesh>
    </Float>
  );
}

/** Chips planos orbitando el centro — para la pantalla de Chat
 *  ("mensajes flotando alrededor de un objeto 3D"). */
export function OrbitingChips({ color = "#d89a16", count = 5 }: { color?: string; count?: number }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.35;
  });
  const chips = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const r = 1.9;
        return { x: Math.cos(angle) * r, z: Math.sin(angle) * r, y: Math.sin(angle * 2) * 0.3, rot: angle };
      }),
    [count]
  );
  return (
    <group ref={group}>
      <FloatingOrb color={color} radius={0.75} />
      {chips.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]} rotation={[0, -c.rot, 0]}>
          <planeGeometry args={[0.55, 0.3]} />
          <meshStandardMaterial color={color} transparent opacity={0.55} roughness={0.4} metalness={0.2} side={2} />
        </mesh>
      ))}
    </group>
  );
}

/** Barras tipo ecualizador — para Voice Engine. Alturas animadas con seno
 *  desfasado por barra, el mismo truco visual que ya usa la app en 2D
 *  (Header.tsx, LandingPage HeroMock) pero llevado a 3D. */
export function Waveform3D({ color = "#d89a16", bars = 9 }: { color?: string; bars?: number }) {
  const group = useRef<Group>(null);
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const h = 0.4 + Math.abs(Math.sin(t * 2.4 + i * 0.6)) * 1.3;
      mesh.scale.y = h;
      mesh.position.y = h / 2 - 0.6;
    });
    if (group.current) group.current.rotation.y = Math.sin(t * 0.2) * 0.15;
  });
  const positions = useMemo(() => Array.from({ length: bars }, (_, i) => (i - (bars - 1) / 2) * 0.42), [bars]);
  return (
    <group ref={group}>
      {positions.map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} ref={(el) => (refs.current[i] = el)}>
          <boxGeometry args={[0.22, 1, 0.22]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} emissive={color} emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** Disco girando — para Music (referencia a vinilo/reproducción, sin ser
 *  literalmente un logo de ninguna marca de música). */
export function SpinningDisc({ color = "#d89a16" }: { color?: string }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.6;
  });
  return (
    <Float speed={1} rotationIntensity={0.15} floatIntensity={0.4}>
      <group ref={ref} rotation={[Math.PI / 2.4, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.15, 0.12, 24, 64]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.9, 0.9, 0.06, 48]} />
          <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} transparent opacity={0.35} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.14, 0.14, 0.1, 24]} />
          <meshStandardMaterial color="#f2f4f7" roughness={0.2} metalness={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

/** Orbe + partículas sutiles — para Gifts. Las partículas son pocas y
 *  chicas a propósito (sección 5: "no utilizar una explosión de
 *  partículas exagerada"). */
export function GiftBurst({ color = "#d89a16" }: { color?: string }) {
  return (
    <>
      <FloatingOrb color={color} radius={0.95} />
      <Sparkles count={28} scale={3.2} size={2.5} speed={0.35} color={color} opacity={0.7} />
    </>
  );
}
