import { useCallback, useEffect, useState } from 'react';

// Calcula un "zoom" (CSS zoom, no transform) para que la vista previa de un
// comprobante ocupe todo el ancho disponible de su contenedor sin salirse
// de la pantalla: crece en pantallas anchas (hasta tamaño real, zoom 1) y
// se encoge sola en pantallas angostas. anchoNaturalPx es el ancho real
// del documento (por ejemplo, 19cm en píxeles a 96dpi).
//
// Usa un "callback ref" (no useRef) a propósito: en estas pantallas el
// contenedor de la vista previa no existe todavía en el primer render
// (antes se muestra un "Cargando…"), así que un useRef normal nunca vería
// el elemento a tiempo para medirlo. El callback ref sí se vuelve a llamar
// en cuanto React monta el nodo real, sin importar cuándo pase eso.
export default function useZoomAjustado(anchoNaturalPx, { min = 0.4, max = 1 } = {}) {
  const [el, setEl] = useState(null);
  const [zoom, setZoom] = useState(max);
  const ref = useCallback((nodo) => setEl(nodo), []);

  useEffect(() => {
    if (!el) return;
    const calcular = () => {
      const disponible = el.clientWidth - 12;
      if (disponible <= 0) return;
      setZoom(Math.min(max, Math.max(min, disponible / anchoNaturalPx)));
    };
    calcular();
    const ro = new ResizeObserver(calcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, anchoNaturalPx, min, max]);

  return [ref, zoom];
}
