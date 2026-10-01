import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Moveable from 'react-moveable';
import Selecto from 'react-selecto';
import { useEditor, ID_PAGINA } from '../store.js';
import DocumentoRender from '../render/DocumentoRender.jsx';
import { crearElemento, mapaPorId, posicionAbsoluta, descendientes } from '../modelo.js';
import { elementoDesdeArrastre } from './arrastre.js';
import { leerImagen } from '../imagenes.js';
import MenuContextual from './MenuContextual.jsx';

const HERRAMIENTAS_DIBUJO = new Set(['contenedor', 'rect', 'elipse', 'linea', 'poligono', 'estrella', 'texto']);

function leerCaja(nodo) {
  const m = /rotate\((-?[\d.]+)deg\)/.exec(nodo.style.transform || '');
  return {
    x: parseFloat(nodo.style.left) || 0,
    y: parseFloat(nodo.style.top) || 0,
    w: parseFloat(nodo.style.width) || 0,
    h: parseFloat(nodo.style.height) || 0,
    rotacion: m ? Math.round(parseFloat(m[1]) * 100) / 100 : 0
  };
}

// Contenedor (no bloqueado, visible) más profundo bajo un punto de la
// pantalla, sin contar los ids excluidos.
function contenedorEnPunto(clientX, clientY, porId, excluir = new Set()) {
  const nodos = document.elementsFromPoint(clientX, clientY);
  for (const n of nodos) {
    const id = n.getAttribute && n.getAttribute('data-el-id');
    if (!id || excluir.has(id)) continue;
    const el = porId.get(id);
    if (el && el.tipo === 'contenedor' && !el.bloqueado) return el;
  }
  return null;
}

