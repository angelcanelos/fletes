import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Spinner, HeroUIProvider } from '@heroui/react';
import { FileWarning } from 'lucide-react';
import { Api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { useEditor } from '../editor/store.js';
import { normalizarDoc, esDocEditor } from '../editor/modelo.js';
import { datosEjemplo } from '../editor/campos.js';
import Lienzo from '../editor/ui/Lienzo.jsx';
import PanelIzquierdo, { useSubirImagen } from '../editor/ui/PanelIzquierdo.jsx';
import PanelDiseno from '../editor/ui/PanelDiseno.jsx';
import BarraSuperior from '../editor/ui/BarraSuperior.jsx';
import BarraHerramientas from '../editor/ui/BarraHerramientas.jsx';
import '../editor/editor.css';

// Editor de Formatos (tipo Figma, en modo oscuro). Pantalla completa, fuera
// del shell con sidebar, igual que las pantallas de impresión.

const TECLAS_HERRAMIENTA = { v: 'mover', h: 'mano', f: 'contenedor', r: 'rect', o: 'elipse', l: 'linea', p: 'poligono', t: 'texto' };

function esCampoDeTexto(t) {
  return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}

// Dentro del editor HeroUI va sin animaciones ni efecto "ripple": en una
// herramienta de diseño con decenas de botones y menús, las transiciones
// al pasar el mouse o abrir un select se perciben como parpadeo.
export default function EditorFormato() {
  return (
    <HeroUIProvider disableAnimation disableRipple>
      <EditorFormatoContenido />
    </HeroUIProvider>
  );
}

function EditorFormatoContenido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const doc = useEditor((s) => s.doc);
  const plantilla = useEditor((s) => s.plantilla);
  const revision = useEditor((s) => s.revision);
  const [settings, setSettings] = useState({});
  const [error, setError] = useState('');
  const [estadoGuardado, setEstadoGuardado] = useState('ok');
  const guardandoRef = useRef(false);
  const subirImagen = useSubirImagen();

  // El editor es oscuro: se marca <html> para que también los menús y
  // ventanas flotantes de HeroUI (que se montan fuera del editor) salgan
  // en tema oscuro. Al salir se quita y el resto de la app sigue en claro.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('dark', 'editor-activo');
    return () => html.classList.remove('dark', 'editor-activo');
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [p, s] = await Promise.all([Api.obtenerPlantilla(id), Api.obtenerSettings().catch(() => ({}))]);
        if (!vivo) return;
        if (!esDocEditor(p.project_data) && p.project_data && Object.keys(p.project_data).length) {
          setError('Este diseño se hizo con el editor anterior. Conviértelo desde la lista de Formatos para poder editarlo.');
          return;
        }
        setSettings(s || {});
        useEditor.getState().cargar({ id: p.id, nombre: p.nombre, tipo: p.tipo, activo: p.activo }, normalizarDoc(p.project_data));
        document.title = `${p.nombre} · Editor de formatos`;
      } catch (e) {
        if (vivo) setError(e.message || 'No se pudo abrir el diseño');
      }
    })();
    return () => { vivo = false; useEditor.getState().cargar(null, null); };
  }, [id]);

  const datos = useMemo(() => (plantilla ? datosEjemplo(plantilla.tipo, settings) : null), [plantilla && plantilla.tipo, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = useCallback(async ({ soloNombre = false, silencioso = false } = {}) => {
    const st = useEditor.getState();
    if (!st.plantilla || !st.doc || guardandoRef.current) return false;
    if (soloNombre && !st.plantilla.nombreSucio) return true;
    if (!st.plantilla.nombre.trim()) { toast.error('El diseño necesita un nombre'); return false; }
    guardandoRef.current = true;
    // El indicador "Guardando…" solo aparece si tarda: con el autoguardado
    // cada pocos segundos, mostrarlo siempre hacía parpadear la barra.
    const aviso = setTimeout(() => setEstadoGuardado('guardando'), 600);
    const revisionInicio = st.revision;
    try {
      const cambios = { nombre: st.plantilla.nombre };
      if (!soloNombre) cambios.project_data = st.doc;
      await Api.actualizarPlantilla(st.plantilla.id, cambios);
      st.setPlantilla({ nombreSucio: false });
      if (!soloNombre && useEditor.getState().revision === revisionInicio) st.marcarGuardado();
      setEstadoGuardado('ok');
      if (!silencioso && !soloNombre) toast.exito('Diseño guardado');
      return true;
    } catch (e) {
      setEstadoGuardado('error');
      toast.error(e.message || 'No se pudo guardar el diseño');
      return false;
    } finally {
      clearTimeout(aviso);
      guardandoRef.current = false;
    }
  }, [toast]);

  // Autoguardado: 2.5 s después del último cambio.
  useEffect(() => {
    if (!revision) return undefined;
    const t = setTimeout(() => { if (useEditor.getState().sucio) guardar({ silencioso: true }); }, 2500);
    return () => clearTimeout(t);
  }, [revision, guardar]);

  useEffect(() => {
    const aviso = (e) => {
      if (useEditor.getState().sucio) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, []);

  // ---------- Atajos de teclado ----------
  useEffect(() => {
    const onKey = (e) => {
      const st = useEditor.getState();
      if (!st.doc || esCampoDeTexto(e.target)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (ctrl && k === 's') { e.preventDefault(); guardar({}); return; }
      if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) st.rehacer(); else st.deshacer(); return; }
      if (ctrl && k === 'y') { e.preventDefault(); st.rehacer(); return; }
      if (st.vistaPrevia) { if (k === 'escape') st.setVista({ vistaPrevia: false }); return; }
      if (ctrl && k === 'c') { e.preventDefault(); st.copiar(); return; }
      if (ctrl && k === 'x') { e.preventDefault(); st.copiar(); st.eliminarSeleccion(); return; }
      if (ctrl && k === 'v') { e.preventDefault(); st.pegar(); return; }
      if (ctrl && k === 'd') { e.preventDefault(); st.duplicar(); return; }
      if (ctrl && k === 'a') { e.preventDefault(); st.setSeleccion(st.doc.elementos.filter((x) => !x.padreId && !x.bloqueado && !x.oculto).map((x) => x.id)); return; }
      if (ctrl && k === 'g') { e.preventDefault(); if (e.shiftKey) st.desagrupar(); else st.agrupar(); return; }
      if (ctrl && (e.key === ']' || e.key === '}')) { e.preventDefault(); st.ordenar(e.shiftKey ? 'frente' : 'subir'); return; }
      if (ctrl && (e.key === '[' || e.key === '{')) { e.preventDefault(); st.ordenar(e.shiftKey ? 'atras' : 'bajar'); return; }
      if (ctrl && e.shiftKey && k === 'l') { e.preventDefault(); const b = st.seleccion.some((i) => (st.doc.elementos.find((x) => x.id === i) || {}).bloqueado); st.actualizar(st.seleccion, (x) => { x.bloqueado = !b; }); return; }
      if (ctrl && e.shiftKey && k === 'h') { e.preventDefault(); const o = st.seleccion.some((i) => (st.doc.elementos.find((x) => x.id === i) || {}).oculto); st.actualizar(st.seleccion, (x) => { x.oculto = !o; }); return; }
      if (ctrl && (e.key === '+' || e.key === '=')) { e.preventDefault(); window.dispatchEvent(new CustomEvent('editor:zoom', { detail: { factor: 1.25 } })); return; }
      if (ctrl && (e.key === '-' || e.key === '_')) { e.preventDefault(); window.dispatchEvent(new CustomEvent('editor:zoom', { detail: { factor: 0.8 } })); return; }
      if (ctrl) return;
      if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); window.dispatchEvent(new Event('editor:ajustar')); return; }
      if (e.shiftKey && e.code === 'Digit0') { e.preventDefault(); window.dispatchEvent(new CustomEvent('editor:zoom', { detail: { zoom: 1 } })); return; }
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); st.eliminarSeleccion(); return; }
      if (k === 'escape') {
        if (st.herramienta !== 'mover') st.setHerramienta('mover');
        else if (st.seleccion.length) {
          // Esc sube un nivel (al padre) como en Figma; en la raíz, deselecciona.
          const el = st.doc.elementos.find((x) => x.id === st.seleccion[0]);
          st.setSeleccion(el && el.padreId ? [el.padreId] : []);
        }
        return;
      }
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const paso = e.shiftKey ? 10 : 1;
        st.nudge(k === 'arrowleft' ? -paso : k === 'arrowright' ? paso : 0, k === 'arrowup' ? -paso : k === 'arrowdown' ? paso : 0);
        return;
      }
      if (k === 'enter' && st.seleccion.length === 1) {
        const el = st.doc.elementos.find((x) => x.id === st.seleccion[0]);
        if (el && el.tipo === 'texto') { e.preventDefault(); st.editarTexto(el.id); return; }
        const hijo = el && st.doc.elementos.find((x) => x.padreId === el.id);
        if (hijo) { e.preventDefault(); st.setSeleccion([hijo.id]); }
        return;
      }
      if (e.shiftKey && k === 'p') { st.setHerramienta('estrella'); return; }
      if (k === 'i' && !e.shiftKey) { const b = document.getElementById('editor-boton-imagen'); if (b) b.click(); return; }
      if (!e.shiftKey && !e.altKey && TECLAS_HERRAMIENTA[k]) st.setHerramienta(TECLAS_HERRAMIENTA[k]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guardar]);

  const volver = async () => {
    if (useEditor.getState().sucio) await guardar({ silencioso: true });
    navigate('/formatos');
  };

  const usar = async () => {
    const st = useEditor.getState();
    try {
      await guardar({ silencioso: true });
      await Api.usarPlantilla(st.plantilla.id, st.plantilla.tipo);
      st.setPlantilla({ activo: true });
      toast.exito(`«${st.plantilla.nombre}» se usará al imprimir ${st.plantilla.tipo === 'flete' ? 'fletes' : 'extracciones'}`);
    } catch (e) {
      toast.error(e.message || 'No se pudo activar el diseño');
    }
  };

  const probar = async () => {
    await guardar({ silencioso: true });
    window.open(`/formatos/${id}/prueba`, '_blank', 'noopener');
  };

  if (error) {
    return (
      <div className="dark flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <FileWarning className="h-10 w-10 text-danger" />
        <p>{error}</p>
        <Button variant="flat" onPress={() => navigate('/formatos')}>Volver a Formatos</Button>
      </div>
    );
  }

  if (!doc || !plantilla || !datos) {
    return (
      <div className="dark flex h-screen items-center justify-center bg-background text-foreground">
        <Spinner label="Abriendo diseño…" />
      </div>
    );
  }

  return (
    <div className="editor-raiz dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <BarraSuperior estadoGuardado={estadoGuardado} onGuardar={guardar} onVolver={volver} onUsar={usar} onProbar={probar} />
      <div className="flex min-h-0 flex-1">
        <PanelIzquierdo tipo={plantilla.tipo} datos={datos} />
        <div className="relative flex min-w-0 flex-1">
          <Lienzo datos={datos} tipo={plantilla.tipo} onSubirImagen={subirImagen} />
          <BarraHerramientas tipo={plantilla.tipo} datos={datos} />
        </div>
        <PanelDiseno tipo={plantilla.tipo} />
      </div>
    </div>
  );
}
