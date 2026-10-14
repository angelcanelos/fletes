// Recreaciones editables de los comprobantes oficiales 2026 (los que hoy
// dibujan ReciboFormato.jsx + formato.css y ReciboFlete.jsx + flete.css),
// como punto de partida para diseñar los formatos de años siguientes.
// Las medidas salen de esos CSS convertidas a px (1 cm = 37.8 px).

import { crearElemento, documentoVacio, mmAPx, tablaPropsDefault } from './modelo.js';
import { CATALOGO } from './campos.js';
import { plantillaFleteModerno } from './plantillaFleteModerno.js';

const NAVY = '#0e2841';
const AZUL = '#2f6fa8';
const AZUL_SUAVE = 'rgba(174, 212, 238, 0.4)';

function txt(t) {
  return { fuente: 'Arial', tamano: 12, peso: 700, color: '#111111', alinear: 'left', alinearV: 'center', interlineado: 1.2, espaciado: 0, mayus: false, subrayado: false, multilinea: false, cursiva: false, ...t };
}

function texto(nombre, x, y, w, h, contenido, t = {}, extra = {}) {
  return crearElemento('texto', { nombre, x, y, w, h, props: { texto: contenido }, estilo: { texto: txt(t), ...(extra.estilo || {}) }, ...extra.el });
}

function campo(nombre, clave, x, y, w, h, t = {}, extra = {}) {
  return crearElemento('campo', {
    nombre, x, y, w, h,
    props: { campo: clave, formato: extra.formato || 'texto', prefijo: extra.prefijo || '', sufijo: extra.sufijo || '' },
    estilo: { texto: txt(t), ...(extra.estilo || {}) },
    ...(extra.el || {})
  });
}

function columnasDe(tipo, fuente) {
  return CATALOGO[tipo].tablas.find((t) => t.clave === fuente).columnas.map((c) => ({ ...c }));
}

function tabla(nombre, tipo, fuente, x, y, w, props = {}, t = {}, extra = {}) {
  const base = tablaPropsDefault();
  const p = {
    ...base,
    fuente,
    columnas: props.columnas || columnasDe(tipo, fuente),
    ...props,
    encabezado: { ...base.encabezado, ...(props.encabezado || {}) },
    filas: { ...base.filas, ...(props.filas || {}) },
    bordes: { ...base.bordes, ...(props.bordes || {}) }
  };
  const el = crearElemento('tabla', { nombre, x, y, w, h: 10, props: p, estilo: { texto: txt(t) }, ...(extra.el || {}) });
  return el;
}

// Alto de diseño de una tabla con los renglones de los datos de ejemplo.
function ajustarAlto(el, filas) {
  const enc = el.props.encabezado;
  el.h = (enc.mostrar ? enc.alto + (enc.separacion || 0) : 0) + filas * el.props.altoFila;
  return el;
}

// Renglón de resumen: etiqueta a la izquierda + valor a la derecha.
function renglon(prefijo, y, x, w, h, etiqueta, clave, t = {}, extra = {}) {
  const lab = etiqueta.campo
    ? campo(`${prefijo} · etiqueta`, etiqueta.campo, x, y, w * 0.68, h, { mayus: true, ...t }, { formato: 'porcentaje', prefijo: etiqueta.prefijo, sufijo: etiqueta.sufijo, el: extra.el })
    : texto(`${prefijo} · etiqueta`, x, y, w * 0.68, h, etiqueta, { mayus: true, ...t }, { el: extra.el });
  const val = campo(`${prefijo} · valor`, clave, x + w * 0.68, y, w * 0.32, h, { alinear: 'right', ...t }, { formato: extra.formato || 'moneda', el: extra.el });
  return [lab, val];
}

