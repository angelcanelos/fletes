// Paletas de color predefinidas para el panel de diseño. Cada documento
// además guarda sus propias paletas (doc.paletas) y se listan primero.
export const PALETAS_PREDEFINIDAS = [
  { nombre: 'Forestal', colores: ['#15330f', '#2f6b1f', '#3f8f27', '#8fca75', '#eef7e8', '#ffffff'] },
  { nombre: 'Marino oficial', colores: ['#0e2841', '#16324f', '#2f6fa8', '#95ca58', '#d21f1f', '#ffffff'] },
  { nombre: 'Cielo', colores: ['#0b3d63', '#2e86c1', '#9ecaeb', '#aed4ee', '#e8f3fb', '#ffffff'] },
  { nombre: 'Tierra', colores: ['#3b2a1a', '#7a4e2d', '#b07a4f', '#d9b48f', '#f3e6d6', '#fffaf3'] },
  { nombre: 'Bosque otoñal', colores: ['#283618', '#606c38', '#dda15e', '#bc6c25', '#fefae0', '#ffffff'] },
  { nombre: 'Monocromo', colores: ['#000000', '#262626', '#525252', '#a3a3a3', '#e5e5e5', '#ffffff'] },
  { nombre: 'Corporativo', colores: ['#1d3557', '#457b9d', '#a8dadc', '#f1faee', '#e63946', '#ffffff'] },
  { nombre: 'Vino', colores: ['#2b0a0f', '#5e1621', '#9b2335', '#d4a5a5', '#f6e7e7', '#ffffff'] },
  { nombre: 'Atardecer', colores: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#ffffff'] },
  { nombre: 'Pastel', colores: ['#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff', '#ffffff'] }
];

// Recolecta todos los colores usados en el documento (para "Colores del
// documento" en el selector y para reasignar una paleta).
export function coloresDelDocumento(doc) {
  const set = new Set();
  const agregar = (c) => { if (c && typeof c === 'string' && c !== 'transparent') set.add(c.toLowerCase()); };
  const ep = (doc.pagina && doc.pagina.estilo) || {};
  if (ep.relleno && ep.relleno.tipo !== 'ninguno') { agregar(ep.relleno.color); if (ep.relleno.tipo === 'degradado') agregar(ep.relleno.color2); }
  for (const el of doc.elementos) {
    const e = el.estilo || {};
    if (e.relleno && e.relleno.tipo !== 'ninguno') { agregar(e.relleno.color); if (e.relleno.tipo === 'degradado') agregar(e.relleno.color2); }
    if (e.borde && e.borde.grosor > 0) agregar(e.borde.color);
    if (e.texto) agregar(e.texto.color);
    if (el.tipo === 'tabla') {
      const p = el.props;
      agregar(p.encabezado && p.encabezado.fondo);
      agregar(p.encabezado && p.encabezado.color);
      agregar(p.filas && p.filas.fondoAlterno);
      agregar(p.bordes && p.bordes.color);
    }
  }
  return [...set];
}

// Reemplaza cada color de los elementos indicados por el color de la paleta
// que ocupa la misma posición en el orden de "más oscuro a más claro".
// Así se conserva el contraste del diseño al cambiar de paleta.
function luminancia(hex) {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})/i.exec(hex || '');
  if (!m) return 0.5;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function mapaReasignacion(coloresActuales, paleta) {
  const actuales = [...new Set(coloresActuales.filter((c) => /^#/.test(c)))].sort((a, b) => luminancia(a) - luminancia(b));
  const destino = [...paleta].sort((a, b) => luminancia(a) - luminancia(b));
  const mapa = {};
  actuales.forEach((c, i) => {
    const idx = actuales.length === 1 ? 0 : Math.round((i / (actuales.length - 1)) * (destino.length - 1));
    mapa[c.toLowerCase()] = destino[idx];
  });
  return mapa;
}
