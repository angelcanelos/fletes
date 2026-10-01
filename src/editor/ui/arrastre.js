// Convierte lo que se arrastra desde el panel "Elementos"/"Recursos" en
// elementos del documento. Devuelve un arreglo cuyo primer elemento es la
// raíz (los demás, si hay, son sus hijos).
import { crearElemento, tablaPropsDefault } from '../modelo.js';
import { CATALOGO, campoInfo, tablaInfo } from '../campos.js';
import { altoTabla } from '../layout.js';

export const MIME_ARRASTRE = 'application/x-editor-formato';

export function iniciarArrastre(e, info) {
  e.dataTransfer.setData(MIME_ARRASTRE, JSON.stringify(info));
  e.dataTransfer.effectAllowed = 'copy';
}

export function elementoDesdeArrastre(info, tipo, doc, datos) {
  switch (info.kind) {
    case 'campo': {
      const c = campoInfo(tipo, info.clave) || { etiqueta: info.clave, formato: 'texto' };
      return [crearElemento('campo', {
        nombre: c.etiqueta,
        w: c.ancho || 180,
        h: c.alto || 26,
        props: { campo: info.clave, formato: c.formato || 'texto' },
        estilo: c.alto ? { texto: { multilinea: true, alinear: 'center', tamano: 10 } } : {}
      })];
    }
    case 'etiquetaValor': {
      const c = campoInfo(tipo, info.clave) || { etiqueta: info.clave, formato: 'texto' };
      const grupo = crearElemento('grupo', { nombre: c.etiqueta, w: 320, h: 24 });
      const lab = crearElemento('texto', {
        nombre: `${c.etiqueta} · etiqueta`, padreId: grupo.id, x: 0, y: 0, w: 200, h: 24,
        props: { texto: c.etiqueta }, estilo: { texto: { peso: 700, tamano: 12, mayus: true, multilinea: false } }
      });
      const val = crearElemento('campo', {
        nombre: `${c.etiqueta} · valor`, padreId: grupo.id, x: 200, y: 0, w: 120, h: 24,
        props: { campo: info.clave, formato: c.formato || 'texto' }, estilo: { texto: { peso: 700, tamano: 12, alinear: 'right', multilinea: false } }
      });
      return [grupo, lab, val];
    }
    case 'tabla': {
      const t = tablaInfo(tipo, info.clave);
      if (!t) return [];
      const el = crearElemento('tabla', {
        nombre: t.etiqueta,
        w: Math.min(doc.pagina.ancho - 40, 520),
        props: { ...tablaPropsDefault(), fuente: t.clave, columnas: t.columnas.map((c) => ({ ...c })) }
      });
      el.h = Math.max(40, altoTabla(el, datos));
      return [el];
    }
    case 'logo':
      return [crearElemento('imagen', { nombre: 'Logo', w: 110, h: 110, props: { campo: 'logo', ajuste: 'contain' } })];
    case 'recurso': {
      const r = (doc.recursos || []).find((x) => x.id === info.id);
      if (!r) return [];
      const max = 220;
      const escala = Math.min(1, max / Math.max(r.w || max, r.h || max));
      return [crearElemento('imagen', {
        nombre: r.nombre || 'Imagen',
        w: Math.round((r.w || max) * escala),
        h: Math.round((r.h || max) * escala),
        props: { recursoId: r.id, ajuste: 'contain' }
      })];
    }
    case 'icono':
      return [crearElemento('icono', { nombre: info.nombre || 'Ícono', w: 32, h: 32, props: { icono: info.id } })];
    case 'forma':
      return [crearElemento(info.tipo, info.tipo === 'texto' ? {} : { w: 100, h: 100 })];
    case 'bloque':
      return bloque(info.id);
    default:
      return [];
  }
}

// Bloques prearmados para arrancar rápido.
export const BLOQUES = [
  { id: 'caja-sombra', nombre: 'Caja de dato con sombra', desc: 'Recuadro blanco con sombra sólida, como grúa y fecha del formato 2026' },
  { id: 'banda-titulo', nombre: 'Banda de título', desc: 'Cintillo de color con texto blanco' },
  { id: 'saldo', nombre: 'Barra de saldo', desc: 'Barra de color con etiqueta y monto' },
  { id: 'firma', nombre: 'Línea de firma', desc: 'Línea con nombre debajo' }
];

function bloque(id) {
  if (id === 'caja-sombra') {
    const g = crearElemento('grupo', { nombre: 'Caja con sombra', w: 240, h: 44 });
    return [
      g,
      crearElemento('rect', { nombre: 'Sombra', padreId: g.id, x: 0, y: 15, w: 240, h: 29, estilo: { relleno: { tipo: 'solido', color: '#0e2841' }, radio: [0, 8, 8, 0] } }),
      crearElemento('texto', {
        nombre: 'Caja', padreId: g.id, x: 4.5, y: 0, w: 210, h: 32, props: { texto: 'DATO' },
        estilo: { relleno: { tipo: 'solido', color: '#ffffff' }, borde: { color: '#111111', grosor: 1.5, tipo: 'solid' }, radio: 8, padding: [0, 14], texto: { peso: 800, tamano: 13, mayus: true, multilinea: false } }
      })
    ];
  }
  if (id === 'banda-titulo') {
    return [crearElemento('texto', {
      nombre: 'Banda de título', w: 320, h: 70, props: { texto: 'TÍTULO DEL FORMATO' },
      estilo: { relleno: { tipo: 'solido', color: '#0e2841' }, recorte: 'etiqueta-izq', padding: [6, 12], texto: { color: '#ffffff', peso: 800, tamano: 16, alinear: 'center', mayus: true } }
    })];
  }
  if (id === 'saldo') {
    const c = crearElemento('contenedor', { nombre: 'Barra de saldo', w: 360, h: 34, estilo: { relleno: { tipo: 'solido', color: '#0e2841' }, recortarHijos: false } });
    return [
      c,
      crearElemento('texto', { nombre: 'Etiqueta', padreId: c.id, x: 12, y: 0, w: 180, h: 34, props: { texto: 'Saldo a favor :' }, estilo: { texto: { color: '#ffffff', peso: 900, tamano: 14, mayus: true, multilinea: false } } }),
      crearElemento('campo', { nombre: 'Monto', padreId: c.id, x: 190, y: 0, w: 158, h: 34, props: { campo: 'saldo_favor', formato: 'moneda' }, estilo: { texto: { color: '#ffffff', peso: 900, tamano: 14, alinear: 'right', multilinea: false } } })
    ];
  }
  if (id === 'firma') {
    const g = crearElemento('grupo', { nombre: 'Firma', w: 200, h: 40 });
    return [
      g,
      crearElemento('linea', { nombre: 'Línea', padreId: g.id, x: 0, y: 8, w: 200, h: 8, estilo: { borde: { color: '#111111', grosor: 1, tipo: 'solid' } } }),
      crearElemento('texto', { nombre: 'Nombre', padreId: g.id, x: 0, y: 18, w: 200, h: 22, props: { texto: 'Nombre y firma' }, estilo: { texto: { tamano: 11, alinear: 'center', multilinea: false } } })
    ];
  }
  return [];
}

export { CATALOGO };
