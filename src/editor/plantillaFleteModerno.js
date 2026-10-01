// Diseño "moderno" de flete: tarjeta blanca, tabla con encabezado verde,
// grúa en pastilla, subtotales con insignia ✓, tarifas por grúa, resumen
// con color por signo y barra de saldo. Sirve también como ejemplo de lo
// que permite el editor (textos con datos, íconos, decoraciones).
import { crearElemento, documentoVacio, tablaPropsDefault } from './modelo.js';

const VERDE = '#15803d';
const VERDE_OSC = '#14532d';
const TINTA = '#101828';
const GRIS = '#475467';
const GRIS_CLARO = '#98a2b3';
const LINEA = '#eaecf0';
const BORDE = '#e4e7ec';
const ROJO = '#d92d20';
const MONO = 'JetBrains Mono';

export function plantillaFleteModerno() {
  const doc = documentoVacio({ papel: 'carta' });
  doc.pagina.ancho = 584;
  doc.pagina.alto = 912;
  doc.pagina.fondo = '#ffffff';
  doc.pagina.estilo = { relleno: { tipo: 'solido', color: '#ffffff' } };
  doc.pagina.autoAlto = true;
  doc.pagina.impresion = { papel: 'carta', ajustar: true, margen: 6 };
  doc.paletas = [{ nombre: 'Moderno verde', colores: [VERDE_OSC, VERDE, '#86efac', '#e8f7ec', TINTA, GRIS, '#ffffff'] }];

  const els = [];
  const en = (padre, el) => { el.padreId = padre.id; els.push(el); return el; };
  const t = (o) => ({
    fuente: 'Inter', tamano: 11, peso: 400, color: TINTA, alinear: 'left', alinearV: 'center', interlineado: 1.2,
    espaciado: 0, mayus: false, subrayado: false, multilinea: false, cursiva: false, ...o
  });
  const tx = (padre, nombre, x, y, w, h, contenido, estiloTexto, estilo = {}, extra = {}) => en(padre, crearElemento('texto', {
    nombre, x, y, w, h, props: { texto: contenido }, estilo: { texto: t(estiloTexto), ...estilo }, ...extra
  }));
  const cp = (padre, nombre, clave, formato, x, y, w, h, estiloTexto, estilo = {}, extra = {}) => en(padre, crearElemento('campo', {
    nombre, x, y, w, h,
    props: { campo: clave, formato, prefijo: '', sufijo: '', ...(extra.props || {}) },
    estilo: { texto: t(estiloTexto), ...estilo },
    ...(extra.el || {})
  }));
  const linea = (padre, nombre, x, y, w, extra = {}) => en(padre, crearElemento('linea', {
    nombre, x, y, w, h: 1, estilo: { borde: { color: LINEA, grosor: 1, tipo: 'solid' } }, ...extra
  }));
  const base = tablaPropsDefault();

  // La página misma es la "tarjeta" (fondo blanco): los elementos van
  // directo sobre ella, sin un contenedor de fondo que deje un borde.
  const card = { id: null };
  en(card, crearElemento('rect', { nombre: 'Barra de color', x: 0, y: 0, w: 584, h: 6, estilo: { relleno: { tipo: 'degradado', color: '#16a34a', color2: '#0e6ba8', angulo: 90 } } }));

  // ---------- Encabezado ----------
  tx(card, 'Etiqueta superior', 26, 34, 176, 20, 'Control de fletes y transporte',
    { tamano: 8.5, peso: 700, color: VERDE, mayus: true, espaciado: 0.4, alinear: 'center' },
    { relleno: { tipo: 'solido', color: '#e8f7ec' }, borde: { color: '#c9ecd3', grosor: 1, tipo: 'solid' }, radio: 999 });
  tx(card, 'Título', 26, 62, 360, 34, 'Flete de Madera en Rollo', { tamano: 23, peso: 800, espaciado: -0.3 });
  cp(card, 'Fletero', 'fletero', 'texto', 26, 106, 244, 22, { tamano: 13, peso: 700, color: '#1e5f8c' });
  en(card, crearElemento('elipse', { nombre: 'Punto', x: 276, y: 115, w: 5, h: 5, estilo: { relleno: { tipo: 'solido', color: '#cbd5e1' } } }));
  cp(card, 'Fecha', 'fecha_titulo', 'texto', 288, 105, 112, 24, { tamano: 10.5, color: GRIS, alinear: 'center' },
    { relleno: { tipo: 'solido', color: '#eef1f4' }, radio: 6, padding: [0, 8] }, { props: { anchoAuto: true } });

  const sello = en(card, crearElemento('contenedor', {
    nombre: 'Sello empresa', x: 388, y: 44, w: 172, h: 60,
    estilo: { relleno: { tipo: 'solido', color: '#f3fbf6' }, borde: { color: '#d6efdf', grosor: 1, tipo: 'solid' }, radio: 12, recortarHijos: false }
  }));
  en(sello, crearElemento('elipse', { nombre: 'Círculo ícono', x: 12, y: 12, w: 36, h: 36, estilo: { relleno: { tipo: 'solido', color: VERDE } } }));
  en(sello, crearElemento('icono', { nombre: 'Flecha', x: 20, y: 20, w: 20, h: 20, props: { icono: 'flechaArriba', color: '#ffffff', trazo: 2.75 } }));
  cp(sello, 'Empresa', 'empresa', 'texto', 56, 15, 112, 18, { tamano: 12, peso: 800, color: VERDE_OSC });
  tx(sello, 'Certificado', 56, 33, 112, 12, 'Madera certificada', { tamano: 7.5, peso: 700, color: VERDE, mayus: true, espaciado: 0.5 });

  linea(card, 'Divisor', 0, 142, 584);

  // ---------- Detalle de viajes ----------
  tx(card, 'Título detalle', 26, 166, 320, 16, 'Detalle de viajes y metraje', { tamano: 9.5, peso: 800, color: GRIS, mayus: true, espaciado: 0.6 });
  tx(card, 'Registros', 400, 166, 158, 16, '{num_viajes} registros totales', { tamano: 8.5, color: GRIS_CLARO, alinear: 'right' });

  const viajes = en(card, crearElemento('tabla', {
    nombre: 'Tabla de viajes', x: 26, y: 190, w: 532, h: 10,
    props: {
      ...base,
      fuente: 'lineas',
      altoFila: 34,
      relleno: 8,
      encabezado: { mostrar: true, alto: 32, fondo: VERDE, color: '#ffffff', peso: 800, mayus: true, tamano: 8, separacion: 0, espaciado: 0.3 },
      filas: { fondo: '#ffffff', fondoAlterno: '', alternarPrimero: true, mayus: false },
      bordes: { modo: 'horizontales', color: LINEA, grosor: 1 },
      columnas: [
        { campo: 'fecha', titulo: 'Fecha', ancho: 14, alinear: 'left', formato: 'texto', color: GRIS, tamano: 10 },
        { campo: 'folio', titulo: 'Folio', ancho: 13, alinear: 'left', formato: 'texto', peso: 800, tamano: 10 },
        { campo: 'paraje', titulo: 'Paraje', ancho: 22, alinear: 'left', formato: 'texto', peso: 500, tamano: 9.5 },
        { campo: 'grua', titulo: 'Grúa #', ancho: 10, alinear: 'center', formato: 'texto', decoracion: 'pastilla', fondoDecoracion: '#eef1f4', colorDecoracion: '#344054', peso: 700, tamano: 9.5 },
        { campo: 'metros', titulo: 'Metros (m³)', ancho: 14, alinear: 'right', formato: 'numero3', fuente: MONO, tamano: 10.5 },
        { campo: 'importe_grupo', titulo: 'Subtotal verificación', ancho: 27, alinear: 'right', formato: 'monedaPeso', decoracion: 'insignia', colorDecoracion: VERDE, fondoDecoracion: '#ecfdf3', vacio: '-', peso: 700, tamano: 10 }
      ]
    },
    estilo: { texto: t({ tamano: 10.5 }), borde: { color: BORDE, grosor: 1, tipo: 'solid' }, radio: [10, 10, 0, 0] }
  }));
  viajes.h = 32 + 4 * 34;

  const pie = en(card, crearElemento('contenedor', {
    nombre: 'Total en metros', x: 26, y: 358, w: 532, h: 38,
    estilo: { relleno: { tipo: 'solido', color: '#f5f7f9' }, borde: { color: BORDE, grosor: 1, tipo: 'solid' }, radio: [0, 0, 10, 10], recortarHijos: false }
  }));
  tx(pie, 'Etiqueta total metros', 120, 0, 190, 38, 'Total en metros:', { tamano: 8.5, peso: 800, color: '#344054', mayus: true, espaciado: 0.4, alinear: 'right' });
  cp(pie, 'Total metros', 'total_metros', 'numero3', 318, 0, 120, 38, { fuente: MONO, tamano: 13, peso: 700, alinear: 'center' }, {}, { props: { sufijo: ' m³' } });

  // ---------- Tarifas por grúa ----------
  const tarifas = en(card, crearElemento('contenedor', {
    nombre: 'Tarifas', x: 26, y: 424, w: 532, h: 104,
    props: { autoAlto: true },
    estilo: { relleno: { tipo: 'solido', color: '#f8fafb' }, borde: { color: BORDE, grosor: 1, tipo: 'solid' }, radio: 12, recortarHijos: false }
  }));
  const tTar = en(tarifas, crearElemento('tabla', {
    nombre: 'Tarifas por grúa', x: 16, y: 10, w: 500, h: 10,
    props: {
      ...base,
      fuente: 'grupos',
      altoFila: 26,
      relleno: 4,
      encabezado: { ...base.encabezado, mostrar: false },
      filas: { fondo: 'transparent', fondoAlterno: '', alternarPrimero: true, mayus: false },
      bordes: { modo: 'ninguno', color: LINEA, grosor: 1 },
      columnas: [
        { campo: '', texto: 'Tarifa {n} (Precio Flete):', titulo: 'Tarifa', ancho: 34, alinear: 'left', formato: 'texto', color: '#344054' },
        { campo: '', texto: '{precio:monedaPeso} / m³', titulo: 'Precio', ancho: 20, alinear: 'right', formato: 'texto', fuente: MONO, tamano: 10 },
        { campo: '', texto: 'Monto calculado:', titulo: 'Monto', ancho: 24, alinear: 'right', formato: 'texto', color: GRIS_CLARO, tamano: 9.5 },
        { campo: 'importe', titulo: 'Importe', ancho: 22, alinear: 'right', formato: 'monedaPeso', fuente: MONO, peso: 700, tamano: 10.5 }
      ]
    },
    estilo: { texto: t({ tamano: 10.5 }) }
  }));
  tTar.h = 2 * 26;
  linea(tarifas, 'Divisor tarifas', 16, 66, 500, { estilo: { borde: { color: BORDE, grosor: 1, tipo: 'solid' } } });
  tx(tarifas, 'Etiqueta fletes brutos', 16, 70, 260, 28, 'Total fletes brutos:', { tamano: 10, peso: 800, mayus: true });
  cp(tarifas, 'Total fletes brutos', 'total_flete', 'monedaPeso', 316, 70, 200, 28, { fuente: MONO, tamano: 12.5, peso: 800, alinear: 'right' });

  // ---------- Resumen financiero ----------
  tx(card, 'Título resumen', 26, 552, 360, 16, 'Resumen financiero y retenciones', { tamano: 9.5, peso: 800, color: GRIS, mayus: true, espaciado: 0.6 });
  const res = en(card, crearElemento('contenedor', {
    nombre: 'Resumen', x: 26, y: 576, w: 532, h: 214,
    props: { autoAlto: true },
    estilo: { relleno: { tipo: 'solido', color: '#ffffff' }, borde: { color: BORDE, grosor: 1, tipo: 'solid' }, radio: 12, recortarHijos: true }
  }));
  const H = 35;
  const renglon = (nombre, y, etiqueta, clave, formato, color, cond) => {
    const extra = cond ? { visibleSi: cond, colapsar: true } : {};
    if (y > 0) linea(res, `${nombre} · línea`, 0, y, 532, extra);
    tx(res, `${nombre} · etiqueta`, 16, y, 340, H, etiqueta, { tamano: 10.5, color }, {}, extra);
    cp(res, `${nombre} · valor`, clave, formato, 356, y, 160, H, { fuente: MONO, tamano: 10.5, peso: 500, color, alinear: 'right' }, {}, { el: extra });
  };
  renglon('Flete', 0, 'Flete de Madera en Rollo', 'total_flete', 'monedaPeso', TINTA);
  const tAj = en(res, crearElemento('tabla', {
    nombre: 'Ajustes', x: 0, y: H, w: 532, h: H,
    visibleSi: { campo: 'ajustes', cond: 'noVacio' },
    colapsar: true,
    props: {
      ...base,
      fuente: 'ajustes',
      altoFila: H,
      relleno: 16,
      encabezado: { ...base.encabezado, mostrar: false },
      filas: { fondo: 'transparent', fondoAlterno: '', alternarPrimero: true, mayus: false, colorPorSigno: { campo: 'monto', negativo: ROJO, positivo: VERDE } },
      bordes: { modo: 'horizontales', color: LINEA, grosor: 1 },
      columnas: [
        { campo: '', texto: '{signo_texto}: Pago de {etiqueta}', titulo: 'Concepto', ancho: 68, alinear: 'left', formato: 'texto' },
        { campo: 'monto', titulo: 'Monto', ancho: 32, alinear: 'right', formato: 'monedaSigno', fuente: MONO }
      ]
    },
    estilo: { texto: t({ tamano: 10.5 }) }
  }));
  tAj.h = H;
  renglon('IVA', 2 * H, '(+) Más: Pago de IVA ({iva_pct}%)', 'iva', 'monedaSigno', VERDE);
  renglon('Retención', 3 * H, '(-) Menos: Pago de Retención ({retencion_pct}%)', 'retencion', 'monedaMenos', ROJO, { campo: 'retencion_pct', cond: 'noCero' });
  renglon('ISR', 4 * H, '(-) Menos: Pago de ISR Retenido ({isr_pct}%)', 'isr', 'monedaMenos', ROJO, { campo: 'isr_pct', cond: 'noCero' });
  en(res, crearElemento('rect', { nombre: 'Fondo total', x: 0, y: 5 * H, w: 532, h: 39, estilo: { relleno: { tipo: 'solido', color: '#f5f7f9' } } }));
  linea(res, 'Total · línea', 0, 5 * H, 532);
  tx(res, 'Total · etiqueta', 16, 5 * H, 300, 39, 'Total neto', { tamano: 11, peso: 800, mayus: true });
  cp(res, 'Total · valor', 'total', 'monedaPeso', 316, 5 * H, 200, 39, { fuente: MONO, tamano: 12.5, peso: 800, alinear: 'right' });

  // ---------- Saldo a favor ----------
  const saldo = en(card, crearElemento('contenedor', {
    nombre: 'Saldo a favor', x: 26, y: 814, w: 532, h: 74,
    estilo: {
      relleno: { tipo: 'degradado', color: '#14532d', color2: '#166534', angulo: 90 }, radio: 12, recortarHijos: false,
      sombra: [{ x: 0, y: 6, blur: 16, spread: 0, color: '#14532d33' }]
    }
  }));
  en(saldo, crearElemento('rect', { nombre: 'Fondo ícono', x: 16, y: 21, w: 32, h: 32, estilo: { relleno: { tipo: 'solido', color: '#ffffff1f' }, radio: 8 } }));
  en(saldo, crearElemento('icono', { nombre: 'Dólar', x: 22, y: 27, w: 20, h: 20, props: { icono: 'dolarCirculo', color: '#86efac', trazo: 2 } }));
  tx(saldo, 'Estado', 60, 20, 220, 14, 'Estado de liquidación', { tamano: 8, peso: 800, color: '#86efac', mayus: true, espaciado: 0.6 });
  tx(saldo, 'Leyenda', 60, 34, 240, 22, 'Saldo a Favor del Transportista', { tamano: 13, peso: 800, color: '#ffffff' });
  cp(saldo, 'Saldo', 'saldo_favor', 'monedaPeso', 280, 12, 236, 36, { fuente: MONO, tamano: 25, peso: 800, color: '#86efac', alinear: 'right' });
  tx(saldo, 'Moneda', 280, 48, 236, 14, 'Moneda Nacional (MXN)', { tamano: 8, color: '#bbf7d0', alinear: 'right' });

  doc.elementos = els;
  return doc;
}
