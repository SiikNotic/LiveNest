import { useEffect, useRef, useState } from "react";

/**
 * Calcula el alto de fila (rowHeight) de una grilla de react-grid-layout
 * para que ocupe el alto disponible del contenedor real, en vez de usar un
 * valor fijo en píxeles pensado para una pantalla "promedio". Sin esto,
 * paneles como Música o Alertas quedaban cortados (había que scrollear la
 * página entera para ver el resto) en pantallas más chicas de lo asumido,
 * y sobraba altura sin usar en pantallas grandes.
 *
 * `totalRows` es cuántas filas ocupa el layout completo (el borde inferior
 * más bajo entre todos los paneles, o sea max(y + h)). `defaultRowHeight`
 * es el valor "de diseño" de siempre — nunca se supera, así los paneles no
 * se vuelven innecesariamente altos en pantallas enormes. `minRowHeight` es
 * el piso: por debajo de eso, en vez de seguir achicando el contenido
 * hasta volverlo ilegible, se deja que el contenedor haga scroll (fallback
 * normal en pantallas realmente chicas — exactamente cuando corresponde).
 */
export function useAutoRowHeight(
  totalRows: number,
  marginY: number,
  defaultRowHeight: number,
  minRowHeight: number
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rowHeight, setRowHeight] = useState(defaultRowHeight);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || totalRows <= 0) return;

    const recompute = () => {
      const available = el.clientHeight;
      if (available <= 0) return;
      // react-grid-layout: alto total ≈ filas*rowHeight + (filas+1)*margin
      // (containerPadding no está seteado, así que por defecto es igual
      // al margin). No hace falta precisión de píxel perfecto acá — si el
      // resultado se queda unos px corto, el overflow-y-auto del
      // contenedor lo cubre como fallback, que es justamente lo esperado.
      const ideal = (available - (totalRows + 1) * marginY) / totalRows;
      setRowHeight(Math.min(defaultRowHeight, Math.max(minRowHeight, ideal)));
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [totalRows, marginY, defaultRowHeight, minRowHeight]);

  return { containerRef, rowHeight };
}