export function plantillaExtraccion2026() {
  const doc = documentoVacio({ papel: 'carta' });
  doc.pagina.ancho = mmAPx(105);
  doc.pagina.alto = 722;
  doc.pagina.autoAlto = true;
  doc.pagina.impresion = { papel: 'carta', ajustar: true, margen: 6 };
  doc.paletas = [{ nombre: 'Oficial 2026', colores: [NAVY, '#16324f', '#95ca58', '#2f6b1f', '#d21f1f', '#111111', '#ffffff'] }];

  const X = 15.1;
  const W = 366.6;
  const els = [];

  els.push(crearElemento('imagen', {
    nombre: 'Logo', x: X, y: 17, w: 110, h: 110,
    props: { campo: 'logo', ajuste: 'contain' },
    estilo: { relleno: { tipo: 'solido', color: '#ffffff' }, borde: { color: '#cccccc', grosor: 1, tipo: 'solid' }, radio: 999, padding: 7 }
  }));
  els.push(texto('Cintillo', 131, 17, 250.7, 110, 'Extraccion\nde troceria\nen rollo',
    { tamano: 15, peso: 800, color: '#ffffff', alinear: 'center', mayus: true, interlineado: 1.18, espaciado: 0.3, multilinea: true },
    { estilo: { relleno: { tipo: 'solido', color: NAVY }, recorte: 'etiqueta-izq', padding: [4, 13, 4, 19] } }));
  els.push(campo('Texto FSC', 'producto_fsc', 134, 137, 247.6, 40,
    { tamano: 9.5, peso: 700, alinear: 'center', multilinea: true, interlineado: 1.25 },
    { estilo: { borde: { color: '#111111', grosor: 1.5, tipo: 'solid' }, radio: 3, padding: 4 }, el: { visibleSi: { campo: 'producto_fsc', cond: 'noVacio' }, colapsar: true } }));

  const caja = { relleno: { tipo: 'solido', color: '#ffffff' }, borde: { color: '#111111', grosor: 1.5, tipo: 'solid' }, radio: 8, padding: [0, 19] };
  els.push(campo('Productor', 'productor', X, 189, 286, 33, { tamano: 13.5, peso: 800, mayus: true }, { formato: 'mayus', estilo: caja }));
  els.push(campo('Destino', 'destino', X, 225, W - 4, 12, { tamano: 9, peso: 400, cursiva: true, alinear: 'right' }));

  const sombra = (nombre, y, w) => crearElemento('rect', { nombre, x: X - 4.5, y: y + 14.4, w: w + 25.3, h: 28.9, estilo: { relleno: { tipo: 'solido', color: NAVY }, radio: [0, 8, 8, 0] } });
  els.push(sombra('Grúa · sombra', 249, 130));
  els.push(campo('Grúa', 'grua', X, 249, 130, 32, { tamano: 13, peso: 800, mayus: true }, { formato: 'mayus', estilo: caja, el: { props: { campo: 'grua', formato: 'mayus', anchoAuto: true } } }));
  els.push(sombra('Fecha · sombra', 302, 250));
  els.push(campo('Fecha', 'fecha_larga', X, 302, 250, 32, { tamano: 13, peso: 800, mayus: true }, { estilo: caja, el: { props: { campo: 'fecha_larga', formato: 'texto', anchoAuto: true } } }));

  els.push(ajustarAlto(tabla('Tabla de géneros', 'extraccion', 'generos', X, 355, W, {
    altoFila: 21,
    encabezado: { mostrar: true, alto: 24, fondo: NAVY, color: '#ffffff', peso: 800, mayus: true, tamano: 11, separacion: 0 }
  }, { tamano: 11.5, peso: 700 }), 4));

  const tAj = tabla('Tabla de ajustes', 'extraccion', 'ajustes', X, 469, W, {
    altoFila: 27, encabezado: { mostrar: false }
  }, { tamano: 12, peso: 700 }, { el: { visibleSi: { campo: 'ajustes', cond: 'noVacio' }, colapsar: true } });
  els.push(ajustarAlto(tAj, 1));

  const tR = { tamano: 12, peso: 700 };
  els.push(...renglon('Subtotal', 523, X, W, 27, 'Subtotal', 'subtotal', tR));
  els.push(...renglon('IVA', 550, X, W, 27, { campo: 'iva_pct', prefijo: 'Mas iva ', sufijo: ' %' }, 'iva', tR));
  els.push(...renglon('Retención', 577, X, W, 27, { campo: 'retencion_pct', prefijo: 'Retencion ', sufijo: ' %' }, 'retencion', tR, { el: { visibleSi: { campo: 'retencion_pct', cond: 'noCero' }, colapsar: true } }));
  els.push(...renglon('ISR', 604, X, W, 27, 'I S R', 'isr', tR, { el: { visibleSi: { campo: 'isr_pct', cond: 'noCero' }, colapsar: true } }));
  els.push(crearElemento('linea', { nombre: 'Línea total neto', x: X, y: 631, w: W, h: 1, estilo: { borde: { color: '#999999', grosor: 1, tipo: 'solid' } } }));
  els.push(...renglon('Total neto', 632, X, W, 28, 'Total neto', 'total_neto', { tamano: 13, peso: 900 }));

  const saldo = crearElemento('contenedor', {
    nombre: 'Saldo a favor', x: X, y: 673, w: W, h: 34,
    estilo: { relleno: { tipo: 'solido', color: NAVY }, recortarHijos: false }
  });
  els.push(saldo);
  els.push(texto('Saldo · etiqueta', 13, 0, 200, 34, 'Saldo a favor :', { tamano: 14, peso: 900, color: '#ffffff', mayus: true, espaciado: 0.3 }, { el: { padreId: saldo.id } }));
  els.push(campo('Saldo · valor', 'saldo_favor', W - 173, 0, 160, 34, { tamano: 14, peso: 900, color: '#ffffff', alinear: 'right', espaciado: 0.3 }, { formato: 'moneda', el: { padreId: saldo.id } }));

  doc.elementos = els;
  return doc;
}

