import { useRef } from 'react';
import { Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { MousePointer2, Hand, Frame, Square, Circle, Minus, Triangle, Star, Type, Image as ImageIcon, ChevronDown, Braces, Eye } from 'lucide-react';
import { useEditor } from '../store.js';
import { leerImagen } from '../imagenes.js';
import { useSubirImagen } from './PanelIzquierdo.jsx';
import { elementoDesdeArrastre } from './arrastre.js';

function Herramienta({ id, titulo, atajo, icono: Icon }) {
  const activa = useEditor((s) => s.herramienta === id);
  return (
    <Tooltip content={<span className="text-[12px]">{titulo} <kbd className="ml-1 text-default-400">{atajo}</kbd></span>} delay={300} closeDelay={0} size="sm" placement="top">
      <button
        type="button"
        aria-label={titulo}
        aria-pressed={activa}
        onClick={() => useEditor.getState().setHerramienta(id)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${activa ? 'bg-primary text-primary-foreground' : 'text-default-600 hover:bg-default-100 hover:text-foreground'}`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>
    </Tooltip>
  );
}

function GrupoMenu({ opciones, titulo }) {
  const herramienta = useEditor((s) => s.herramienta);
  const actual = opciones.find((o) => o.id === herramienta) || opciones[0];
  const activa = opciones.some((o) => o.id === herramienta);
  return (
    <div className="flex items-center">
      <Herramienta {...actual} />
      <Dropdown placement="top" classNames={{ content: 'min-w-[180px]' }}>
        <DropdownTrigger>
          <button type="button" aria-label={`Más ${titulo}`} className={`flex h-9 w-4 items-center justify-center rounded-md ${activa ? 'text-foreground' : 'text-default-400'} hover:bg-default-100`}>
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownTrigger>
        <DropdownMenu aria-label={titulo} onAction={(k) => useEditor.getState().setHerramienta(String(k))}>
          {opciones.map((o) => (
            <DropdownItem key={o.id} startContent={<o.icono className="h-4 w-4" />} endContent={<span className="text-[11px] text-default-400">{o.atajo}</span>}>
              {o.titulo}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}

export default function BarraHerramientas({ tipo, datos }) {
  const input = useRef(null);
  const subir = useSubirImagen();
  const mostrarNombres = useEditor((s) => s.mostrarNombres);
  const vistaPrevia = useEditor((s) => s.vistaPrevia);

  const insertarImagenes = async (archivos) => {
    const st = useEditor.getState();
    for (const f of Array.from(archivos || [])) {
      try {
        const img = await leerImagen(f);
        const r = subir(img);
        const [el] = elementoDesdeArrastre({ kind: 'recurso', id: r.id }, tipo, useEditor.getState().doc, datos);
        el.x = Math.round(st.doc.pagina.ancho / 2 - el.w / 2);
        el.y = Math.round(st.doc.pagina.alto / 3 - el.h / 2);
        useEditor.getState().agregar(el);
      } catch { /* no es imagen */ }
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-default-200 bg-content1 p-1 shadow-2xl">
        <GrupoMenu
          titulo="herramientas de mover"
          opciones={[
            { id: 'mover', titulo: 'Mover', atajo: 'V', icono: MousePointer2 },
            { id: 'mano', titulo: 'Mano', atajo: 'H', icono: Hand }
          ]}
        />
        <Herramienta id="contenedor" titulo="Contenedor" atajo="F" icono={Frame} />
        <GrupoMenu
          titulo="formas"
          opciones={[
            { id: 'rect', titulo: 'Rectángulo', atajo: 'R', icono: Square },
            { id: 'elipse', titulo: 'Elipse', atajo: 'O', icono: Circle },
            { id: 'linea', titulo: 'Línea', atajo: 'L', icono: Minus },
            { id: 'poligono', titulo: 'Polígono', atajo: 'P', icono: Triangle },
            { id: 'estrella', titulo: 'Estrella', atajo: 'Shift+P', icono: Star }
          ]}
        />
        <Herramienta id="texto" titulo="Texto" atajo="T" icono={Type} />
        <Tooltip content={<span className="text-[12px]">Imagen <kbd className="ml-1 text-default-400">I</kbd></span>} delay={300} closeDelay={0} size="sm" placement="top">
          <button
            type="button"
            id="editor-boton-imagen"
            aria-label="Insertar imagen"
            onClick={() => input.current && input.current.click()}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-default-600 hover:bg-default-100 hover:text-foreground"
          >
            <ImageIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </Tooltip>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { insertarImagenes(e.target.files); e.target.value = ''; }} />
        <span className="mx-1 h-6 w-px bg-default-200" />
        <Tooltip content="Mostrar nombres de los campos en lugar de datos de ejemplo" delay={300} closeDelay={0} size="sm" placement="top">
          <button
            type="button"
            aria-pressed={mostrarNombres}
            onClick={() => useEditor.getState().setVista({ mostrarNombres: !mostrarNombres })}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] ${mostrarNombres ? 'bg-violet-500/25 text-violet-200' : 'text-default-600 hover:bg-default-100'}`}
          >
            <Braces className="h-4 w-4" /> Campos
          </button>
        </Tooltip>
        <Tooltip content="Vista previa con datos de ejemplo: tablas que crecen y renglones condicionales" delay={300} closeDelay={0} size="sm" placement="top">
          <button
            type="button"
            aria-pressed={vistaPrevia}
            onClick={() => useEditor.getState().setVista({ vistaPrevia: !vistaPrevia, seleccion: [] })}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] ${vistaPrevia ? 'bg-primary text-primary-foreground' : 'text-default-600 hover:bg-default-100'}`}
          >
            <Eye className="h-4 w-4" /> Vista previa
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
