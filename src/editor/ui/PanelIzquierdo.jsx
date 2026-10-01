import { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, Tab, Input, Accordion, AccordionItem, Button } from '@heroui/react';
import {
  Frame, Group, Square, Circle, Minus, Triangle, Star, Type, Image as ImageIcon, Braces, Table2, Eye, EyeOff, Lock, Unlock,
  ChevronRight, Search, Upload, Plus, Trash2, GripVertical, LayoutTemplate, Rows3
} from 'lucide-react';
import { useEditor, ID_PAGINA } from '../store.js';
import { hijosDe, mapaPorId, nuevoId } from '../modelo.js';
import { CATALOGO } from '../campos.js';
import { iniciarArrastre, elementoDesdeArrastre, BLOQUES } from './arrastre.js';
import { leerImagen, pesoKb } from '../imagenes.js';
import { Api } from '../../lib/api.js';
import { ICONOS } from '../iconos.js';

export const ICONOS_TIPO = {
  contenedor: Frame, grupo: Group, rect: Square, elipse: Circle, linea: Minus, poligono: Triangle, estrella: Star,
  texto: Type, imagen: ImageIcon, campo: Braces, tabla: Table2, icono: Star
};

// ---------------- Capas ----------------

function FilaCapa({ el, nivel, porId, elementos, arrastre, setArrastre, abiertos, setAbiertos }) {
  const seleccion = useEditor((s) => s.seleccion);
  const [renombrando, setRenombrando] = useState(false);
  const hijos = hijosDe(elementos, el.id);
  const tieneHijos = hijos.length > 0;
  const abierto = abiertos[el.id] ?? false;
  const seleccionado = seleccion.includes(el.id);
  const Icono = ICONOS_TIPO[el.tipo] || Square;
  const esContenedor = el.tipo === 'contenedor' || el.tipo === 'grupo';
  const zona = arrastre && arrastre.sobre === el.id ? arrastre.zona : null;

  const onClick = (e) => {
    const st = useEditor.getState();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      st.setSeleccion(st.seleccion.includes(el.id) ? st.seleccion.filter((x) => x !== el.id) : [...st.seleccion, el.id]);
    } else {
      st.setSeleccion([el.id]);
    }
  };

  return (
    <>
      <div
        role="treeitem"
        aria-selected={seleccionado}
        tabIndex={-1}
        draggable={!renombrando}
        onDragStart={(e) => { e.dataTransfer.setData('text/x-capa', el.id); e.dataTransfer.effectAllowed = 'move'; setArrastre({ id: el.id }); }}
        onDragEnd={() => setArrastre(null)}
        onDragOver={(e) => {
          if (!arrastre || arrastre.id === el.id) return;
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          const f = (e.clientY - r.top) / r.height;
          const z = esContenedor && f > 0.3 && f < 0.7 ? 'dentro' : f < 0.5 ? 'arriba' : 'abajo';
          if (arrastre.sobre !== el.id || arrastre.zona !== z) setArrastre({ ...arrastre, sobre: el.id, zona: z });
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!arrastre || arrastre.id === el.id) return;
          const st = useEditor.getState();
          if (zona === 'dentro') {
            st.moverA(arrastre.id, el.id, null);
            setAbiertos((a) => ({ ...a, [el.id]: true }));
          } else {
            // La lista muestra lo de encima primero: "arriba" = pintar después.
            st.moverA(arrastre.id, el.padreId || null, el.id, zona === 'arriba');
          }
          setArrastre(null);
        }}
        onClick={onClick}
        onDoubleClick={() => setRenombrando(true)}
        className={`group relative flex h-7 cursor-default items-center gap-1 rounded-md pr-1 text-[12px] ${seleccionado ? 'bg-primary/25 text-foreground' : 'text-default-600 hover:bg-default-100'} ${el.oculto ? 'opacity-50' : ''} ${zona === 'dentro' ? 'ring-1 ring-primary' : ''}`}
        style={{ paddingLeft: 4 + nivel * 14 }}
      >
        {zona === 'arriba' && <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-primary" />}
        {zona === 'abajo' && <span className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-primary" />}
        <button
          type="button"
          aria-label={abierto ? 'Contraer' : 'Expandir'}
          className={`flex h-4 w-4 flex-none items-center justify-center ${tieneHijos ? 'text-default-400' : 'invisible'}`}
          onClick={(e) => { e.stopPropagation(); setAbiertos((a) => ({ ...a, [el.id]: !abierto })); }}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${abierto ? 'rotate-90' : ''}`} />
        </button>
        <Icono className={`h-3.5 w-3.5 flex-none ${el.tipo === 'campo' || el.tipo === 'tabla' ? 'text-violet-400' : 'text-default-400'}`} />
        {renombrando ? (
          <input
            autoFocus
            defaultValue={el.nombre}
            aria-label="Nombre de la capa"
            className="min-w-0 flex-1 rounded bg-default-100 px-1 outline-none ring-1 ring-primary"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur(); }}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v && v !== el.nombre) useEditor.getState().actualizar(el.id, (x) => { x.nombre = v; });
              setRenombrando(false);
            }}
          />
        ) : (
          <span className={`min-w-0 flex-1 truncate ${el.tipo === 'campo' || el.tipo === 'tabla' ? 'text-violet-300' : ''}`}>{el.nombre}</span>
        )}
        <span className={`flex flex-none items-center gap-0.5 ${el.bloqueado || el.oculto ? '' : 'opacity-0 group-hover:opacity-100'}`}>
          <button type="button" aria-label={el.bloqueado ? 'Desbloquear' : 'Bloquear'} className="p-0.5 text-default-400 hover:text-foreground" onClick={(e) => { e.stopPropagation(); useEditor.getState().actualizar(el.id, (x) => { x.bloqueado = !x.bloqueado; }); }}>
            {el.bloqueado ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
          <button type="button" aria-label={el.oculto ? 'Mostrar' : 'Ocultar'} className="p-0.5 text-default-400 hover:text-foreground" onClick={(e) => { e.stopPropagation(); useEditor.getState().actualizar(el.id, (x) => { x.oculto = !x.oculto; }); }}>
            {el.oculto ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </span>
      </div>
      {tieneHijos && abierto && [...hijos].reverse().map((h) => (
        <FilaCapa key={h.id} el={h} nivel={nivel + 1} porId={porId} elementos={elementos} arrastre={arrastre} setArrastre={setArrastre} abiertos={abiertos} setAbiertos={setAbiertos} />
      ))}
    </>
  );
}

function PanelCapas() {
  const doc = useEditor((s) => s.doc);
  const seleccion = useEditor((s) => s.seleccion);
  const [arrastre, setArrastre] = useState(null);
  const [abiertos, setAbiertos] = useState({});
  const porId = useMemo(() => mapaPorId(doc.elementos), [doc.elementos]);
  const raiz = hijosDe(doc.elementos, null);

  // Al seleccionar algo desde el lienzo, se abren sus padres en el árbol.
  useEffect(() => {
    const faltan = {};
    for (const id of seleccion) {
      let e = porId.get(id);
      while (e && e.padreId) { faltan[e.padreId] = true; e = porId.get(e.padreId); }
    }
    if (Object.keys(faltan).length) setAbiertos((a) => (Object.keys(faltan).every((k) => a[k]) ? a : { ...a, ...faltan }));
  }, [seleccion, porId]);

  if (!raiz.length) {
    return <p className="p-4 text-center text-[12px] text-default-400">Aún no hay capas. Dibuja con la barra inferior o arrastra elementos desde «Elementos».</p>;
  }

  return (
    <div
      role="tree"
      aria-label="Capas"
      className="flex flex-col gap-px p-2"
      onDragOver={(e) => { if (arrastre) e.preventDefault(); }}
      onDrop={(e) => {
        // Soltar en el espacio vacío: mandar a la página, hasta arriba.
        if (arrastre && e.target === e.currentTarget) { useEditor.getState().moverA(arrastre.id, null, null); setArrastre(null); }
      }}
    >
      <div
        role="treeitem"
        aria-selected={seleccion.includes(ID_PAGINA)}
        tabIndex={-1}
        onClick={() => useEditor.getState().setSeleccion([ID_PAGINA])}
        className={`flex h-7 cursor-default items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold ${seleccion.includes(ID_PAGINA) ? 'bg-primary/25 text-foreground' : 'text-default-700 hover:bg-default-100'}`}
      >
        <Frame className="h-3.5 w-3.5 text-violet-400" /> Página
      </div>
      {[...raiz].reverse().map((el) => (
        <FilaCapa key={el.id} el={el} nivel={0} porId={porId} elementos={doc.elementos} arrastre={arrastre} setArrastre={setArrastre} abiertos={abiertos} setAbiertos={setAbiertos} />
      ))}
      <div className="h-16" />
    </div>
  );
}

// ---------------- Elementos (datos + formas + bloques) ----------------

function agregarAlCentro(info, tipo, datos) {
  const st = useEditor.getState();
  const els = elementoDesdeArrastre(info, tipo, st.doc, datos);
  if (!els.length) return;
  const raiz = els[0];
  raiz.x = Math.round(st.doc.pagina.ancho / 2 - raiz.w / 2);
  raiz.y = Math.round(Math.min(st.doc.pagina.alto - raiz.h - 10, st.doc.pagina.alto / 2 - raiz.h / 2));
  st.agregar(els);
}

function Item({ info, tipo, datos, icono: Icono, titulo, desc, extra, violeta }) {
  return (
    <div
      draggable
      onDragStart={(e) => iniciarArrastre(e, info)}
      onDoubleClick={() => agregarAlCentro(info, tipo, datos)}
      className="group flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-default-100 active:cursor-grabbing"
      title="Arrastra al lienzo (o doble clic para agregarlo al centro)"
    >
      <GripVertical className="h-3 w-3 flex-none text-default-300 opacity-0 group-hover:opacity-100" />
      <Icono className={`h-3.5 w-3.5 flex-none ${violeta ? 'text-violet-400' : 'text-default-400'}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate">{titulo}</p>
        {desc && <p className="truncate text-[10.5px] text-default-400">{desc}</p>}
      </div>
      {extra}
    </div>
  );
}

