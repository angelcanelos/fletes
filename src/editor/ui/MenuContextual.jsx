import { useEffect, useRef } from 'react';
import { Listbox, ListboxItem, ListboxSection } from '@heroui/react';
import { useEditor } from '../store.js';
import { TIPOS_CON_HIJOS } from '../modelo.js';

const K = ({ children }) => <span className="text-[11px] text-default-400">{children}</span>;

export default function MenuContextual({ x, y, onCerrar }) {
  const ref = useRef(null);
  const st = useEditor();
  const sel = st.seleccion.map((id) => st.doc.elementos.find((e) => e.id === id)).filter(Boolean);
  const hay = sel.length > 0;
  const bloqueado = sel.some((e) => e.bloqueado);
  const oculto = sel.some((e) => e.oculto);
  const esGrupo = sel.some((e) => TIPOS_CON_HIJOS.has(e.tipo));

  useEffect(() => {
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) onCerrar(); };
    const esc = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('pointerdown', cerrar, true);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', cerrar, true);
      window.removeEventListener('keydown', esc);
    };
  }, [onCerrar]);

  const accion = (key) => {
    const a = useEditor.getState();
    switch (key) {
      case 'copiar': a.copiar(); break;
      case 'pegar': a.pegar(); break;
      case 'duplicar': a.duplicar(); break;
      case 'eliminar': a.eliminarSeleccion(); break;
      case 'agrupar': a.agrupar(); break;
      case 'desagrupar': a.desagrupar(); break;
      case 'frente': a.ordenar('frente'); break;
      case 'subir': a.ordenar('subir'); break;
      case 'bajar': a.ordenar('bajar'); break;
      case 'atras': a.ordenar('atras'); break;
      case 'bloquear': a.actualizar(a.seleccion, (el) => { el.bloqueado = !bloqueado; }); break;
      case 'ocultar': a.actualizar(a.seleccion, (el) => { el.oculto = !oculto; }); break;
      case 'todo': a.setSeleccion(a.doc.elementos.filter((e) => !e.padreId && !e.bloqueado).map((e) => e.id)); break;
      default: break;
    }
    onCerrar();
  };

  const deshabilitadas = [];
  if (!hay) deshabilitadas.push('copiar', 'duplicar', 'eliminar', 'agrupar', 'frente', 'subir', 'bajar', 'atras', 'bloquear', 'ocultar');
  if (!esGrupo) deshabilitadas.push('desagrupar');
  if (bloqueado) deshabilitadas.push('eliminar');

  return (
    <div
      ref={ref}
      className="editor-menu absolute z-50 w-60 rounded-xl border border-default-200 bg-content1 p-1 shadow-2xl"
      style={{ left: x, top: y }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <Listbox aria-label="Acciones" variant="flat" disabledKeys={deshabilitadas} onAction={accion} itemClasses={{ base: 'py-1 rounded-md', title: 'text-[13px]' }}>
        <ListboxSection showDivider>
          <ListboxItem key="copiar" endContent={<K>Ctrl+C</K>}>Copiar</ListboxItem>
          <ListboxItem key="pegar" endContent={<K>Ctrl+V</K>}>Pegar</ListboxItem>
          <ListboxItem key="duplicar" endContent={<K>Ctrl+D</K>}>Duplicar</ListboxItem>
          <ListboxItem key="eliminar" className="text-danger" color="danger" endContent={<K>Supr</K>}>Eliminar</ListboxItem>
        </ListboxSection>
        <ListboxSection showDivider>
          <ListboxItem key="agrupar" endContent={<K>Ctrl+G</K>}>Agrupar selección</ListboxItem>
          <ListboxItem key="desagrupar" endContent={<K>Ctrl+Shift+G</K>}>Desagrupar</ListboxItem>
        </ListboxSection>
        <ListboxSection showDivider>
          <ListboxItem key="frente" endContent={<K>Ctrl+Shift+]</K>}>Traer al frente</ListboxItem>
          <ListboxItem key="subir" endContent={<K>Ctrl+]</K>}>Subir una capa</ListboxItem>
          <ListboxItem key="bajar" endContent={<K>Ctrl+[</K>}>Bajar una capa</ListboxItem>
          <ListboxItem key="atras" endContent={<K>Ctrl+Shift+[</K>}>Enviar al fondo</ListboxItem>
        </ListboxSection>
        <ListboxSection>
          <ListboxItem key="bloquear" endContent={<K>Ctrl+Shift+L</K>}>{bloqueado ? 'Desbloquear' : 'Bloquear'}</ListboxItem>
          <ListboxItem key="ocultar" endContent={<K>Ctrl+Shift+H</K>}>{oculto ? 'Mostrar' : 'Ocultar'}</ListboxItem>
          <ListboxItem key="todo" endContent={<K>Ctrl+A</K>}>Seleccionar todo</ListboxItem>
        </ListboxSection>
      </Listbox>
    </div>
  );
}
