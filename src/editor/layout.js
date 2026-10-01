// "Flujo" del documento al imprimir con datos reales.
//
// En el editor cada elemento está exactamente donde se dibujó. Pero con
// datos reales una tabla puede traer más (o menos) renglones que el
// ejemplo, y un renglón condicional (p. ej. ISR cuando es 0) puede
// ocultarse. Igual que en los comprobantes originales (que son HTML en
// flujo), lo que está DEBAJO de esos elementos se recorre hacia abajo o
// hacia arriba lo mismo que cambió su alto. Así el diseñador acomoda las
// cosas libremente y el documento sigue "fluyendo" con los datos.

import { cumpleCondicion } from './campos.js';
import { hijosDe } from './modelo.js';

export function filasTabla(el, datos) {
  const lista = datos && Array.isArray(datos[el.props.fuente]) ? datos[el.props.fuente] : [];
  const min = Number(el.props.filasMinimas) || 0;
  const filas = lista.slice();
  while (filas.length < min) filas.push(null);
  return filas;
}

export function altoTabla(el, datos) {
  const p = el.props;
  const enc = p.encabezado || {};
  const cab = enc.mostrar ? (Number(enc.alto) || 0) + (Number(enc.separacion) || 0) : 0;
  return cab + filasTabla(el, datos).length * (Number(p.altoFila) || 0);
}

export function esVisible(el, datos, flujo) {
  if (el.oculto) return false;
  if (!flujo) return true;
  return cumpleCondicion(el.visibleSi, datos);
}

// Devuelve Map id → { x, y, w, h, visible } (x/y relativos al padre) y el
// alto final de la página.
export function calcularLayout(doc, datos, { flujo = true } = {}) {
  const rects = new Map();
  const elementos = doc.elementos;

  function procesar(padreId) {
    const hijos = hijosDe(elementos, padreId);
    const info = hijos.map((el) => {
      const visible = esVisible(el, datos, flujo);
      let h = el.h;
      if (flujo) {
        if (!visible) {
          h = el.colapsar ? 0 : el.h;
        } else if (el.tipo === 'tabla' && el.props.crecer !== 'fijo') {
          h = altoTabla(el, datos);
        }
      }
      let internoDelta = 0;
      if (el.tipo === 'contenedor' || el.tipo === 'grupo') {
        internoDelta = procesar(el.id);
        if (flujo && visible && (el.props.autoAlto || el.tipo === 'grupo')) h = Math.max(0, el.h + internoDelta);
      }
      return { el, visible, h, delta: h - el.h };
    });

    // Bandas: elementos que cambian de alto y se enciman verticalmente
    // (p. ej. etiqueta + valor de un mismo renglón) cuentan una sola vez.
    const cambios = info.filter((i) => Math.abs(i.delta) > 0.01).sort((a, b) => a.el.y - b.el.y);
    const bandas = [];
    for (const c of cambios) {
      const ini = c.el.y;
      const fin = c.el.y + c.el.h;
      const b = bandas.find((x) => ini < x.fin - 0.5 && fin > x.ini + 0.5);
      if (b) {
        b.ini = Math.min(b.ini, ini);
        b.fin = Math.max(b.fin, fin);
        b.deltas.push(c.delta);
      } else {
        bandas.push({ ini, fin, deltas: [c.delta] });
      }
    }
    for (const b of bandas) {
      const positivos = b.deltas.filter((d) => d > 0);
      b.delta = positivos.length ? Math.max(...positivos) : Math.min(...b.deltas);
    }

    let fondoDiseno = 0;
    let fondoFinal = 0;
    for (const i of info) {
      const { el } = i;
      let offset = 0;
      for (const b of bandas) {
        if (b.fin <= el.y + 0.5) offset += b.delta;
      }
      const y = el.y + offset;
      rects.set(el.id, { x: el.x, y, w: el.w, h: i.h, visible: i.visible });
      fondoDiseno = Math.max(fondoDiseno, el.y + el.h);
      fondoFinal = Math.max(fondoFinal, y + i.h);
    }
    return info.length ? fondoFinal - fondoDiseno : 0;
  }

  const deltaPagina = procesar(null);
  const altoPagina = flujo && doc.pagina.autoAlto ? Math.max(40, doc.pagina.alto + deltaPagina) : doc.pagina.alto;
  return { rects, altoPagina };
}