export function plantillaFlete2026() {
  const doc = documentoVacio({ papel: 'carta' });
  doc.pagina.ancho = mmAPx(190);
  doc.pagina.alto = 763;
  doc.pagina.autoAlto = true;
  doc.pagina.impresion = { papel: 'carta', ajustar: true, margen: 6 };
  doc.paletas = [{ nombre: 'Oficial 2026', colores: [AZUL, '#2e86c1', 'rgba(174, 212, 238, 0.4)', '#2e9e5b', '#1c1c1c', '#111111', '#ffffff'] }];

  const X = 45.4;
  const W = 627.3;
  const els = [];

  els.push(crearElemento('rect', {
    nombre: 'Medio círculo', x: 94.5, y: 7.5, w: 98, h: 196.5,
    estilo: { relleno: { tipo: 'solido', color: 'rgba(158, 202, 235, 0.65)' }, radio: [98, 0, 0, 98] }
  }));
  els.push(crearElemento('elipse', { nombre: 'Halo exterior', x: 350.1, y: -1.9, w: 215.4, h: 215.4, estilo: { relleno: { tipo: 'solido', color: 'rgba(174, 212, 238, 0.1)' } } }));
  els.push(crearElemento('elipse', { nombre: 'Halo interior', x: 370.9, y: 18.9, w: 173.9, h: 173.9, estilo: { relleno: { tipo: 'solido', color: 'rgba(174, 212, 238, 0.22)' } } }));
  els.push(texto('Título', 192.5, 41.3, 186, 129, 'Flete De\nMadera En\nRollo',
    { fuente: 'Georgia', tamano: 24, peso: 700, color: '#1c1c1c', alinear: 'center', interlineado: 1.28, multilinea: true },
    { estilo: { relleno: { tipo: 'solido', color: '#ffffff' }, borde: { color: AZUL, grosor: 1.4, tipo: 'solid' }, radio: [7, 3, 8, 4] } }));
  els.push(crearElemento('imagen', {
    nombre: 'Logo', x: 389.8, y: 37.8, w: 136, h: 136,
    props: { campo: 'logo', ajuste: 'contain' },
    estilo: {
      relleno: { tipo: 'solido', color: '#ffffff' }, borde: { color: AZUL, grosor: 1.6, tipo: 'solid' }, radio: 999, padding: 7.5,
      sombra: [{ interior: true, x: 0, y: 0, blur: 17, spread: 1.9, color: 'rgba(146, 196, 232, 0.55)' }]
    }
  }));

  els.push(campo('Fletero', 'fletero', X, 189, W, 26, { fuente: 'Georgia', tamano: 20, peso: 700, cursiva: true, color: '#2e86c1', alinear: 'center' }));
  els.push(campo('Fecha', 'fecha_corta', X, 232, 187, 29, { tamano: 13, peso: 700, espaciado: 0.2, alinear: 'center' }, {
    estilo: { relleno: { tipo: 'solido', color: 'rgba(174, 212, 238, 0.3)' }, borde: { color: AZUL, grosor: 1.5, tipo: 'solid' }, radio: 2 }
  }));

  els.push(ajustarAlto(tabla('Tabla de viajes', 'flete', 'lineas', X, 276, W, {
    altoFila: 27,
    relleno: 8,
    encabezado: { mostrar: true, alto: 28, fondo: AZUL_SUAVE, color: '#111111', peso: 700, mayus: true, tamano: 12, separacion: 8.3, bordeGrueso: true },
    filas: { fondo: '#ffffff', fondoAlterno: 'rgba(174, 212, 238, 0.22)', alternarPrimero: true, mayus: false },
    bordes: { modo: 'todas', color: '#111111', grosor: 1 }
  }, { tamano: 12, peso: 400 }), 4));

  const t13 = { tamano: 13, peso: 700 };
  els.push(...renglon('Total en metros', 443, X, W, 22, 'Total en metros', 'total_metros', t13, { formato: 'numero3' }));
  els.push(ajustarAlto(tabla('Precios de flete', 'flete', 'grupos', X, 465, W, {
    altoFila: 22, encabezado: { mostrar: false }, filas: { mayus: true }
  }, t13), 2));
  els.push(...renglon('Total $', 509, X, W, 22, 'Total $', 'total_flete', t13));

  els.push(...renglon('Flete de madera', 552, X, W, 22.6, 'Flete de madera en rollo', 'total_flete', t13));
  els.push(ajustarAlto(tabla('Tabla de ajustes', 'flete', 'ajustes', X, 574.6, W, {
    altoFila: 22.6, encabezado: { mostrar: false }
  }, t13, { el: { visibleSi: { campo: 'ajustes', cond: 'noVacio' }, colapsar: true } }), 1));
  els.push(...renglon('IVA', 597.2, X, W, 22.6, { campo: 'iva_pct', prefijo: 'Mas pago de iva ', sufijo: ' %' }, 'iva', t13));
  els.push(...renglon('Retención', 619.8, X, W, 22.6, { campo: 'retencion_pct', prefijo: 'Menos pago de retencion ', sufijo: ' %' }, 'retencion', t13,
    { el: { visibleSi: { campo: 'retencion_pct', cond: 'noCero' }, colapsar: true } }));
  els.push(...renglon('ISR', 642.4, X, W, 22.6, { campo: 'isr_pct', prefijo: 'Menos pago de isr retenido ', sufijo: ' %' }, 'isr', t13,
    { el: { visibleSi: { campo: 'isr_pct', cond: 'noCero' }, colapsar: true } }));
  els.push(crearElemento('linea', { nombre: 'Línea total', x: X, y: 665, w: W, h: 1, estilo: { borde: { color: '#999999', grosor: 1, tipo: 'solid' } } }));
  els.push(...renglon('Total', 667, X, W, 25, 'Total', 'total', { tamano: 13, peso: 900 }));

  els.push(texto('Saldo · etiqueta', X + W - 400, 707, 250, 22, 'Saldo a favor:', { tamano: 15, peso: 900, mayus: true, alinear: 'right' }));
  els.push(campo('Saldo · valor', 'saldo_favor', X + W - 140, 707, 140, 22, { tamano: 15, peso: 900, alinear: 'right', subrayado: true }, { formato: 'moneda' }));

  doc.pagina.alto = 707 + 22 + 60;
  doc.elementos = els;
  return doc;
}

export const PUNTOS_DE_PARTIDA = {
  blanco: { nombre: 'En blanco', crear: () => documentoVacio({ papel: 'carta' }) },
  extraccion2026: { nombre: 'Extracción 2026', tipo: 'extraccion', crear: plantillaExtraccion2026 },
  flete2026: { nombre: 'Flete 2026', tipo: 'flete', crear: plantillaFlete2026 },
  fleteModerno: { nombre: 'Flete moderno', tipo: 'flete', crear: plantillaFleteModerno }
};
