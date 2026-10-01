// Modelo del documento del Editor de Formatos.
//
// Un formato es un objeto JSON (se guarda en plantillas_formato.project_data)
// que dibuja src/editor/render/DocumentoRender.jsx — el mismo componente en
// el editor, en la vista previa y al imprimir, así lo que se ve es lo que
// sale en papel.
//
// Todas las medidas internas (x, y, w, h, tamaños de letra, grosores) están
// en píxeles CSS a 96 dpi; el panel de diseño las muestra en milímetros.
// Las coordenadas de un elemento son relativas a su padre (padreId), o a la
// página si no tiene. El orden del arreglo `elementos` es el orden de
// pintado entre hermanos: el último queda encima.

export const PX_MM = 96 / 25.4;
export const mmAPx = (mm) => (Number(mm) || 0) * PX_MM;
export const pxAMm = (px) => (Number(px) || 0) / PX_MM;
export const redondear = (n, d = 2) => Math.round((Number(n) || 0) * 10 ** d) / 10 ** d;

export const VERSION_DOC = 1;

export const PAPELES = {
  carta: { nombre: 'Carta', ancho: 215.9, alto: 279.4 },
  'media-carta': { nombre: 'Media carta', ancho: 139.7, alto: 215.9 },
  oficio: { nombre: 'Oficio', ancho: 215.9, alto: 340.2 },
  a4: { nombre: 'A4', ancho: 210, alto: 297 },
  a5: { nombre: 'A5', ancho: 148, alto: 210 },
  comprobante: { nombre: 'Comprobante 10.5 cm', ancho: 105, alto: 178 }
};

export const TIPOS_FORMATO = {
  extraccion: 'Extracción',
  flete: 'Flete'
};

