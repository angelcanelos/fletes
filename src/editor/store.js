import { create } from 'zustand';
import { produce } from 'immer';
import { crearElemento, descendientes, mapaPorId, posicionAbsoluta, hijosDe, nuevoId, TIPOS_CON_HIJOS } from './modelo.js';

// Estado del Editor de Formatos. Cada cambio al documento pasa por
// `cambiar()`, que guarda el documento anterior en el historial
// (deshacer/rehacer). Con immer los documentos comparten todo lo que no
// cambió, así guardar 150 versiones no duplica las imágenes.

const MAX_HISTORIAL = 150;
let portapapeles = null;

// Id especial: la página seleccionada como "frame".
export const ID_PAGINA = '__pagina';

export const useEditor = create((set, get) => ({
  plantilla: null,
  doc: null,
  seleccion: [],
  herramienta: 'mover',
  zoom: 1,
  pan: { x: 0, y: 0 },
  pasado: [],
  futuro: [],
  ultimaClave: null,
  ultimaVez: 0,
  editandoTextoId: null,
  mostrarNombres: false,
  vistaPrevia: false,
  sucio: false,
  revision: 0,

  cargar(plantilla, doc) {
    set({ plantilla, doc, seleccion: [], pasado: [], futuro: [], sucio: false, editandoTextoId: null, herramienta: 'mover', revision: 0 });
  },

  setPlantilla(cambios) {
    set((s) => ({ plantilla: { ...s.plantilla, ...cambios } }));
  },

  // recipe(draft) modifica el documento. opciones.clave agrupa cambios
  // continuos (arrastrar un slider, escribir un número) en un solo paso
  // de deshacer.
  cambiar(recipe, opciones = {}) {
    const s = get();
    if (!s.doc) return;
    const nuevo = produce(s.doc, recipe);
    if (nuevo === s.doc) return;
    const ahora = Date.now();
    const agrupar = opciones.clave && opciones.clave === s.ultimaClave && ahora - s.ultimaVez < 900;
    set({
      doc: nuevo,
      pasado: agrupar ? s.pasado : [...s.pasado, s.doc].slice(-MAX_HISTORIAL),
      futuro: [],
      ultimaClave: opciones.clave || null,
      ultimaVez: ahora,
      sucio: true,
      revision: s.revision + 1
    });
  },

  deshacer() {
    const s = get();
    if (!s.pasado.length) return;
    const anterior = s.pasado[s.pasado.length - 1];
    set({
      doc: anterior, pasado: s.pasado.slice(0, -1), futuro: [s.doc, ...s.futuro], ultimaClave: null, sucio: true, revision: s.revision + 1,
      seleccion: s.seleccion.filter((id) => id === ID_PAGINA || anterior.elementos.some((e) => e.id === id))
    });
  },

  rehacer() {
    const s = get();
    if (!s.futuro.length) return;
    const siguiente = s.futuro[0];
    set({
      doc: siguiente, futuro: s.futuro.slice(1), pasado: [...s.pasado, s.doc], ultimaClave: null, sucio: true, revision: s.revision + 1,
      seleccion: s.seleccion.filter((id) => id === ID_PAGINA || siguiente.elementos.some((e) => e.id === id))
    });
  },

  marcarGuardado() { set({ sucio: false }); },

  setSeleccion(ids) { set({ seleccion: Array.isArray(ids) ? ids : ids ? [ids] : [], editandoTextoId: null }); },
  setHerramienta(herramienta) { set({ herramienta }); },
  setZoom(zoom) { set({ zoom: Math.min(8, Math.max(0.1, zoom)) }); },
  setPan(pan) { set({ pan }); },
  setVista(cambios) { set(cambios); },
  editarTexto(id) { set({ editandoTextoId: id }); },

  // ---------- Elementos ----------

  actualizar(ids, recipe, opciones) {
    const lista = Array.isArray(ids) ? ids : [ids];
    get().cambiar((d) => {
      for (const el of d.elementos) if (lista.includes(el.id)) recipe(el);
    }, opciones);
  },

  agregar(elementos, { seleccionar = true } = {}) {
    const lista = Array.isArray(elementos) ? elementos : [elementos];
    get().cambiar((d) => { d.elementos.push(...lista); });
    if (seleccionar) set({ seleccion: lista.filter((e) => !lista.some((p) => p.id === e.padreId)).map((e) => e.id), herramienta: 'mover' });
  },

  eliminarSeleccion() {
    const { seleccion, doc } = get();
    if (!seleccion.length) return;
    const borrar = new Set(seleccion.filter((id) => {
      const el = doc.elementos.find((e) => e.id === id);
      return el && !el.bloqueado;
    }));
    for (const id of [...borrar]) for (const h of descendientes(doc.elementos, id)) borrar.add(h);
    if (!borrar.size) return;
    get().cambiar((d) => { d.elementos = d.elementos.filter((e) => !borrar.has(e.id)); });
    set({ seleccion: [] });
  },

  copiar() {
    const { seleccion, doc } = get();
    if (!seleccion.length) return;
    portapapeles = clonarConHijos(doc.elementos, seleccion, 0);
  },

  pegar() {
    if (!portapapeles) return;
    const copia = clonarConHijos(portapapeles.todos, portapapeles.raices, 12);
    const porIdDoc = mapaPorId(get().doc.elementos);
    // Si el padre original ya no existe, se pegan en la página.
    for (const e of copia.todos) if (e.padreId && !copia.todos.some((x) => x.id === e.padreId) && !porIdDoc.has(e.padreId)) e.padreId = null;
    get().agregar(copia.todos);
    set({ seleccion: copia.raices });
    portapapeles = clonarConHijos(copia.todos, copia.raices, 0);
  },

  duplicar() {
    const { seleccion, doc } = get();
    if (!seleccion.length) return;
    const copia = clonarConHijos(doc.elementos, seleccion, 10);
    get().agregar(copia.todos);
    set({ seleccion: copia.raices });
  },

  nudge(dx, dy) {
    const { seleccion, doc } = get();
    const ids = seleccion.filter((id) => { const e = doc.elementos.find((x) => x.id === id); return e && !e.bloqueado; });
    if (!ids.length) return;
    get().actualizar(ids, (el) => { el.x += dx; el.y += dy; }, { clave: 'nudge' });
  },

  agrupar() {
    const { seleccion, doc } = get();
    const porId = mapaPorId(doc.elementos);
    const sel = seleccion.map((id) => porId.get(id)).filter(Boolean);
    if (sel.length < 1) return;
    const padreId = sel[0].padreId || null;
    const hermanos = sel.filter((e) => (e.padreId || null) === padreId);
    if (!hermanos.length) return;
    const x0 = Math.min(...hermanos.map((e) => e.x));
    const y0 = Math.min(...hermanos.map((e) => e.y));
    const x1 = Math.max(...hermanos.map((e) => e.x + e.w));
    const y1 = Math.max(...hermanos.map((e) => e.y + e.h));
    const grupo = crearElemento('grupo', { nombre: 'Grupo', padreId, x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    const ids = new Set(hermanos.map((e) => e.id));
    get().cambiar((d) => {
      const indice = Math.max(...d.elementos.map((e, i) => (ids.has(e.id) ? i : -1)));
      for (const e of d.elementos) {
        if (ids.has(e.id)) { e.padreId = grupo.id; e.x -= x0; e.y -= y0; }
      }
      d.elementos.splice(indice + 1, 0, grupo);
    });
    set({ seleccion: [grupo.id] });
  },

  desagrupar() {
    const { seleccion, doc } = get();
    const porId = mapaPorId(doc.elementos);
    const grupos = seleccion.map((id) => porId.get(id)).filter((e) => e && TIPOS_CON_HIJOS.has(e.tipo));
    if (!grupos.length) return;
    const liberados = [];
    get().cambiar((d) => {
      for (const g of grupos) {
        const hijos = d.elementos.filter((e) => e.padreId === g.id);
        for (const h of hijos) {
          h.padreId = g.padreId || null;
          h.x += g.x;
          h.y += g.y;
          if (g.rotacion) h.rotacion = (h.rotacion || 0) + g.rotacion;
          liberados.push(h.id);
        }
        // Un grupo desaparece; un contenedor se queda (ya sin hijos) solo si tiene diseño propio.
        if (g.tipo === 'grupo') d.elementos = d.elementos.filter((e) => e.id !== g.id);
      }
    });
    set({ seleccion: liberados });
  },

  // dir: 'frente' | 'atras' | 'subir' | 'bajar'
  ordenar(dir) {
    const { seleccion } = get();
    if (!seleccion.length) return;
    get().cambiar((d) => {
      for (const id of dir === 'frente' || dir === 'subir' ? [...seleccion].reverse() : seleccion) {
        const i = d.elementos.findIndex((e) => e.id === id);
        if (i < 0) continue;
        const el = d.elementos[i];
        const hermanos = d.elementos.map((e, idx) => ({ e, idx })).filter(({ e }) => (e.padreId || null) === (el.padreId || null));
        const pos = hermanos.findIndex((h) => h.e.id === id);
        let destino = null;
        if (dir === 'frente') destino = hermanos[hermanos.length - 1];
        else if (dir === 'atras') destino = hermanos[0];
        else if (dir === 'subir') destino = hermanos[pos + 1];
        else if (dir === 'bajar') destino = hermanos[pos - 1];
        if (!destino || destino.e.id === id) continue;
        d.elementos.splice(i, 1);
        const j = d.elementos.findIndex((e) => e.id === destino.e.id);
        d.elementos.splice(dir === 'frente' || dir === 'subir' ? j + 1 : j, 0, el);
      }
    });
  },

  // Mueve un elemento a otro padre (o a la página) y lo coloca, en orden de
  // pintado, justo encima (despues=true) o debajo de `referenciaId`.
  moverA(id, nuevoPadreId, referenciaId = null, despues = true) {
    const { doc } = get();
    const porId = mapaPorId(doc.elementos);
    const el = porId.get(id);
    if (!el) return;
    if (nuevoPadreId && (nuevoPadreId === id || descendientes(doc.elementos, id).includes(nuevoPadreId))) return;
    const abs = posicionAbsoluta(porId, id);
    const absPadre = nuevoPadreId ? posicionAbsoluta(porId, nuevoPadreId) : { x: 0, y: 0 };
    get().cambiar((d) => {
      const i = d.elementos.findIndex((e) => e.id === id);
      const [mov] = d.elementos.splice(i, 1);
      if ((mov.padreId || null) !== (nuevoPadreId || null)) {
        mov.x = abs.x - absPadre.x;
        mov.y = abs.y - absPadre.y;
        mov.padreId = nuevoPadreId || null;
      }
      if (referenciaId) {
        const j = d.elementos.findIndex((e) => e.id === referenciaId);
        d.elementos.splice(despues ? j + 1 : j, 0, mov);
      } else {
        d.elementos.push(mov);
      }
    });
  },

  // Alinea la selección. Con un solo elemento, respecto a su padre (o la
  // página); con varios, respecto al recuadro que los contiene.
  alinear(modo) {
    const { seleccion, doc } = get();
    const porId = mapaPorId(doc.elementos);
    const sel = seleccion.map((id) => porId.get(id)).filter((e) => e && !e.bloqueado);
    if (!sel.length) return;
    let caja;
    if (sel.length === 1) {
      const p = sel[0].padreId ? porId.get(sel[0].padreId) : null;
      caja = p ? { x: 0, y: 0, w: p.w, h: p.h } : { x: 0, y: 0, w: doc.pagina.ancho, h: doc.pagina.alto };
    } else {
      const x0 = Math.min(...sel.map((e) => e.x));
      const y0 = Math.min(...sel.map((e) => e.y));
      caja = { x: x0, y: y0, w: Math.max(...sel.map((e) => e.x + e.w)) - x0, h: Math.max(...sel.map((e) => e.y + e.h)) - y0 };
    }
    get().actualizar(sel.map((e) => e.id), (el) => {
      if (modo === 'izq') el.x = caja.x;
      if (modo === 'centroH') el.x = caja.x + (caja.w - el.w) / 2;
      if (modo === 'der') el.x = caja.x + caja.w - el.w;
      if (modo === 'arriba') el.y = caja.y;
      if (modo === 'centroV') el.y = caja.y + (caja.h - el.h) / 2;
      if (modo === 'abajo') el.y = caja.y + caja.h - el.h;
    });
  },

  distribuir(eje) {
    const { seleccion, doc } = get();
    const porId = mapaPorId(doc.elementos);
    const sel = seleccion.map((id) => porId.get(id)).filter((e) => e && !e.bloqueado);
    if (sel.length < 3) return;
    const k = eje === 'h' ? 'x' : 'y';
    const t = eje === 'h' ? 'w' : 'h';
    const orden = [...sel].sort((a, b) => a[k] - b[k]);
    const inicio = orden[0][k];
    const fin = orden[orden.length - 1][k] + orden[orden.length - 1][t];
    const ocupado = orden.reduce((s, e) => s + e[t], 0);
    const hueco = (fin - inicio - ocupado) / (orden.length - 1);
    const posiciones = {};
    let cursor = inicio;
    for (const e of orden) { posiciones[e.id] = cursor; cursor += e[t] + hueco; }
    get().actualizar(orden.map((e) => e.id), (el) => { el[k] = posiciones[el.id]; });
  }
}));

// Clona elementos (con todos sus descendientes) con ids nuevos. Devuelve
// { todos, raices } donde raices son los ids nuevos de los elementos
// indicados.
function clonarConHijos(elementos, ids, desplazamiento) {
  const incluir = new Set();
  const raicesOrig = ids.filter((id) => elementos.some((e) => e.id === id));
  // Si se eligió un elemento y también su padre, basta con el padre.
  const porId = mapaPorId(elementos);
  const raicesFiltradas = raicesOrig.filter((id) => {
    let p = porId.get(id) && porId.get(id).padreId;
    while (p) { if (raicesOrig.includes(p)) return false; p = porId.get(p) && porId.get(p).padreId; }
    return true;
  });
  for (const id of raicesFiltradas) {
    incluir.add(id);
    for (const h of descendientes(elementos, id)) incluir.add(h);
  }
  const nuevos = new Map();
  for (const id of incluir) nuevos.set(id, nuevoId());
  const todos = elementos
    .filter((e) => incluir.has(e.id))
    .map((e) => {
      const c = JSON.parse(JSON.stringify(e));
      c.id = nuevos.get(e.id);
      if (raicesFiltradas.includes(e.id)) {
        c.x += desplazamiento;
        c.y += desplazamiento;
        c.bloqueado = false;
      } else {
        c.padreId = nuevos.get(e.padreId);
      }
      return c;
    });
  return { todos, raices: raicesFiltradas.map((id) => nuevos.get(id)) };
}

export { hijosDe };

// Solo en desarrollo: acceso al estado desde la consola para depurar.
if (import.meta.env && import.meta.env.DEV && typeof window !== 'undefined') window.__editor = useEditor;
