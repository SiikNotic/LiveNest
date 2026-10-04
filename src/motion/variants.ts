import type { Variants } from "motion/react";
import { DURATION, DISTANCE, EASE, SPRING } from "./tokens";

// Variants reutilizables — cada vista importa estos en vez de inventar sus
// propios números. Mantiene "la sensación LiveNest" consistente en toda la
// app sin copiar/pegar transiciones.

/** Cards, badges, paneles — entrada/salida estándar con algo de
 *  profundidad (combina translateY + scale + opacity, nunca solo fade). */
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: DISTANCE.sm, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    y: DISTANCE.xs,
    scale: 0.98,
    transition: { duration: DURATION.fast, ease: EASE.inOut },
  },
};

/** Lista de mensajes/eventos (chat, EventsView) — liviano a propósito:
 *  nada de 3D ni blur pesado por ítem, la sección 10 del pedido original
 *  es explícita en que el chat tiene que seguir siendo rapidísimo aunque
 *  lleguen cientos de mensajes. */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: DISTANCE.xs, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.fast, ease: EASE.out },
  },
  exit: { opacity: 0, transition: { duration: DURATION.instant } },
};

/** Modals — scale 0.96→1 de entrada, 1→0.98+fade de salida, nada lento. */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DURATION.fast, ease: EASE.inOut } },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/** Transición entre tabs/páginas de la app — profundidad sutil en vez de
 *  fade-in→fade-out genérico (sección 12 del pedido). */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: DISTANCE.md * 0.6, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.slow, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    y: -DISTANCE.xs,
    scale: 0.995,
    transition: { duration: DURATION.fast, ease: EASE.inOut },
  },
};

/** Botones importantes — press físico, sin rebote exagerado. */
export const buttonTap = { scale: 0.97 };
export const buttonTapSmall = { scale: 0.98 };

/** Avatar/username de un follower nuevo — chico y rápido (300-700ms). */
export const followerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.7, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING.card,
  },
  exit: { opacity: 0, scale: 0.85, transition: { duration: DURATION.fast } },
};

/** Subscriber — un escalón más arriba que follower (glow + un poco más de
 *  profundidad) pero sigue siendo corta. */
export const subscriberVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING.bouncy,
  },
  exit: { opacity: 0, scale: 0.9, y: -4, transition: { duration: DURATION.base } },
};

/** Gift de alta prioridad — la secuencia "premium" completa: entra rápido
 *  desde afuera, desacelera, bounce chiquito. */
export const giftVariants: Variants = {
  hidden: { opacity: 0, scale: 0.4, x: 40 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: SPRING.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: -12,
    transition: { duration: DURATION.base, ease: EASE.inOut },
  },
};