export default function Lienzo({ datos, tipo, onSubirImagen }) {
  const doc = useEditor((s) => s.doc);
  const seleccion = useEditor((s) => s.seleccion);
  const herramienta = useEditor((s) => s.herramienta);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const editandoTextoId = useEditor((s) => s.editandoTextoId);
  const mostrarNombres = useEditor((s) => s.mostrarNombres);
  const vistaPrevia = useEditor((s) => s.vistaPrevia);
  const nombrePlantilla = useEditor((s) => s.plantilla && s.plantilla.nombre);

  const viewportRef = useRef(null);
  // Selecto necesita el nodo real del lienzo al montarse (no un ref vacío).
  const [vpEl, setVpEl] = useState(null);
  const refViewport = useCallback((n) => { viewportRef.current = n; setVpEl(n); }, []);
  const paginaRef = useRef(null);
  const moveableRef = useRef(null);
  const selectoRef = useRef(null);
  const [targets, setTargets] = useState([]);
  const [guias, setGuias] = useState([]);
  const [espacio, setEspacio] = useState(false);
  const [shift, setShift] = useState(false);
  const [borrador, setBorrador] = useState(null);
  const [hover, setHover] = useState(null);
  const [menu, setMenu] = useState(null);
  const [soltando, setSoltando] = useState(false);

  const porId = useMemo(() => mapaPorId(doc.elementos), [doc.elementos]);

  // ---------- Coordenadas ----------
  const aPagina = useCallback((clientX, clientY) => {
    const r = paginaRef.current.getBoundingClientRect();
    const z = useEditor.getState().zoom;
    return { x: (clientX - r.left) / z, y: (clientY - r.top) / z };
  }, []);

  const aViewport = useCallback((clientX, clientY) => {
    const r = viewportRef.current.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }, []);

  // ---------- Ajustar a la pantalla ----------
  const ajustar = useCallback(() => {
    const vp = viewportRef.current;
    const { doc: d } = useEditor.getState();
    if (!vp || !d) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const z = Math.min((vw - 120) / d.pagina.ancho, (vh - 120) / d.pagina.alto, 2);
    useEditor.getState().setZoom(z);
    useEditor.getState().setPan({ x: (vw - d.pagina.ancho * z) / 2, y: Math.max(50, (vh - d.pagina.alto * z) / 2) });
  }, []);

  // Mientras la persona no haya movido el zoom o la vista, la hoja se
  // mantiene ajustada a la pantalla aunque cambie el tamaño de la ventana.
  const vistaManual = useRef(false);
  useEffect(() => {
    ajustar();
    const onAjustar = () => { vistaManual.current = false; ajustar(); };
    window.addEventListener('editor:ajustar', onAjustar);
    const ro = new ResizeObserver(() => { if (!vistaManual.current) ajustar(); });
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => { window.removeEventListener('editor:ajustar', onAjustar); ro.disconnect(); };
  }, [ajustar]);

  // Zoom centrado (botones / atajos): mantiene el centro de la pantalla.
  useEffect(() => {
    const onZoom = (e) => {
      vistaManual.current = true;
      const vp = viewportRef.current;
      if (!vp) return;
      const { zoom: z, pan: p } = useEditor.getState();
      const nuevo = Math.min(8, Math.max(0.1, e.detail.zoom ?? z * (e.detail.factor || 1)));
      const cx = vp.clientWidth / 2;
      const cy = vp.clientHeight / 2;
      useEditor.getState().setZoom(nuevo);
      useEditor.getState().setPan({ x: cx - ((cx - p.x) / z) * nuevo, y: cy - ((cy - p.y) / z) * nuevo });
    };
    window.addEventListener('editor:zoom', onZoom);
    return () => window.removeEventListener('editor:zoom', onZoom);
  }, []);

  // ---------- Teclas de estado (espacio = mano, shift = proporción) ----------
  useEffect(() => {
    const esCampo = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const abajo = (e) => {
      if (e.key === 'Shift') setShift(true);
      if (e.code === 'Space' && !esCampo(e.target)) { e.preventDefault(); setEspacio(true); }
    };
    const arriba = (e) => {
      if (e.key === 'Shift') setShift(false);
      if (e.code === 'Space') setEspacio(false);
    };
    const blur = () => { setShift(false); setEspacio(false); };
    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // ---------- Rueda: desplazar / zoom ----------
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      vistaManual.current = true;
      const { zoom: z, pan: p } = useEditor.getState();
      if (e.ctrlKey || e.metaKey) {
        const { x, y } = aViewport(e.clientX, e.clientY);
        const nuevo = Math.min(8, Math.max(0.1, z * Math.exp(-e.deltaY * 0.0022)));
        useEditor.getState().setZoom(nuevo);
        useEditor.getState().setPan({ x: x - ((x - p.x) / z) * nuevo, y: y - ((y - p.y) / z) * nuevo });
      } else {
        const dx = e.shiftKey ? e.deltaY : e.deltaX;
        const dy = e.shiftKey ? 0 : e.deltaY;
        useEditor.getState().setPan({ x: p.x - dx, y: p.y - dy });
      }
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [aViewport]);

  // ---------- Objetivos de Moveable ----------
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp || vistaPrevia) { setTargets([]); return; }
    const nodos = seleccion
      .map((id) => (id === ID_PAGINA ? paginaRef.current : vp.querySelector(`[data-el-id="${id}"]`)))
      .filter(Boolean);
    setTargets(nodos);
    if (seleccion.includes(ID_PAGINA)) { setGuias([]); return; }
    // Guías de alineación: la página y los hermanos de lo seleccionado.
    const padres = new Set(seleccion.map((id) => (porId.get(id) || {}).padreId || null));
    const hermanos = doc.elementos
      .filter((e) => padres.has(e.padreId || null) && !seleccion.includes(e.id) && !e.oculto)
      .map((e) => vp.querySelector(`[data-el-id="${e.id}"]`))
      .filter(Boolean);
    const padresNodos = [...padres].filter(Boolean).map((id) => vp.querySelector(`[data-el-id="${id}"]`)).filter(Boolean);
    setGuias([paginaRef.current, ...padresNodos, ...hermanos].filter(Boolean));
  }, [seleccion, doc, porId, vistaPrevia]);

  useEffect(() => {
    if (moveableRef.current) moveableRef.current.updateRect();
  }, [zoom, pan, doc, targets]);

  // ---------- Guardar el resultado de un gesto ----------
  const confirmarCajas = useCallback((nodos, evento) => {
    const st = useEditor.getState();
    const mapa = mapaPorId(st.doc.elementos);
    const cambios = nodos.map((n) => ({ id: n.getAttribute('data-el-id'), caja: leerCaja(n) }));

    // Arrastrar un solo elemento sobre/fuera de un contenedor lo mete o lo
    // saca de él (como en Figma). Los hijos de un "grupo" no se sacan.
    let destinoPadre; // undefined = se queda donde está
    if (evento && nodos.length === 1 && evento.clientX != null) {
      const el = mapa.get(cambios[0].id);
      const padreActual = el && el.padreId ? mapa.get(el.padreId) : null;
      if (el && (!padreActual || padreActual.tipo === 'contenedor')) {
        const excluir = new Set([el.id, ...descendientes(st.doc.elementos, el.id)]);
        const destino = contenedorEnPunto(evento.clientX, evento.clientY, mapa, excluir);
        const destinoId = destino ? destino.id : null;
        if (destinoId !== (el.padreId || null)) destinoPadre = destinoId;
      }
    }

    st.cambiar((d) => {
      for (const c of cambios) {
        const el = d.elementos.find((e) => e.id === c.id);
        if (el) Object.assign(el, c.caja);
      }
    });
    if (destinoPadre !== undefined) st.moverA(cambios[0].id, destinoPadre);
  }, []);

  // ---------- Selección con clic ----------
  // Primer clic: el elemento de nivel superior. Si ya hay algo
  // seleccionado dentro de un contenedor, se sigue eligiendo a ese nivel.
  // Ctrl/⌘+clic: directo el elemento más profundo.
  const resolverClic = useCallback((nodo, profundo) => {
    const cadena = [];
    let n = nodo;
    while (n && n !== paginaRef.current) {
      const id = n.getAttribute && n.getAttribute('data-el-id');
      if (id) cadena.unshift(id);
      n = n.parentElement;
    }
    if (!cadena.length) return null;
    if (profundo) return cadena[cadena.length - 1];
    const { seleccion: sel } = useEditor.getState();
    const mapa = porId;
    for (const actual of sel) {
      const el = mapa.get(actual);
      if (!el) continue;
      // Lo ya seleccionado sigue seleccionado (para poder arrastrarlo), salvo
      // un contenedor: al hacer clic en algo suyo se elige ese hijo.
      if (cadena.includes(actual) && !(el.tipo === 'contenedor' && cadena[cadena.length - 1] !== actual)) return actual;
      const idxPadre = el.padreId ? cadena.indexOf(el.padreId) : -1;
      if (idxPadre >= 0 && cadena[idxPadre + 1]) return cadena[idxPadre + 1];
    }
    // Como en Figma: los contenedores (frames) dejan elegir directo lo que
    // tienen dentro; los grupos se eligen completos (doble clic para entrar).
    let i = 0;
    while (i < cadena.length - 1 && (mapa.get(cadena[i]) || {}).tipo === 'contenedor') i += 1;
    return cadena[i];
  }, [porId]);

  // ---------- Dibujar con herramientas ----------
  const iniciarDibujo = useCallback((inputEvent) => {
    const tipoH = useEditor.getState().herramienta;
    const inicio = aPagina(inputEvent.clientX, inputEvent.clientY);
    const inicioVp = aViewport(inputEvent.clientX, inputEvent.clientY);
    const destino = contenedorEnPunto(inputEvent.clientX, inputEvent.clientY, porId);
    let actual = inicio;
    let actualVp = inicioVp;
    setBorrador({ x: inicioVp.x, y: inicioVp.y, w: 0, h: 0, tipo: tipoH });
    const mover = (ev) => {
      actual = aPagina(ev.clientX, ev.clientY);
      actualVp = aViewport(ev.clientX, ev.clientY);
      let w = actualVp.x - inicioVp.x;
      let h = actualVp.y - inicioVp.y;
      if (ev.shiftKey && tipoH !== 'linea') { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
      if (tipoH === 'linea') h = 2;
      setBorrador({ x: Math.min(inicioVp.x, inicioVp.x + w), y: Math.min(inicioVp.y, inicioVp.y + h), w: Math.abs(w), h: Math.abs(h), tipo: tipoH });
    };
    const soltar = (ev) => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      setBorrador(null);
      const z = useEditor.getState().zoom;
      let w = (actualVp.x - inicioVp.x) / z;
      let h = (actualVp.y - inicioVp.y) / z;
      if (ev.shiftKey && tipoH !== 'linea') { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
      let x = Math.min(inicio.x, inicio.x + w);
      let y = Math.min(inicio.y, inicio.y + h);
      w = Math.abs(w);
      h = Math.abs(h);
      const clic = w < 4 && h < 4;
      const base = crearElemento(tipoH);
      if (clic) {
        w = base.w; h = base.h;
        if (tipoH === 'rect' || tipoH === 'elipse' || tipoH === 'poligono' || tipoH === 'estrella') { w = 100; h = 100; }
      }
      if (tipoH === 'linea') { h = 8; y -= 4; }
      if (tipoH === 'texto' && !clic) h = Math.max(h, 20);
      let padreId = null;
      if (destino) {
        const abs = posicionAbsoluta(porId, destino.id);
        x -= abs.x;
        y -= abs.y;
        padreId = destino.id;
      }
      const el = { ...base, x, y, w, h, padreId };
      useEditor.getState().agregar(el);
      if (tipoH === 'texto') setTimeout(() => useEditor.getState().editarTexto(el.id), 30);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }, [aPagina, aViewport, porId]);

  // ---------- Mano / desplazar ----------
  const iniciarPan = useCallback((inputEvent) => {
    vistaManual.current = true;
    const inicio = { x: inputEvent.clientX, y: inputEvent.clientY };
    const panInicio = { ...useEditor.getState().pan };
    const vp = viewportRef.current;
    vp.style.cursor = 'grabbing';
    const mover = (ev) => {
      useEditor.getState().setPan({ x: panInicio.x + ev.clientX - inicio.x, y: panInicio.y + ev.clientY - inicio.y });
    };
    const soltar = () => {
      vp.style.cursor = '';
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }, []);

  // Botón central del ratón = desplazar siempre.
  const onPointerDownCaptura = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      iniciarPan(e);
    }
  };

  // ---------- Selecto (recuadro de selección + clics) ----------
  // Presionar el botón principal sobre el lienzo. Devuelve true si ya se
  // encargó (seleccionar/arrastrar un elemento, dibujar, desplazar); si no,
  // Selecto dibuja el recuadro de selección sobre el espacio vacío.
  const manejadoRef = useRef(false);
  const clicPaginaRef = useRef(null);
  const manejarPresion = (ev) => {
    const t = ev.target;
    if (t.closest && t.closest('.editor-menu')) return true;
    setMenu(null);
    const st = useEditor.getState();
    clicPaginaRef.current = null;
    // La etiqueta con el nombre (arriba de la hoja) selecciona la página.
    if (t.closest && t.closest('.editor-etiqueta-pagina') && !HERRAMIENTAS_DIBUJO.has(st.herramienta)) {
      st.setSeleccion([ID_PAGINA]);
      return true;
    }
    if (st.editandoTextoId && t.closest && t.closest('.doc-texto-editando')) return true;
    if (espacio || st.herramienta === 'mano') { iniciarPan(ev); return true; }
    if (vistaPrevia) return true;
    if (HERRAMIENTAS_DIBUJO.has(st.herramienta)) { ev.preventDefault(); iniciarDibujo(ev); return true; }
    const mov = moveableRef.current;
    if (mov && mov.isMoveableElement(t)) return true;
    if (targets.some((x) => x !== paginaRef.current && (x === t || x.contains(t))) && !(ev.ctrlKey || ev.metaKey || ev.shiftKey)) return true; // Moveable arrastra
    const nodo = t.closest && t.closest('[data-el-id]');
    if (nodo && paginaRef.current && paginaRef.current.contains(nodo)) {
      const id = resolverClic(nodo, ev.ctrlKey || ev.metaKey);
      if (!id) return true;
      const el = porId.get(id);
      let nueva;
      if (ev.shiftKey) nueva = st.seleccion.includes(id) ? st.seleccion.filter((x) => x !== id) : [...st.seleccion, id];
      else nueva = [id];
      flushSync(() => st.setSeleccion(nueva));
      if (!ev.shiftKey && el && !el.bloqueado && moveableRef.current) {
        moveableRef.current.waitToChangeTarget().then(() => {
          if (moveableRef.current) moveableRef.current.dragStart(ev);
        });
      }
      return true;
    }
    if (!ev.shiftKey && st.seleccion.length) st.setSeleccion([]);
    // Clic (sin arrastrar) en un espacio vacío de la hoja: se selecciona la
    // página, como un frame en Figma. Arrastrar ahí sigue haciendo recuadro.
    if (t === paginaRef.current) clicPaginaRef.current = { x: ev.clientX, y: ev.clientY };
    return false;
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) { manejadoRef.current = true; return; }
    manejadoRef.current = manejarPresion(e.nativeEvent);
  };

  const onSelectoDragStart = (e) => {
    const ev = e.inputEvent;
    if (manejadoRef.current || ev.button > 0) { e.stop(); return; }
    const t = ev.target;
    if ((t.closest && t.closest('[data-el-id]')) || (moveableRef.current && moveableRef.current.isMoveableElement(t))) e.stop();
  };

  const onSelectEnd = (e) => {
    if (e.isDragStart) return;
    const clic = clicPaginaRef.current;
    clicPaginaRef.current = null;
    const ie = e.inputEvent;
    if (clic && !e.selected.length && ie && Math.hypot((ie.clientX ?? clic.x) - clic.x, (ie.clientY ?? clic.y) - clic.y) < 4) {
      useEditor.getState().setSeleccion([ID_PAGINA]);
      return;
    }
    const ids = e.selected.map((n) => n.getAttribute('data-el-id')).filter((id) => {
      const el = porId.get(id);
      return el && !el.bloqueado;
    });
    const st = useEditor.getState();
    const base = e.inputEvent && e.inputEvent.shiftKey ? st.seleccion : [];
    st.setSeleccion([...new Set([...base, ...ids])]);
  };

  // ---------- Doble clic: entrar al contenedor / editar texto ----------
  const onDoubleClick = (e) => {
    if (vistaPrevia) return;
    const nodo = e.target.closest && e.target.closest('[data-el-id]');
    if (!nodo) return;
    const st = useEditor.getState();
    const cadena = [];
    let n = nodo;
    while (n && n !== paginaRef.current) {
      const id = n.getAttribute && n.getAttribute('data-el-id');
      if (id) cadena.unshift(id);
      n = n.parentElement;
    }
    // Doble clic sobre un texto: se edita directo, esté donde esté.
    const profundo = porId.get(cadena[cadena.length - 1]);
    if (profundo && profundo.tipo === 'texto' && !profundo.bloqueado) {
      st.setSeleccion([profundo.id]);
      st.editarTexto(profundo.id);
      return;
    }
    const actual = st.seleccion.length === 1 ? st.seleccion[0] : null;
    const idx = actual ? cadena.indexOf(actual) : -1;
    if (idx >= 0 && idx < cadena.length - 1) {
      st.setSeleccion([cadena[idx + 1]]);
      return;
    }
    const el = porId.get(actual || cadena[cadena.length - 1]);
    if (el && el.tipo === 'texto' && !el.bloqueado) {
      st.setSeleccion([el.id]);
      st.editarTexto(el.id);
    }
  };

  // ---------- Menú contextual ----------
  const onContextMenu = (e) => {
    e.preventDefault();
    if (vistaPrevia) return;
    const st = useEditor.getState();
    const nodo = e.target.closest && e.target.closest('[data-el-id]');
    if (nodo && paginaRef.current.contains(nodo)) {
      const id = resolverClic(nodo, e.ctrlKey || e.metaKey);
      if (id && !st.seleccion.includes(id)) st.setSeleccion([id]);
    }
    const p = aViewport(e.clientX, e.clientY);
    setMenu({ x: p.x, y: p.y });
  };

  // ---------- Hover ----------
  const onPointerMove = (e) => {
    if (vistaPrevia || e.buttons) { if (hover) setHover(null); return; }
    const nodo = e.target.closest && e.target.closest('[data-el-id]');
    if (!nodo || !paginaRef.current || !paginaRef.current.contains(nodo)) { if (hover) setHover(null); return; }
    const id = resolverClic(nodo, e.ctrlKey || e.metaKey);
    if (!id || useEditor.getState().seleccion.includes(id)) { if (hover) setHover(null); return; }
    const objetivo = viewportRef.current.querySelector(`[data-el-id="${id}"]`);
    if (!objetivo) return;
    const r = objetivo.getBoundingClientRect();
    const v = viewportRef.current.getBoundingClientRect();
    const nuevo = { id, x: r.left - v.left, y: r.top - v.top, w: r.width, h: r.height };
    if (!hover || hover.id !== id || hover.x !== nuevo.x || hover.y !== nuevo.y) setHover(nuevo);
  };

  // ---------- Soltar elementos del panel o archivos ----------
  const onDragOver = (e) => {
    if (vistaPrevia) return;
    const tipos = Array.from(e.dataTransfer.types || []);
    if (tipos.includes('application/x-editor-formato') || tipos.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!soltando) setSoltando(true);
    }
  };

  const colocar = useCallback((els, clientX, clientY) => {
    if (!els || !els.length) return;
    const p = aPagina(clientX, clientY);
    const raiz = els[0];
    const destino = contenedorEnPunto(clientX, clientY, porId);
    let x = p.x - raiz.w / 2;
    let y = p.y - raiz.h / 2;
    let padreId = null;
    if (destino) {
      const abs = posicionAbsoluta(porId, destino.id);
      x -= abs.x;
      y -= abs.y;
      padreId = destino.id;
    }
    raiz.x = Math.round(x);
    raiz.y = Math.round(y);
    raiz.padreId = padreId;
    useEditor.getState().agregar(els);
  }, [aPagina, porId]);

  const onDrop = async (e) => {
    setSoltando(false);
    if (vistaPrevia) return;
    e.preventDefault();
    const { clientX, clientY } = e;
    const crudo = e.dataTransfer.getData('application/x-editor-formato');
    if (crudo) {
      const info = JSON.parse(crudo);
      colocar(elementoDesdeArrastre(info, tipo, useEditor.getState().doc, datos), clientX, clientY);
      return;
    }
    const archivos = Array.from(e.dataTransfer.files || []).filter((f) => /^image\//.test(f.type));
    for (const archivo of archivos) {
      try {
        const img = await leerImagen(archivo);
        const recurso = onSubirImagen(img);
        colocar(elementoDesdeArrastre({ kind: 'recurso', id: recurso.id }, tipo, useEditor.getState().doc, datos), clientX, clientY);
      } catch { /* archivo no válido: se ignora */ }
    }
  };

  // Estable entre renders: así DocumentoRender (memo) no se vuelve a
  // dibujar completo cada vez que cambia algo ajeno al documento.
  const onTextoCambio = useCallback((id, texto) => {
    const st = useEditor.getState();
    st.actualizar(id, (el) => { el.props.texto = texto; });
    // Solo cierra la edición si sigue siendo la de este texto (el guardado
    // puede llegar después de que ya se empezó a editar otro).
    if (useEditor.getState().editandoTextoId === id) st.editarTexto(null);
  }, []);

  // ---------- Render ----------
  const seleccionEls = seleccion.map((id) => porId.get(id)).filter(Boolean);
  const paginaSel = seleccion.length === 1 && seleccion[0] === ID_PAGINA;
  const unico = seleccionEls.length === 1 ? seleccionEls[0] : null;
  const bloqueado = seleccionEls.some((e) => e.bloqueado);
  const cursor = espacio || herramienta === 'mano' ? 'grab' : HERRAMIENTAS_DIBUJO.has(herramienta) ? 'crosshair' : 'default';
  const keepRatio = shift;

  return (
    <div
      ref={refViewport}
      className={`editor-lienzo relative min-w-0 flex-1 select-none overflow-hidden ${soltando ? 'editor-lienzo--soltando' : ''}`}
      style={{ cursor }}
      onPointerDownCapture={onPointerDownCaptura}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(null)}
      onDragOver={onDragOver}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setSoltando(false); }}
      onDrop={onDrop}
    >
      <div
        className="editor-mundo absolute left-0 top-0"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        <div
          className={`editor-etiqueta-pagina absolute left-0 cursor-default whitespace-nowrap font-medium ${paginaSel ? 'text-[#0d99ff]' : 'text-violet-300 hover:text-violet-200'}`}
          style={{ top: -22 / zoom, fontSize: 12 / zoom }}
        >
          ◇ {nombrePlantilla || 'Formato'}
        </div>
        <div className="editor-pagina-sombra">
          <DocumentoRender
            doc={doc}
            datos={datos}
            tipo={tipo}
            modo={vistaPrevia ? 'miniatura' : 'editor'}
            mostrarNombres={mostrarNombres && !vistaPrevia}
            editandoTextoId={editandoTextoId}
            onTextoCambio={onTextoCambio}
            paginaRef={paginaRef}
          />
        </div>
      </div>

      {hover && !editandoTextoId && (
        <div className="pointer-events-none absolute border border-[#0d99ff]" style={{ left: hover.x, top: hover.y, width: hover.w, height: hover.h }} />
      )}

      {borrador && (
        <div
          className={`pointer-events-none absolute border border-[#0d99ff] bg-[#0d99ff]/10 ${borrador.tipo === 'elipse' ? 'rounded-full' : ''}`}
          style={{ left: borrador.x, top: borrador.y, width: Math.max(1, borrador.w), height: Math.max(1, borrador.h) }}
        />
      )}

      {!vistaPrevia && (
        <Moveable
          ref={moveableRef}
          target={targets.length ? targets : null}
          draggable={!bloqueado && !editandoTextoId && !paginaSel}
          resizable={!bloqueado && !editandoTextoId}
          rotatable={!bloqueado && !editandoTextoId && targets.length === 1 && !paginaSel}
          keepRatio={Boolean(keepRatio)}
          throttleDrag={0}
          throttleResize={0}
          throttleRotate={shift ? 15 : 0}
          origin={false}
          snappable
          snapThreshold={6}
          isDisplaySnapDigit
          snapGap
          snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
          elementGuidelines={guias}
          rotationPosition="top"
          renderDirections={paginaSel ? ['e', 's', 'se'] : unico && unico.tipo === 'linea' ? ['w', 'e'] : ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
          onDrag={(e) => {
            e.target.style.left = `${e.left}px`;
            e.target.style.top = `${e.top}px`;
          }}
          onDragEnd={(e) => { if (e.isDrag) confirmarCajas([e.target], e.inputEvent); }}
          onDragGroup={(e) => {
            e.events.forEach((ev) => {
              ev.target.style.left = `${ev.left}px`;
              ev.target.style.top = `${ev.top}px`;
            });
          }}
          onDragGroupEnd={(e) => { if (e.isDrag) confirmarCajas(e.targets, null); }}
          onResize={(e) => {
            e.target.style.width = `${Math.max(1, e.width)}px`;
            e.target.style.height = `${Math.max(1, e.height)}px`;
            if (e.target === paginaRef.current) return; // la página crece desde su esquina, no se mueve
            e.target.style.left = `${e.drag.left}px`;
            e.target.style.top = `${e.drag.top}px`;
          }}
          onResizeEnd={(e) => {
            if (!e.isDrag) return;
            if (e.target === paginaRef.current) {
              const w = parseFloat(e.target.style.width);
              const h = parseFloat(e.target.style.height);
              useEditor.getState().cambiar((d) => { d.pagina.ancho = Math.round(w * 100) / 100; d.pagina.alto = Math.round(h * 100) / 100; });
              return;
            }
            confirmarCajas([e.target], null);
          }}
          onResizeGroup={(e) => {
            e.events.forEach((ev) => {
              ev.target.style.width = `${Math.max(1, ev.width)}px`;
              ev.target.style.height = `${Math.max(1, ev.height)}px`;
              ev.target.style.left = `${ev.drag.left}px`;
              ev.target.style.top = `${ev.drag.top}px`;
            });
          }}
          onResizeGroupEnd={(e) => { if (e.isDrag) confirmarCajas(e.targets, null); }}
          onRotate={(e) => {
            e.target.style.transform = `rotate(${Math.round(e.rotation * 10) / 10}deg)`;
          }}
          onRotateEnd={(e) => { if (e.isDrag) confirmarCajas([e.target], null); }}
        />
      )}

      {!vistaPrevia && vpEl && (
        <Selecto
          ref={selectoRef}
          container={vpEl}
          dragContainer={vpEl}
          rootContainer={vpEl}
          selectableTargets={['.editor-mundo .doc-el--raiz']}
          hitRate={0}
          selectByClick={false}
          selectFromInside={false}
          toggleContinueSelect={['shift']}
          ratio={0}
          onDragStart={onSelectoDragStart}
          onSelectEnd={onSelectEnd}
        />
      )}

      {menu && <MenuContextual x={menu.x} y={menu.y} onCerrar={() => setMenu(null)} />}
    </div>
  );
}

