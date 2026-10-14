// Catálogo de los datos "vivos" que se pueden arrastrar a un formato
// (productor, fecha, tablas, totales…) y las funciones que convierten un
// registro real de Extracción/Flete en el mapa plano de valores que usa el
// renderizador. Todo el cálculo de dinero se reutiliza de src/lib/calc.js,
// así un formato hecho en el editor da exactamente los mismos totales que
// los comprobantes originales.

import { calcularFormato, calcularFlete, fechaLargaEs, fechaCortaEs, formatoMonedaConSigno } from '../lib/calc.js';

export const LOGO_DEFAULT = '/images/logo.png';

// ---------- Formatos de valor ----------

export const FORMATOS_VALOR = {
  texto: 'Texto tal cual',
  mayus: 'MAYÚSCULAS',
  moneda: 'Moneda (1,234.50)',
  monedaPeso: 'Moneda con $ ($1,234.50)',
  monedaSigno: 'Moneda con signo (+$1,234.50)',
  monedaMenos: 'Moneda en negativo (-$1,234.50)',
  numero0: 'Número entero',
  numero2: 'Número (2 decimales)',
  numero3: 'Número (3 decimales)',
  porcentaje: 'Porcentaje (16)',
  insignia: 'Insignia ✓ (subtotal)'
};