function PanelElementos({ tipo, datos }) {
  const [q, setQ] = useState('');
  const cat = CATALOGO[tipo];
  const coincide = (t) => !q || t.toLowerCase().includes(q.toLowerCase());
  const grupos = {};
  for (const c of cat.campos) {
    if (c.soloCondicion || !coincide(c.etiqueta)) continue;
    (grupos[c.grupo] = grupos[c.grupo] || []).push(c);
  }
  const tablas = cat.tablas.filter((t) => coincide(t.etiqueta));
  const formas = [
    ['contenedor', 'Contenedor', Frame], ['rect', 'Rectángulo', Square], ['elipse', 'Elipse', Circle], ['linea', 'Línea', Minus],
    ['poligono', 'Polígono', Triangle], ['estrella', 'Estrella', Star], ['texto', 'Texto', Type]
  ].filter(([, n]) => coincide(n));

  return (
    <div className="flex flex-col gap-1 p-2">
      <Input
        size="sm"
        variant="flat"
        aria-label="Buscar elementos"
        placeholder="Buscar dato o forma…"
        value={q}
        onValueChange={setQ}
        startContent={<Search className="h-3.5 w-3.5 text-default-400" />}
        classNames={{ inputWrapper: 'h-8 min-h-8', input: 'text-[12px]' }}
      />
      <p className="px-1 pt-1 text-[11px] leading-snug text-default-400">
        Arrastra al lienzo los datos que llena el sistema. <span className="text-violet-300">Morado</span> = dato vivo.
      </p>
      <Accordion selectionMode="multiple" isCompact defaultExpandedKeys={['tablas', 'Datos generales', 'Totales']} itemClasses={{ title: 'text-[12px] font-semibold', trigger: 'py-1.5', content: 'pt-0 pb-2' }}>
        {tablas.length > 0 && (
          <AccordionItem key="tablas" title="Tablas" startContent={<Table2 className="h-3.5 w-3.5 text-violet-400" />}>
            {tablas.map((t) => (
              <Item key={t.clave} info={{ kind: 'tabla', clave: t.clave }} tipo={tipo} datos={datos} icono={Table2} violeta titulo={t.etiqueta} desc={t.columnas.map((c) => c.titulo).filter(Boolean).join(' · ')} />
            ))}
          </AccordionItem>
        )}
        {Object.entries(grupos).map(([g, lista]) => (
          <AccordionItem key={g} title={g} startContent={<Braces className="h-3.5 w-3.5 text-violet-400" />}>
            {lista.map((c) => (
              <Item
                key={c.clave}
                info={{ kind: 'campo', clave: c.clave }}
                tipo={tipo}
                datos={datos}
                icono={Braces}
                violeta
                titulo={c.etiqueta}
                extra={(
                  <span
                      draggable
                      role="button"
                      tabIndex={0}
                      aria-label="Renglón etiqueta + valor"
                      title="Agregar como renglón «etiqueta + valor»"
                      onDragStart={(e) => { e.stopPropagation(); iniciarArrastre(e, { kind: 'etiquetaValor', clave: c.clave }); }}
                      onClick={() => agregarAlCentro({ kind: 'etiquetaValor', clave: c.clave }, tipo, datos)}
                      className="flex h-5 w-5 flex-none items-center justify-center rounded text-default-400 opacity-0 hover:bg-default-200 hover:text-foreground group-hover:opacity-100"
                    >
                      <Rows3 className="h-3 w-3" />
                    </span>
                )}
              />
            ))}
          </AccordionItem>
        ))}
        <AccordionItem key="empresa-img" title="Imágenes" startContent={<ImageIcon className="h-3.5 w-3.5 text-default-400" />}>
          <Item info={{ kind: 'logo' }} tipo={tipo} datos={datos} icono={ImageIcon} violeta titulo="Logo de la empresa" desc="Se actualiza solo si cambia el logo" />
          <p className="px-2 text-[11px] text-default-400">Tus propias imágenes están en «Recursos».</p>
        </AccordionItem>
        <AccordionItem key="formas" title="Formas" startContent={<Square className="h-3.5 w-3.5 text-default-400" />}>
          {formas.map(([t, n, I]) => <Item key={t} info={{ kind: 'forma', tipo: t }} tipo={tipo} datos={datos} icono={I} titulo={n} />)}
        </AccordionItem>
        <AccordionItem key="iconos" title="Íconos" startContent={<Star className="h-3.5 w-3.5 text-default-400" />}>
          <div className="grid grid-cols-7 gap-1 px-1">
            {Object.entries(ICONOS).filter(([, v]) => coincide(v.nombre)).map(([k, v]) => {
              const I = v.c;
              return (
                <div
                  key={k}
                  draggable
                  title={`${v.nombre} — arrastra al lienzo`}
                  onDragStart={(e) => iniciarArrastre(e, { kind: 'icono', id: k, nombre: v.nombre })}
                  onDoubleClick={() => agregarAlCentro({ kind: 'icono', id: k, nombre: v.nombre }, tipo, datos)}
                  className="flex h-8 cursor-grab items-center justify-center rounded-md text-default-500 hover:bg-default-100 hover:text-foreground"
                >
                  <I className="h-4 w-4" />
                </div>
              );
            })}
          </div>
        </AccordionItem>
        <AccordionItem key="bloques" title="Bloques" startContent={<LayoutTemplate className="h-3.5 w-3.5 text-default-400" />}>
          {BLOQUES.filter((b) => coincide(b.nombre)).map((b) => <Item key={b.id} info={{ kind: 'bloque', id: b.id }} tipo={tipo} datos={datos} icono={LayoutTemplate} titulo={b.nombre} desc={b.desc} />)}
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// ---------------- Recursos (imágenes subidas) ----------------

// Agrega una imagen a los recursos del diseño. Si ya estaba (misma huella
// o mismo contenido), se reutiliza en lugar de guardarla dos veces.
export function useSubirImagen() {
  return (img) => {
    const { doc } = useEditor.getState();
    const existente = (doc.recursos || []).find((r) => (img.hash && r.hash === img.hash) || r.dataUrl === img.dataUrl);
    if (existente) return existente;
    const recurso = {
      id: nuevoId('img'),
      nombre: (img.nombre || 'Imagen').replace(/\.[a-z0-9]+$/i, ''),
      dataUrl: img.dataUrl,
      w: img.w,
      h: img.h,
      hash: img.hash || ''
    };
    useEditor.getState().cambiar((d) => { d.recursos.push(recurso); });
    return recurso;
  };
}

// Imágenes que ya se subieron en OTROS diseños, para reutilizarlas sin
// volver a subirlas. Sale de la lista de diseños (funciona también sin
// internet, con la copia guardada en la computadora).
function useBiblioteca(plantillaId, recursosActuales) {
  const [otros, setOtros] = useState(null);
  useEffect(() => {
    let vivo = true;
    Api.listarPlantillas()
      .then((lista) => {
        if (!vivo) return;
        const vistos = new Map();
        for (const p of lista) {
          if (Number(p.id) === Number(plantillaId)) continue;
          const recursos = (p.project_data && Array.isArray(p.project_data.recursos)) ? p.project_data.recursos : [];
          for (const r of recursos) {
            if (!r || !r.dataUrl) continue;
            const clave = r.hash || r.dataUrl;
            if (!vistos.has(clave)) vistos.set(clave, { ...r, disenio: p.nombre });
          }
        }
        setOtros([...vistos.values()]);
      })
      .catch(() => { if (vivo) setOtros([]); });
    return () => { vivo = false; };
  }, [plantillaId]);
  if (!otros) return null;
  return otros.filter((r) => !recursosActuales.some((a) => (r.hash && a.hash === r.hash) || a.dataUrl === r.dataUrl));
}

function PanelRecursos({ tipo, datos }) {
  const doc = useEditor((s) => s.doc);
  const plantillaId = useEditor((s) => s.plantilla && s.plantilla.id);
  const subir = useSubirImagen();
  const input = useRef(null);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const usados = new Set(doc.elementos.map((e) => e.props && e.props.recursoId).filter(Boolean));
  const sinUsar = doc.recursos.filter((r) => !usados.has(r.id));
  const totalKb = doc.recursos.reduce((s, r) => s + pesoKb(r.dataUrl), 0);
  const biblioteca = useBiblioteca(plantillaId, doc.recursos);

  const onArchivos = async (lista) => {
    setError('');
    setSubiendo(true);
    for (const f of Array.from(lista || [])) {
      try { await subir(await leerImagen(f)); } catch (e) { setError(e.message); }
    }
    setSubiendo(false);
  };

  // Copia una imagen de otro diseño a este (sin el nombre del diseño de origen).
  const traer = (r) => subir({ nombre: r.nombre, dataUrl: r.dataUrl, w: r.w, h: r.h, hash: r.hash });

  return (
    <div className="flex flex-col gap-2 p-2">
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { onArchivos(e.target.files); e.target.value = ''; }} />
      <Button size="sm" variant="flat" color="primary" isLoading={subiendo} startContent={!subiendo && <Upload className="h-3.5 w-3.5" />} onPress={() => input.current && input.current.click()}>
        Subir imágenes
      </Button>
      <p className="text-[11px] leading-snug text-default-400">PNG, JPG, SVG o WebP. Se optimizan y se guardan dentro del formato, así se ven en todas las computadoras y sin internet. También puedes arrastrarlas directo al lienzo.</p>
      {error && <p className="text-[11px] text-danger">{error}</p>}

      <p className="mt-1 text-[11px] font-semibold text-default-600">En este diseño</p>
      <div className="grid grid-cols-2 gap-2">
        <div
          draggable
          onDragStart={(e) => iniciarArrastre(e, { kind: 'logo' })}
          onDoubleClick={() => agregarAlCentro({ kind: 'logo' }, tipo, datos)}
          className="editor-ajedrez flex aspect-square cursor-grab flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-default-200 p-2"
          title="Logo de la empresa"
        >
          <img src={datos.logo} alt="" className="max-h-[70%] max-w-full object-contain" draggable={false} />
          <span className="rounded bg-black/60 px-1 text-[10px] text-white">Logo</span>
        </div>
        {doc.recursos.map((r) => (
          <div
            key={r.id}
            draggable
            onDragStart={(e) => iniciarArrastre(e, { kind: 'recurso', id: r.id })}
            onDoubleClick={() => agregarAlCentro({ kind: 'recurso', id: r.id }, tipo, datos)}
            className="editor-ajedrez group relative flex aspect-square cursor-grab items-center justify-center overflow-hidden rounded-lg border border-default-200 p-2"
            title={`${r.nombre} · ${pesoKb(r.dataUrl)} KB${usados.has(r.id) ? '' : ' · sin usar'}`}
          >
            <img src={r.dataUrl} alt={r.nombre} className={`max-h-full max-w-full object-contain ${usados.has(r.id) ? '' : 'opacity-50'}`} draggable={false} />
            <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/60 px-1 text-[10px] text-white">{r.nombre} · {pesoKb(r.dataUrl)} KB</span>
            <button
              type="button"
              aria-label="Eliminar imagen"
              className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 hover:bg-danger group-hover:opacity-100"
              onClick={() => {
                if (usados.has(r.id) && !window.confirm('Esta imagen se usa en el diseño. ¿Eliminarla? Los elementos que la usan quedarán vacíos.')) return;
                useEditor.getState().cambiar((d) => { d.recursos = d.recursos.filter((x) => x.id !== r.id); });
              }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {doc.recursos.length > 0 && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-default-400">
          <span>{doc.recursos.length} imagen(es) · {totalKb} KB</span>
          {sinUsar.length > 0 && (
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-default-500 hover:bg-default-100 hover:text-foreground"
              title="Quita del diseño las imágenes que no se usan en ningún elemento (se puede deshacer con Ctrl+Z)"
              onClick={() => {
                const ids = new Set(sinUsar.map((r) => r.id));
                useEditor.getState().cambiar((d) => { d.recursos = d.recursos.filter((x) => !ids.has(x.id)); });
              }}
            >
              Quitar {sinUsar.length} sin usar
            </button>
          )}
        </div>
      )}

      {biblioteca && biblioteca.length > 0 && (
        <>
          <p className="mt-2 text-[11px] font-semibold text-default-600">De otros diseños</p>
          <p className="-mt-1 text-[11px] leading-snug text-default-400">Clic para agregarla a este diseño (doble clic la pone en el centro).</p>
          <div className="grid grid-cols-3 gap-1.5">
            {biblioteca.map((r) => (
              <button
                key={r.hash || r.id}
                type="button"
                onClick={() => traer(r)}
                onDoubleClick={() => { const nuevo = traer(r); agregarAlCentro({ kind: 'recurso', id: nuevo.id }, tipo, datos); }}
                className="editor-ajedrez group relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-default-200 p-1.5 hover:border-primary"
                title={`${r.nombre} — de «${r.disenio}» · ${pesoKb(r.dataUrl)} KB`}
              >
                <img src={r.dataUrl} alt={r.nombre} className="max-h-full max-w-full object-contain" draggable={false} />
                <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex"><Plus className="h-4 w-4" /></span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PanelIzquierdo({ tipo, datos }) {
  return (
    <aside className="editor-panel flex w-[256px] flex-none flex-col border-r border-default-100 bg-content1">
      <Tabs aria-label="Panel izquierdo" size="sm" variant="underlined" classNames={{ base: 'px-2 pt-1', tabList: 'gap-3', panel: 'p-0 min-h-0 flex-1 overflow-y-auto editor-scroll' }}>
        <Tab key="capas" title="Capas"><PanelCapas /></Tab>
        <Tab key="elementos" title="Elementos"><PanelElementos tipo={tipo} datos={datos} /></Tab>
        <Tab key="recursos" title="Recursos"><PanelRecursos tipo={tipo} datos={datos} /></Tab>
      </Tabs>
    </aside>
  );
}