let contador = 0;
export function nuevoId(prefijo = 'el') {
  contador = (contador + 1) % 1e6;
  return `${prefijo}_${Date.now().toString(36)}${contador.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function documentoVacio(opciones = {}) {
  const papel = PAPELES[opciones.papel || 'carta'];
  return {
    version: VERSION_DOC,
    pagina: {
      ancho: mmAPx(papel.ancho),
      alto: mmAPx(papel.alto),
      fondo: '#ffffff',
      // Propiedades de "frame" de la página (como en Figma).
      estilo: { relleno: { tipo: 'solido', color: '#ffffff' } },
      // El alto crece/encoge con el contenido real (tablas con más o menos
      // renglones), igual que los comprobantes originales.
      autoAlto: false,
      impresion: { papel: opciones.papel || 'carta', ajustar: true, margen: 6 }
    },
    paletas: [],
    recursos: [],
    elementos: []
  };
}

// ¿El project_data es de este editor? Los diseños guardados con el editor
// anterior (GrapesJS: pages/styles/symbols) no se pueden dibujar aquí.
export function esDocEditor(pd) {
  return Boolean(pd && typeof pd === 'object' && Array.isArray(pd.elementos));
}

export function plantillaCompatible(p) {
  return Boolean(p && esDocEditor(p.project_data));
}

// Normaliza un documento que viene de la base (puede venir vacío `{}` o de
// una versión anterior) para que el resto del código no tenga que revisar
// cada propiedad.
export function normalizarDoc(doc) {
  const base = documentoVacio();
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.elementos)) return base;
  return {
    ...base,
    ...doc,
    pagina: normalizarPagina(base.pagina, doc.pagina || {}),
    paletas: Array.isArray(doc.paletas) ? doc.paletas : [],
    recursos: Array.isArray(doc.recursos) ? doc.recursos : [],
    elementos: doc.elementos.map((e) => ({ ...elementoBase(e.tipo), ...e, estilo: { ...(e.estilo || {}) }, props: { ...(e.props || {}) } }))
  };
}

// Documentos anteriores solo tenían `fondo`: se pasa a estilo.relleno.
function normalizarPagina(base, pagina) {
  const p = { ...base, ...pagina, impresion: { ...base.impresion, ...(pagina.impresion || {}) } };
  const estilo = { ...(pagina.estilo || {}) };
  if (!estilo.relleno) estilo.relleno = { tipo: 'solido', color: pagina.fondo || '#ffffff' };
  p.estilo = estilo;
  return p;
}

export const ESTILO_TEXTO_DEFAULT = {
  fuente: 'Inter',
  tamano: 14,
  peso: 400,
  cursiva: false,
  color: '#111111',
  alinear: 'left',
  alinearV: 'center',
  interlineado: 1.2,
  espaciado: 0,
  mayus: false,
  subrayado: false,
  multilinea: true
};

export const NOMBRES_TIPO = {
  contenedor: 'Contenedor',
  grupo: 'Grupo',
  rect: 'Rectángulo',
  elipse: 'Elipse',
  linea: 'Línea',
  poligono: 'Polígono',
  estrella: 'Estrella',
  texto: 'Texto',
  imagen: 'Imagen',
  campo: 'Campo',
  tabla: 'Tabla',
  icono: 'Ícono'
};

export const TIPOS_CON_HIJOS = new Set(['contenedor', 'grupo']);
export const TIPOS_CON_TEXTO = new Set(['texto', 'campo', 'tabla']);

function elementoBase(tipo) {
  return {
    id: '',
    tipo,
    nombre: NOMBRES_TIPO[tipo] || tipo,
    padreId: null,
    x: 0,
    y: 0,
    w: 100,
    h: 60,
    rotacion: 0,
    opacidad: 1,
    oculto: false,
    bloqueado: false,
    visibleSi: null,
    colapsar: false,
    estilo: {},
    props: {}
  };
}

// Crea un elemento nuevo con valores por defecto sensatos para su tipo.
export function crearElemento(tipo, datos = {}) {
  const el = { ...elementoBase(tipo), id: nuevoId(), ...datos };
  const estilo = { ...(datos.estilo || {}) };
  const props = { ...(datos.props || {}) };
  switch (tipo) {
    case 'contenedor':
      Object.assign(el, { w: datos.w ?? 200, h: datos.h ?? 140 });
      estilo.relleno = estilo.relleno || { tipo: 'solido', color: '#ffffff' };
      estilo.borde = estilo.borde || { color: '#d4d4d8', grosor: 1, tipo: 'solid' };
      estilo.recortarHijos = estilo.recortarHijos ?? true;
      break;
    case 'grupo':
      break;
    case 'rect':
      estilo.relleno = estilo.relleno || { tipo: 'solido', color: '#d9d9d9' };
      break;
    case 'elipse':
      estilo.relleno = estilo.relleno || { tipo: 'solido', color: '#d9d9d9' };
      break;
    case 'poligono':
      estilo.relleno = estilo.relleno || { tipo: 'solido', color: '#d9d9d9' };
      props.lados = props.lados ?? 3;
      break;
    case 'estrella':
      estilo.relleno = estilo.relleno || { tipo: 'solido', color: '#d9d9d9' };
      props.puntas = props.puntas ?? 5;
      props.radioInterior = props.radioInterior ?? 0.45;
      break;
    case 'linea':
      Object.assign(el, { w: datos.w ?? 160, h: datos.h ?? 8 });
      estilo.borde = estilo.borde || { color: '#111111', grosor: 1.5, tipo: 'solid' };
      break;
    case 'texto':
      Object.assign(el, { w: datos.w ?? 160, h: datos.h ?? 28 });
      props.texto = props.texto ?? 'Texto';
      estilo.texto = { ...ESTILO_TEXTO_DEFAULT, ...(estilo.texto || {}) };
      break;
    case 'campo':
      Object.assign(el, { w: datos.w ?? 180, h: datos.h ?? 26 });
      props.formato = props.formato || 'texto';
      props.prefijo = props.prefijo ?? '';
      props.sufijo = props.sufijo ?? '';
      estilo.texto = { ...ESTILO_TEXTO_DEFAULT, peso: 700, ...(estilo.texto || {}) };
      break;
    case 'icono':
      Object.assign(el, { w: datos.w ?? 32, h: datos.h ?? 32 });
      props.icono = props.icono || 'dolar';
      props.color = props.color || '#111111';
      props.trazo = props.trazo ?? 2;
      break;
    case 'imagen':
      Object.assign(el, { w: datos.w ?? 120, h: datos.h ?? 120 });
      props.ajuste = props.ajuste || 'contain';
      break;
    case 'tabla':
      Object.assign(el, { w: datos.w ?? 360, h: datos.h ?? 120 });
      estilo.texto = { ...ESTILO_TEXTO_DEFAULT, tamano: 11.5, peso: 700, ...(estilo.texto || {}) };
      Object.assign(props, { ...tablaPropsDefault(), ...props });
      break;
    default:
      break;
  }
  el.estilo = estilo;
  el.props = props;
  return el;
}

export function tablaPropsDefault() {
  return {
    fuente: '',
    columnas: [],
    crecer: 'flujo', // 'flujo' = la tabla crece con los renglones y empuja lo de abajo; 'fijo' = mantiene su alto
    filasMinimas: 0,
    altoFila: 22,
    relleno: 4, // padding horizontal de cada celda
    encabezado: { mostrar: true, alto: 24, fondo: '#0e2841', color: '#ffffff', peso: 800, mayus: true, tamano: 11, separacion: 0 },
    filas: { fondo: 'transparent', fondoAlterno: '', alternarPrimero: true, mayus: true },
    bordes: { modo: 'ninguno', color: '#111111', grosor: 1 }
  };
}

// ---------- Árbol ----------

export function hijosDe(elementos, padreId) {
  return elementos.filter((e) => (e.padreId || null) === (padreId || null));
}

export function mapaPorId(elementos) {
  const m = new Map();
  for (const e of elementos) m.set(e.id, e);
  return m;
}

// Todos los descendientes (hijos, nietos…) de un elemento.
export function descendientes(elementos, id) {
  const out = [];
  const pila = [id];
  while (pila.length) {
    const actual = pila.pop();
    for (const e of elementos) {
      if (e.padreId === actual) {
        out.push(e.id);
        pila.push(e.id);
      }
    }
  }
  return out;
}

export function ancestros(porId, id) {
  const out = [];
  let el = porId.get(id);
  while (el && el.padreId) {
    out.push(el.padreId);
    el = porId.get(el.padreId);
  }
  return out;
}

// Posición absoluta (en la página) de la esquina de un elemento, sumando la
// de sus padres. Ignora rotaciones (suficiente para reubicar elementos al
// cambiarlos de contenedor).
export function posicionAbsoluta(porId, id) {
  let x = 0;
  let y = 0;
  let el = porId.get(id);
  while (el) {
    x += el.x;
    y += el.y;
    el = el.padreId ? porId.get(el.padreId) : null;
  }
  return { x, y };
}

// ---------- Estilo → CSS ----------

export function cssRelleno(relleno) {
  if (!relleno || relleno.tipo === 'ninguno') return undefined;
  if (relleno.tipo === 'degradado') {
    return `linear-gradient(${relleno.angulo ?? 180}deg, ${relleno.color || '#ffffff'}, ${relleno.color2 || '#000000'})`;
  }
  return relleno.color || undefined;
}

export function cssRadio(radio) {
  if (radio == null) return undefined;
  if (Array.isArray(radio)) return radio.map((r) => `${Number(r) || 0}px`).join(' ');
  return `${Number(radio) || 0}px`;
}

export function cssSombra(sombras) {
  const lista = (Array.isArray(sombras) ? sombras : sombras ? [sombras] : []).filter((s) => s && s.activa !== false);
  if (!lista.length) return undefined;
  return lista
    .map((s) => `${s.interior ? 'inset ' : ''}${s.x || 0}px ${s.y || 0}px ${s.blur || 0}px ${s.spread || 0}px ${s.color || 'rgba(0,0,0,0.25)'}`)
    .join(', ');
}

// Formas de recorte (clip-path) para "modificar la forma" de contenedores,
// rectángulos, textos e imágenes — p. ej. el cintillo en forma de etiqueta
// del formato de Extracción.
export const RECORTES = {
  ninguno: { nombre: 'Ninguno', css: undefined },
  'etiqueta-izq': { nombre: 'Etiqueta ◀', css: 'polygon(6% 0, 100% 0, 100% 100%, 6% 100%, 0 50%)' },
  'etiqueta-der': { nombre: 'Etiqueta ▶', css: 'polygon(0 0, 94% 0, 100% 50%, 94% 100%, 0 100%)' },
  'flecha-der': { nombre: 'Flecha ▶', css: 'polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%, 15% 50%)' },
  paralelogramo: { nombre: 'Paralelogramo', css: 'polygon(12% 0, 100% 0, 88% 100%, 0 100%)' },
  trapecio: { nombre: 'Trapecio', css: 'polygon(12% 0, 88% 0, 100% 100%, 0 100%)' },
  rombo: { nombre: 'Rombo', css: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' },
  hexagono: { nombre: 'Hexágono', css: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' },
  triangulo: { nombre: 'Triángulo', css: 'polygon(50% 0, 100% 100%, 0 100%)' },
  'esquina-cortada': { nombre: 'Esquina cortada', css: 'polygon(0 0, 88% 0, 100% 22%, 100% 100%, 0 100%)' },
  'onda-inferior': { nombre: 'Banda inclinada', css: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)' }
};

export function cssTexto(t = {}) {
  const tt = { ...ESTILO_TEXTO_DEFAULT, ...t };
  return {
    fontFamily: fuenteCss(tt.fuente),
    fontSize: `${tt.tamano}px`,
    fontWeight: tt.peso,
    fontStyle: tt.cursiva ? 'italic' : 'normal',
    color: tt.color,
    textAlign: tt.alinear,
    lineHeight: tt.interlineado,
    letterSpacing: tt.espaciado ? `${tt.espaciado}px` : undefined,
    textTransform: tt.mayus ? 'uppercase' : undefined,
    textDecoration: tt.subrayado ? 'underline' : undefined,
    textUnderlineOffset: tt.subrayado ? '3px' : undefined
  };
}

export const FUENTES = [
  { nombre: 'Inter', css: '"Inter", sans-serif' },
  { nombre: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { nombre: 'Roboto', css: '"Roboto", sans-serif' },
  { nombre: 'Montserrat', css: '"Montserrat", sans-serif' },
  { nombre: 'Poppins', css: '"Poppins", sans-serif' },
  { nombre: 'Oswald', css: '"Oswald", sans-serif' },
  { nombre: 'Bebas Neue', css: '"Bebas Neue", sans-serif' },
  { nombre: 'Georgia', css: 'Georgia, "Times New Roman", serif' },
  { nombre: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { nombre: 'Playfair Display', css: '"Playfair Display", serif' },
  { nombre: 'Lora', css: '"Lora", serif' },
  { nombre: 'Merriweather', css: '"Merriweather", serif' },
  { nombre: 'Courier New', css: '"Courier New", monospace' },
  { nombre: 'Roboto Mono', css: '"Roboto Mono", monospace' },
  { nombre: 'JetBrains Mono', css: '"JetBrains Mono", monospace' },
  { nombre: 'IBM Plex Mono', css: '"IBM Plex Mono", monospace' },
  { nombre: 'Dancing Script', css: '"Dancing Script", cursive' }
];

export function fuenteCss(nombre) {
  const f = FUENTES.find((x) => x.nombre === nombre);
  return f ? f.css : nombre ? `"${nombre}", sans-serif` : undefined;
}