function num(v) {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

const M = (v) => num(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => (Number.isInteger(n) ? n.toFixed(0) : Number(n).toFixed(2));

export function formatearValor(valor, formato) {
  if (valor == null || valor === '') return '';
  switch (formato) {
    case 'mayus': return String(valor).toUpperCase();
    case 'moneda': return M(valor);
    case 'monedaPeso': return `$${M(valor)}`;
    case 'monedaSigno': return formatoMonedaConSigno(valor);
    case 'monedaMenos': return `-$${M(Math.abs(num(valor)))}`;
    case 'numero0': return num(valor).toFixed(0);
    case 'numero2': return num(valor).toFixed(2);
    case 'numero3':
    case 'insignia': return num(valor).toFixed(3);
    case 'porcentaje': return pct(num(valor));
    default: return String(valor);
  }
}

// Textos con datos incrustados: «Pago de IVA ({iva_pct}%)» o
// «{precio:monedaPeso} / m³». Sin formato explícito se usa el del catálogo
// (o el valor tal cual). Las llaves que no son un dato se dejan igual.
const RE_DATO = /\{([a-z_][a-z0-9_]*)(?::([a-zA-Z0-9]+))?\}/g;

export function interpolar(texto, datos, tipo, fila) {
  if (!texto || texto.indexOf('{') < 0) return texto || '';
  return String(texto).replace(RE_DATO, (todo, clave, formato) => {
    const fuente = fila && clave in fila ? fila : datos;
    if (!fuente || !(clave in fuente)) return todo;
    const info = !fila || !(clave in fila) ? campoInfo(tipo, clave) : null;
    const v = fuente[clave];
    if (Array.isArray(v)) return String(v.length);
    return formatearValor(v, formato || (info && info.formato) || 'texto');
  });
}

// ---------- Condiciones de visibilidad ----------

export const CONDICIONES = {
  noCero: 'es distinto de 0',
  cero: 'es 0',
  noVacio: 'tiene contenido',
  vacio: 'está vacío',
  verdadero: 'es verdadero'
};

export function cumpleCondicion(cond, datos) {
  if (!cond || !cond.campo) return true;
  const v = datos ? datos[cond.campo] : undefined;
  const vacio = v == null || v === '' || (Array.isArray(v) && v.length === 0);
  switch (cond.cond) {
    case 'noCero': return num(v) !== 0;
    case 'cero': return num(v) === 0;
    case 'vacio': return vacio;
    case 'verdadero': return Boolean(v);
    case 'noVacio':
    default: return !vacio;
  }
}

// ---------- Catálogo ----------
// grupo: sección del panel "Elementos"; formato: formato por defecto al
// soltarlo en el lienzo; ancho: ancho sugerido en px.

const COMUNES = [
  { clave: 'folio', etiqueta: 'Folio', grupo: 'Datos generales', formato: 'texto' },
  { clave: 'fecha_larga', etiqueta: 'Fecha larga (AL 5 MARZO 2026)', grupo: 'Datos generales', formato: 'texto', ancho: 220 },
  { clave: 'fecha_corta', etiqueta: 'Fecha (05 MARZO 2026)', grupo: 'Datos generales', formato: 'texto', ancho: 200 },
  { clave: 'fecha_titulo', etiqueta: 'Fecha (05 de Marzo, 2026)', grupo: 'Datos generales', formato: 'texto', ancho: 150 },
  { clave: 'fecha', etiqueta: 'Fecha (05/03/2026)', grupo: 'Datos generales', formato: 'texto' },
  { clave: 'observaciones', etiqueta: 'Observaciones', grupo: 'Datos generales', formato: 'texto', ancho: 280 },
  { clave: 'empresa', etiqueta: 'Nombre de la empresa', grupo: 'Empresa', formato: 'texto', ancho: 240 }
];

export const CATALOGO = {
  extraccion: {
    campos: [
      { clave: 'productor', etiqueta: 'Productor', grupo: 'Datos generales', formato: 'mayus', ancho: 280 },
      { clave: 'grua', etiqueta: 'Grúa', grupo: 'Datos generales', formato: 'mayus', ancho: 120 },
      { clave: 'destino', etiqueta: 'Destino', grupo: 'Datos generales', formato: 'texto' },
      { clave: 'producto_fsc', etiqueta: 'Texto FSC / producto', grupo: 'Datos generales', formato: 'texto', ancho: 250, alto: 40 },
      ...COMUNES,
      { clave: 'total_metros', etiqueta: 'Total de metros', grupo: 'Totales', formato: 'numero3' },
      { clave: 'total_generos', etiqueta: 'Total de géneros', grupo: 'Totales', formato: 'moneda' },
      { clave: 'total_ajustes', etiqueta: 'Total de ajustes', grupo: 'Totales', formato: 'monedaSigno' },
      { clave: 'subtotal', etiqueta: 'Subtotal', grupo: 'Totales', formato: 'moneda' },
      { clave: 'iva_pct', etiqueta: 'IVA %', grupo: 'Impuestos', formato: 'porcentaje', ancho: 60 },
      { clave: 'iva', etiqueta: 'IVA $', grupo: 'Impuestos', formato: 'moneda' },
      { clave: 'retencion_pct', etiqueta: 'Retención %', grupo: 'Impuestos', formato: 'porcentaje', ancho: 60 },
      { clave: 'retencion', etiqueta: 'Retención $', grupo: 'Impuestos', formato: 'moneda' },
      { clave: 'isr_pct', etiqueta: 'ISR %', grupo: 'Impuestos', formato: 'porcentaje', ancho: 60 },
      { clave: 'isr', etiqueta: 'ISR $', grupo: 'Impuestos', formato: 'moneda' },
      { clave: 'total_neto', etiqueta: 'Total neto', grupo: 'Totales', formato: 'moneda' },
      { clave: 'saldo_favor', etiqueta: 'Saldo a favor', grupo: 'Totales', formato: 'moneda' }
    ],
    tablas: [
      {
        clave: 'generos',
        etiqueta: 'Tabla de géneros',
        columnas: [
          { campo: 'nombre', titulo: 'Genero', ancho: 34, alinear: 'left', formato: 'mayus' },
          { campo: 'metros', titulo: 'Metros', ancho: 20, alinear: 'right', formato: 'numero3' },
          { campo: 'precio', titulo: 'Precio $', ancho: 22, alinear: 'right', formato: 'moneda' },
          { campo: 'total', titulo: 'Total', ancho: 24, alinear: 'right', formato: 'moneda' }
        ],
        camposFila: { n: 'Número de renglón', nombre: 'Género', metros: 'Metros', precio: 'Precio', total: 'Total (metros × precio)' }
      },
      {
        clave: 'ajustes',
        etiqueta: 'Tabla de ajustes',
        columnas: [
          { campo: 'etiqueta', titulo: 'Concepto', ancho: 70, alinear: 'left', formato: 'mayus' },
          { campo: 'monto', titulo: 'Monto', ancho: 30, alinear: 'right', formato: 'monedaSigno' }
        ],
        camposFila: { n: 'Número de renglón', etiqueta: 'Concepto', monto: 'Monto', monto_abs: 'Monto sin signo', signo_texto: '«(-) Menos» / «(+) Más»' }
      }
    ]
  },
  flete: {
    campos: [
      { clave: 'fletero', etiqueta: 'Fletero', grupo: 'Datos generales', formato: 'texto', ancho: 280 },
      ...COMUNES,
      { clave: 'num_viajes', etiqueta: 'Número de viajes', grupo: 'Totales', formato: 'numero0', ancho: 60 },
      { clave: 'total_metros', etiqueta: 'Total en metros', grupo: 'Totales', formato: 'numero3' },
      { clave: 'precio_flete', etiqueta: 'Precio de flete (por defecto)', grupo: 'Totales', formato: 'moneda' },
      { clave: 'total_flete', etiqueta: 'Total del flete', grupo: 'Totales', formato: 'moneda' },
      { clave: 'total_ajustes', etiqueta: 'Total de ajustes', grupo: 'Totales', formato: 'monedaSigno' },
      { clave: 'subtotal', etiqueta: 'Subtotal', grupo: 'Totales', formato: 'moneda' },
      { clave: 'iva_pct', etiqueta: 'IVA %', grupo: 'Impuestos', formato: 'porcentaje', ancho: 60 },
      { clave: 'iva', etiqueta: 'IVA $', grupo: 'Impuestos', formato: 'moneda' },
      { clave: 'retencion_pct', etiqueta: 'Retención %', grupo: 'Impuestos', formato: 'porcentaje', ancho: 60 },
      { clave: 'retencion', etiqueta: 'Retención $', grupo: 'Impuestos', formato: 'moneda' },
      { clave: 'isr_pct', etiqueta: 'ISR %', grupo: 'Impuestos', formato: 'porcentaje', ancho: 60 },
      { clave: 'isr', etiqueta: 'ISR $', grupo: 'Impuestos', formato: 'moneda' },
      { clave: 'total', etiqueta: 'Total', grupo: 'Totales', formato: 'moneda' },
      { clave: 'saldo_favor', etiqueta: 'Saldo a favor', grupo: 'Totales', formato: 'moneda' },
      { clave: 'varias_gruas', etiqueta: 'Hay varias grúas (sí/no)', grupo: 'Condiciones', formato: 'texto', soloCondicion: true }
    ],
    tablas: [
      {
        clave: 'lineas',
        etiqueta: 'Tabla de viajes',
        columnas: [
          { campo: 'fecha', titulo: 'Fecha', ancho: 14, alinear: 'left', formato: 'texto' },
          { campo: 'folio', titulo: 'Folio', ancho: 13, alinear: 'left', formato: 'texto' },
          { campo: 'paraje', titulo: 'Paraje', ancho: 24, alinear: 'left', formato: 'texto' },
          { campo: 'grua', titulo: 'Grua #', ancho: 13, alinear: 'left', formato: 'texto' },
          { campo: 'metros', titulo: 'Metros', ancho: 16, alinear: 'right', formato: 'numero3' },
          { campo: 'subtotal_grupo', titulo: '', ancho: 20, alinear: 'right', formato: 'insignia', visibleSi: { campo: 'varias_gruas', cond: 'verdadero' } }
        ],
        camposFila: {
          fecha: 'Fecha (dd/mm/aaaa)', folio: 'Folio del viaje', paraje: 'Paraje', grua: 'Grúa (solo número)', grua_completa: 'Grúa (nombre completo)',
          metros: 'Metros', precio: 'Precio del viaje', importe: 'Importe del viaje', subtotal_grupo: 'Subtotal de metros por grúa',
          importe_grupo: 'Subtotal $ por grúa', n: 'Número de renglón'
        }
      },
      {
        clave: 'grupos',
        etiqueta: 'Precios de flete por grúa',
        columnas: [
          { campo: 'precio', titulo: 'Precio', ancho: 18, alinear: 'right', formato: 'moneda' },
          { campo: '', texto: 'Precio flete', titulo: 'Concepto', ancho: 52, alinear: 'left', formato: 'mayus' },
          { campo: 'importe', titulo: 'Importe', ancho: 30, alinear: 'right', formato: 'moneda' }
        ],
        camposFila: { n: 'Número de tarifa', grua: 'Grúa', precio: 'Precio', metros: 'Metros', importe: 'Importe' }
      },
      {
        clave: 'ajustes',
        etiqueta: 'Tabla de ajustes',
        columnas: [
          { campo: 'etiqueta', titulo: 'Concepto', ancho: 70, alinear: 'left', formato: 'mayus' },
          { campo: 'monto', titulo: 'Monto', ancho: 30, alinear: 'right', formato: 'monedaSigno' }
        ],
        camposFila: { n: 'Número de renglón', etiqueta: 'Concepto', monto: 'Monto', monto_abs: 'Monto sin signo', signo_texto: '«(-) Menos» / «(+) Más»' }
      }
    ]
  }
};

export function campoInfo(tipo, clave) {
  const cat = CATALOGO[tipo];
  return cat ? cat.campos.find((c) => c.clave === clave) : null;
}

export function tablaInfo(tipo, clave) {
  const cat = CATALOGO[tipo];
  return cat ? cat.tablas.find((t) => t.clave === clave) : null;
}

// ---------- Registro real → datos del formato ----------

function fechaDMY(iso) {
  return iso ? String(iso).split('-').reverse().join('/') : '';
}

const MESES_TITULO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
function fechaTitulo(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-').map(Number);
  return `${String(d).padStart(2, '0')} de ${MESES_TITULO[m - 1]}, ${y}`;
}

// Campos extra de cada renglón de ajustes (para diseños con color por signo).
function ajustesFilas(lista) {
  return lista.map((a, i) => ({ ...a, n: i + 1, monto_abs: Math.abs(a.monto), signo_texto: a.monto < 0 ? '(-) Menos' : '(+) Más' }));
}

function soloNumeroGrua(grua) {
  const g = (grua || '').trim();
  const m = g.replace(/^GRUA\s*/i, '').trim();
  return m || g;
}

// registro: forma de la fila de `formatos` (productor, grua, fecha,
// producto_fsc, destino, generos, ajustes, iva_rate, retencion_rate, isr_rate…).
export function datosExtraccion(registro = {}, settings = {}) {
  const r = calcularFormato({ generos: registro.generos, ajustes: registro.ajustes, iva_rate: registro.iva_rate, retencion_rate: registro.retencion_rate, isr_rate: registro.isr_rate });
  return {
    folio: registro.folio || '',
    productor: registro.productor || '',
    grua: registro.grua || '',
    destino: registro.destino || '',
    producto_fsc: registro.producto_fsc ?? settings.fsc_texto ?? '',
    fecha_larga: fechaLargaEs(registro.fecha),
    fecha_corta: fechaCortaEs(registro.fecha),
    fecha_titulo: fechaTitulo(registro.fecha),
    fecha: fechaDMY(registro.fecha),
    observaciones: registro.observaciones || '',
    empresa: settings.empresa_nombre || 'Forestal Tezains',
    logo: LOGO_DEFAULT,
    generos: r.generos.map((g, i) => ({ ...g, n: i + 1 })),
    ajustes: ajustesFilas(r.ajustes),
    total_metros: r.generos.reduce((s, g) => s + g.metros, 0),
    total_generos: r.totalGeneros,
    total_ajustes: r.totalAjustes,
    subtotal: r.subtotal,
    iva_pct: r.ivaRate * 100,
    iva: r.iva,
    retencion_pct: r.retencionRate * 100,
    retencion: r.retencion,
    isr_pct: r.isrRate * 100,
    isr: r.isr,
    total_neto: r.totalNeto,
    saldo_favor: r.saldoFavor
  };
}

function preciosPorGrua(gruasCatalog) {
  const mapa = {};
  (gruasCatalog || []).forEach((g) => {
    if (g && g.grua) mapa[g.grua] = g.precio_flete;
  });
  return mapa;
}

export function datosFlete(registro = {}, settings = {}, gruasCatalog = []) {
  const r = calcularFlete({
    lineas: registro.lineas, precio_flete: registro.precio_flete, ajustes: registro.ajustes,
    iva_rate: registro.iva_rate, retencion_rate: registro.retencion_rate, isr_rate: registro.isr_rate,
    precios_por_grua: preciosPorGrua(gruasCatalog)
  });
  const lineas = r.lineas.map((l, i) => {
    const grupo = r.grupos.find((g) => g.finIndex === i);
    return {
      fecha: fechaDMY(l.fecha),
      folio: l.folio,
      paraje: l.paraje,
      grua: soloNumeroGrua(l.grua),
      grua_completa: l.grua,
      metros: l.metros,
      precio: l.precio,
      importe: l.metros * l.precio,
      subtotal_grupo: grupo ? grupo.metros : null,
      importe_grupo: grupo ? grupo.importe : null,
      n: i + 1
    };
  });
  return {
    folio: registro.folio || '',
    fletero: registro.fletero || '',
    fecha_larga: fechaLargaEs(registro.fecha),
    fecha_corta: fechaCortaEs(registro.fecha),
    fecha_titulo: fechaTitulo(registro.fecha),
    fecha: fechaDMY(registro.fecha),
    observaciones: registro.observaciones || '',
    empresa: settings.empresa_nombre || 'Forestal Tezains',
    logo: LOGO_DEFAULT,
    lineas,
    grupos: r.grupos.map((g, i) => ({ n: i + 1, grua: g.grua, precio: g.precio, metros: g.metros, importe: g.importe })),
    ajustes: ajustesFilas(r.ajustes),
    varias_gruas: r.grupos.length > 1,
    num_viajes: r.lineas.length,
    total_metros: r.totalMetros,
    precio_flete: r.precioFlete,
    total_flete: r.totalFlete,
    total_ajustes: r.totalAjustes,
    subtotal: r.subtotal,
    iva_pct: r.ivaRate * 100,
    iva: r.iva,
    retencion_pct: r.retencionRate * 100,
    retencion: r.retencion,
    isr_pct: r.isrRate * 100,
    isr: r.isr,
    total: r.total,
    saldo_favor: r.saldoFavor
  };
}

export function construirDatos(tipo, registro, settings, extra) {
  return tipo === 'flete' ? datosFlete(registro, settings, extra) : datosExtraccion(registro, settings);
}

// ---------- Datos de ejemplo (vista previa del editor) ----------

export const EJEMPLO = {
  extraccion: {
    folio: '2026-0042',
    productor: 'Ejido San Juan Tezains',
    grua: 'GRUA 3',
    fecha: '2026-03-05',
    destino: 'Madymsa',
    producto_fsc: 'PRODUCTO CERTIFICADO FSC 100%\nFSC-C000000',
    generos: [
      { nombre: 'Pino primera', metros: 12.345, precio: 1450 },
      { nombre: 'Pino segunda', metros: 8.2, precio: 1100 },
      { nombre: 'Oyamel', metros: 5.75, precio: 980 },
      { nombre: 'Leña', metros: 3, precio: 350 }
    ],
    ajustes: [{ etiqueta: 'Anticipo', monto: -5000 }],
    iva_rate: 0.16,
    retencion_rate: 0,
    isr_rate: 0.0125,
    observaciones: 'Entrega en patio 2'
  },
  flete: {
    folio: 'F2026-0017',
    fletero: 'Transportes Hernández',
    fecha: '2026-03-05',
    lineas: [
      { fecha: '2026-03-01', folio: '1021', paraje: 'Los Pinos', grua: 'GRUA 1', metros: 18.4 },
      { fecha: '2026-03-02', folio: '1022', paraje: 'Los Pinos', grua: 'GRUA 1', metros: 17.95 },
      { fecha: '2026-03-03', folio: '1030', paraje: 'Cerro Alto', grua: 'GRUA 2', metros: 19.2 },
      { fecha: '2026-03-04', folio: '1031', paraje: 'Cerro Alto', grua: 'GRUA 2', metros: 16.8 }
    ],
    precio_flete: 290.76,
    ajustes: [{ etiqueta: 'Diésel', monto: -1500 }],
    iva_rate: 0.16,
    retencion_rate: 0.04,
    isr_rate: 0.0125
  },
  gruas: [
    { grua: 'GRUA 1', productor: '', precio_flete: 290.76 },
    { grua: 'GRUA 2', productor: '', precio_flete: 310.5 }
  ]
};

export function datosEjemplo(tipo, settings = {}) {
  return tipo === 'flete'
    ? datosFlete(EJEMPLO.flete, settings, EJEMPLO.gruas)
    : datosExtraccion(EJEMPLO.extraccion, settings);
}
