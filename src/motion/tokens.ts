// Vocabulario central de movimiento de LiveNest — duraciones, easings y
// springs compartidos. Ningún componente debe inventar sus propios números
// de animación sueltos; todo sale de acá, así el motion se siente como UN
// solo sistema de diseño en vez de cientos de animaciones independientes.

export const EASE = {
  // Salida suave, estándar para la mayoría de las transiciones de UI.
  out: [0.16, 1, 0.3, 1] as const,
  // Entrada+salida simétrica, para elementos que aparecen Y desaparecen
  // en el mismo lugar (modals, tooltips).
  inOut: [0.65, 0, 0.35, 1] as const,
  // Casi lineal, para barras/progreso donde no queremos que "frene".
  linear: [0.33, 0, 0.67, 1] as const,
} as const;

// Duraciones en segundos (unidad nativa de Framer Motion).
export const DURATION = {
  instant: 0.12, // press/release de botones
  fast: 0.18, // mensajes de chat, microinteracciones
  base: 0.28, // cards, badges, la mayoría de las entradas/salidas
  slow: 0.45, // modals, paneles grandes
  cinematic: 0.7, // transiciones de onboarding, hero
} as const;

// Springs con "personalidad" — se usan por nombre, no por números sueltos
// copiados y pegados en cada componente.
export const SPRING = {
  // Botones: rápido, sin rebote perceptible — se siente "físico" sin
  // parecer un juguete.
  press: { type: "spring", stiffness: 500, damping: 30, mass: 0.5 } as const,
  // Cards/paneles: un poco más de masa, rebote mínimo.
  card: { type: "spring", stiffness: 300, damping: 26, mass: 0.6 } as const,
  // Elementos "premium" (gift de alta prioridad, subscriber) — el único
  // lugar con algo de bounce real, a propósito.
  bouncy: { type: "spring", stiffness: 260, damping: 18, mass: 0.7 } as const,
  // Paneles grandes / onboarding — suave, sin rebote, con peso.
  gentle: { type: "spring", stiffness: 180, damping: 24, mass: 1 } as const,
} as const;

// Distancias estándar de traslado, para que "entrar desde abajo" sea
// siempre la misma distancia en toda la app.
export const DISTANCE = {
  xs: 8,
  sm: 16,
  md: 28,
  lg: 48,
} as const;
