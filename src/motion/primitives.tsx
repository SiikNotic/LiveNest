import { forwardRef, type ReactNode } from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "motion/react";
import { buttonTap, cardVariants, modalVariants, backdropVariants, pageVariants, listItemVariants } from "./variants";
import { SPRING } from "./tokens";
import { useMotionPreference } from "./performanceTier";

/** Card con press físico + entrada/salida con profundidad. Mismo uso que
 *  un <div className="card">, pero animado — no reemplaza las clases CSS
 *  existentes (glassmorphism, tema, etc.), solo les agrega movimiento. */
export const MotionCard = forwardRef<HTMLDivElement, HTMLMotionProps<"div"> & { pressable?: boolean }>(
  function MotionCard({ pressable = false, children, ...props }, ref) {
    const { reducedMotion } = useMotionPreference();
    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        whileTap={pressable && !reducedMotion ? buttonTap : undefined}
        transition={pressable ? SPRING.card : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

/** Botón con press/release físico — se usa igual que un <button>, solo que
 *  con las clases de siempre (btn-primary, btn-ghost, etc.) pasadas por
 *  className. No reemplaza la lógica de los botones existentes. */
export const MotionButton = forwardRef<HTMLButtonElement, HTMLMotionProps<"button">>(
  function MotionButton({ children, ...props }, ref) {
    const { reducedMotion } = useMotionPreference();
    return (
      <motion.button
        ref={ref}
        whileTap={reducedMotion ? undefined : buttonTap}
        transition={SPRING.press}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

/** Ítem de una lista animada (chat, eventos) — liviano, pensado para
 *  cientos de ítems sin perder fluidez. Usar dentro de un <AnimatePresence
 *  mode="popLayout"> si la lista también borra ítems. */
export const MotionListItem = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  function MotionListItem({ children, ...props }, ref) {
    return (
      <motion.div ref={ref} layout variants={listItemVariants} initial="hidden" animate="visible" exit="exit" {...props}>
        {children}
      </motion.div>
    );
  }
);

/** Modal estándar: backdrop con blur + panel con scale 0.96→1. Reemplaza el
 *  patrón manual "fixed inset-0 bg-black/50 + animate-fade-in" que ya
 *  usaban AdminView/AppUpdateModal — mismo resultado visual, ahora
 *  centralizado y con salida animada de verdad (antes solo tenían entrada).
 *  `open` controla el montaje; el padre no necesita envolver en
 *  AnimatePresence por su cuenta. */
export function Modal({
  open,
  onClose,
  children,
  className = "",
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className={`pointer-events-auto ${className}`}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Envoltorio de transición entre pestañas/vistas de la app — profundidad
 *  sutil (translateY+scale+opacity) en vez de fade genérico. `tabKey` tiene
 *  que cambiar para que dispare la transición (ej. el id de la pestaña
 *  activa). */
export function PageTransition({ tabKey, children }: { tabKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={tabKey} variants={pageVariants} initial="hidden" animate="visible" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export { AnimatePresence, motion };
