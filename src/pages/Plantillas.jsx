import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, CardBody, CardFooter, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Modal, ModalBody,
  ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Tab, Tabs, Spinner
} from '@heroui/react';
import { Plus, PenTool, MoreVertical, Copy, Trash2, Star, Pencil, Printer, Trees, Truck, FileText, LayoutTemplate, TriangleAlert, RefreshCw } from 'lucide-react';
import PageLayout from '../components/PageLayout.jsx';
import Panel from '../components/Panel.jsx';
import { useToast } from '../components/Toast.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import useRealtimeLista from '../hooks/useRealtimeLista.js';
import { calcularLayout } from '../editor/layout.js';
import { Api } from '../lib/api.js';
import DocumentoRender from '../editor/render/DocumentoRender.jsx';
import { normalizarDoc, TIPOS_FORMATO, esDocEditor } from '../editor/modelo.js';
import { datosEjemplo } from '../editor/campos.js';
import { PUNTOS_DE_PARTIDA } from '../editor/plantillasBase.js';

const ORIGINAL = 'original';

// Miniatura de la hoja completa: se escala para caber en ancho y alto.
function Miniatura({ doc, tipo, settings }) {
  const [el, setEl] = useState(null);
  const [zoom, setZoom] = useState(0.3);
  const datos = useMemo(() => datosEjemplo(tipo, settings), [tipo, settings]);
  const alto = calcularLayout(doc, datos).altoPagina;
  useEffect(() => {
    if (!el) return undefined;
    const calcular = () => setZoom(Math.min(1, (el.clientWidth - 16) / doc.pagina.ancho, (el.clientHeight - 20) / alto));
    calcular();
    const ro = new ResizeObserver(calcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, doc.pagina.ancho, alto]);
  return (
    <div ref={setEl} className="flex h-60 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
      <div style={{ zoom }} className="pointer-events-none shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
        <DocumentoRender doc={doc} datos={datos} tipo={tipo} modo="miniatura" />
      </div>
    </div>
  );
}

function fechaCorta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Plantillas() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirmar = useConfirm();
  const [lista, setLista] = useState(null);
  const [settings, setSettings] = useState({});
  const [filtro, setFiltro] = useState('todos');
  const [nuevo, setNuevo] = useState(null);
  const [renombrar, setRenombrar] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([Api.listarPlantillas(), Api.obtenerSettings().catch(() => ({}))]);
      setLista(l.map((p) => ({ ...p, compatible: esDocEditor(p.project_data), doc: normalizarDoc(p.project_data) })));
      setSettings(s || {});
    } catch (e) {
      toast.error(e.message || 'No se pudieron cargar los formatos');
      setLista([]);
    }
  }, [toast]);

  useEffect(() => { cargar(); }, [cargar]);
  useRealtimeLista('plantillas_formato', cargar);

  const enUso = (tipo) => (lista || []).find((p) => p.tipo === tipo && p.activo && p.compatible);

  const usar = async (id, tipo) => {
    try {
      await Api.usarPlantilla(id, tipo);
      toast.exito(id ? 'Diseño en uso actualizado' : 'Se usará el diseño 2026');
      cargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const crear = async () => {
    if (!nuevo.nombre.trim()) { toast.error('Ponle un nombre al diseño'); return; }
    setTrabajando(true);
    try {
      let projectData;
      if (nuevo.origen.startsWith('copia:')) {
        const base = lista.find((p) => String(p.id) === nuevo.origen.slice(6));
        projectData = base ? base.project_data : PUNTOS_DE_PARTIDA.blanco.crear();
      } else {
        projectData = PUNTOS_DE_PARTIDA[nuevo.origen].crear();
      }
      const p = await Api.crearPlantilla({ nombre: nuevo.nombre, tipo: nuevo.tipo, project_data: projectData });
      setNuevo(null);
      navigate(`/formatos/${p.id}/editor`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTrabajando(false);
    }
  };

  const duplicar = async (p) => {
    try {
      await Api.duplicarPlantilla(p.id, `${p.nombre} (copia)`);
      toast.exito('Diseño duplicado');
      cargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const eliminar = async (p) => {
    const ok = await confirmar({
      titulo: `¿Eliminar «${p.nombre}»?`,
      texto: p.activo
        ? 'Es el diseño que se usa al imprimir. Al eliminarlo se volverá a usar el diseño 2026. Esta acción no se puede deshacer.'
        : 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar'
    });
    if (!ok) return;
    try {
      await Api.eliminarPlantilla(p.id);
      toast.exito('Diseño eliminado');
      cargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // Diseños del editor anterior (GrapesJS): no se pueden abrir aquí. Se
  // ofrece rehacerlos a partir del formato oficial 2026 del mismo tipo.
  const convertir = async (p) => {
    const ok = await confirmar({
      titulo: `¿Convertir «${p.nombre}» al editor nuevo?`,
      texto: 'Este diseño se hizo con el editor anterior y no se puede abrir aquí. Se reemplazará por la recreación editable del formato 2026, conservando el nombre.',
      textoConfirmar: 'Convertir',
      peligro: false
    });
    if (!ok) return;
    try {
      const base = p.tipo === 'flete' ? PUNTOS_DE_PARTIDA.flete2026 : PUNTOS_DE_PARTIDA.extraccion2026;
      await Api.actualizarPlantilla(p.id, { project_data: base.crear() });
      toast.exito('Diseño convertido');
      cargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const guardarNombre = async () => {
    try {
      await Api.actualizarPlantilla(renombrar.id, { nombre: renombrar.nombre });
      setRenombrar(null);
      cargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const visibles = (lista || []).filter((p) => filtro === 'todos' || p.tipo === filtro);

  const selectorUso = (tipo, Icono) => {
    const opciones = (lista || []).filter((p) => p.tipo === tipo && p.compatible);
    const actual = enUso(tipo);
    return (
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-800">
          <Icono className="h-4 w-4 text-brand-600" /> Al imprimir {tipo === 'flete' ? 'Fletes' : 'Extracción'}
        </span>
        <Select
          aria-label={`Diseño en uso para ${TIPOS_FORMATO[tipo]}`}
          variant="bordered"
          selectedKeys={[actual ? String(actual.id) : ORIGINAL]}
          disallowEmptySelection
          onSelectionChange={(k) => {
            const v = [...k][0];
            if (!v || v === (actual ? String(actual.id) : ORIGINAL)) return;
            usar(v === ORIGINAL ? null : Number(v), tipo);
          }}
        >
          {[
            <SelectItem key={ORIGINAL} textValue="2026">2026</SelectItem>,
            ...opciones.map((p) => <SelectItem key={String(p.id)} textValue={p.nombre}>{p.nombre}</SelectItem>)
          ]}
        </Select>
      </div>
    );
  };

  return (
    <PageLayout
      title="Formatos"
      action={<Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={() => setNuevo({ nombre: '', tipo: 'extraccion', origen: 'extraccion2026' })}>Nuevo formato</Button>}
    >
      <Panel titulo="Diseño en uso" icon={Star}>
        {lista == null ? <Spinner size="sm" /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {selectorUso('extraccion', Trees)}
            {selectorUso('flete', Truck)}
          </div>
        )}
      </Panel>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Tabs aria-label="Filtrar por tipo" selectedKey={filtro} onSelectionChange={(k) => setFiltro(String(k))} size="sm">
          <Tab key="todos" title="Todos" />
          <Tab key="extraccion" title="Extracción" />
          <Tab key="flete" title="Fletes" />
        </Tabs>
      </div>

      {lista == null && <div className="flex justify-center p-10"><Spinner label="Cargando formatos…" /></div>}

      {lista != null && visibles.length === 0 && (
        <Card shadow="none" className="border border-dashed border-surface-border">
          <CardBody className="flex flex-col items-center gap-3 p-10 text-center">
            <LayoutTemplate className="h-10 w-10 text-ink-300" />
            <p className="m-0 text-[15px] font-semibold text-ink-800">Aún no hay diseños</p>
            <Button color="primary" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={() => setNuevo({ nombre: '', tipo: filtro === 'flete' ? 'flete' : 'extraccion', origen: filtro === 'flete' ? 'flete2026' : 'extraccion2026' })}>Crear el primero</Button>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((p) => (
          <Card key={p.id} shadow="none" className="border border-surface-border">
            <CardBody className="p-3">
              {p.compatible ? (
                <button type="button" className="block w-full text-left" onClick={() => navigate(`/formatos/${p.id}/editor`)} aria-label={`Abrir ${p.nombre}`}>
                  <Miniatura doc={p.doc} tipo={p.tipo} settings={settings} />
                </button>
              ) : (
                <div className="flex h-60 flex-col items-center justify-center gap-2 rounded-lg bg-warning-bg p-4 text-center">
                  <TriangleAlert className="h-8 w-8 text-warning" />
                  <p className="m-0 text-[13px] font-semibold text-ink-800">Hecho con el editor anterior</p>
                  <p className="m-0 text-[12px] text-ink-500">No se puede abrir ni imprimir con el editor nuevo; al imprimir se usa el 2026.</p>
                  <Button size="sm" color="warning" variant="flat" startContent={<RefreshCw className="h-3.5 w-3.5" />} onPress={() => convertir(p)}>Convertir</Button>
                </div>
              )}
            </CardBody>
            <CardFooter className="flex items-start gap-2 pt-0">
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[14px] font-semibold text-ink-900">{p.nombre}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Chip size="sm" variant="flat">{TIPOS_FORMATO[p.tipo]}</Chip>
                  {p.activo && p.compatible && <Chip size="sm" color="success" variant="flat" startContent={<Star className="h-3 w-3" />}>En uso</Chip>}
                  <span className="text-[11px] text-ink-400">{fechaCorta(p.updated_at)}</span>
                </div>
              </div>
              <Button size="sm" color="primary" variant="flat" isDisabled={!p.compatible} startContent={<PenTool className="h-3.5 w-3.5" />} onPress={() => navigate(`/formatos/${p.id}/editor`)}>Editar</Button>
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light" aria-label="Más acciones"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Acciones del diseño"
                  disabledKeys={!p.compatible ? ['usar', 'duplicar', 'probar'] : p.activo ? ['usar'] : []}
                  onAction={(k) => {
                    if (k === 'usar') usar(p.id, p.tipo);
                    if (k === 'renombrar') setRenombrar({ id: p.id, nombre: p.nombre });
                    if (k === 'duplicar') duplicar(p);
                    if (k === 'probar') window.open(`/formatos/${p.id}/prueba`, '_blank', 'noopener');
                    if (k === 'eliminar') eliminar(p);
                  }}
                >
                  <DropdownItem key="usar" startContent={<Star className="h-4 w-4" />}>Usar para imprimir</DropdownItem>
                  <DropdownItem key="renombrar" startContent={<Pencil className="h-4 w-4" />}>Renombrar</DropdownItem>
                  <DropdownItem key="duplicar" startContent={<Copy className="h-4 w-4" />}>Duplicar</DropdownItem>
                  <DropdownItem key="probar" startContent={<Printer className="h-4 w-4" />}>Probar impresión</DropdownItem>
                  <DropdownItem key="eliminar" className="text-danger" color="danger" startContent={<Trash2 className="h-4 w-4" />}>Eliminar</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Modal isOpen={Boolean(nuevo)} onOpenChange={(o) => { if (!o) setNuevo(null); }} placement="center" size="lg">
        <ModalContent>
          {nuevo && (
            <>
              <ModalHeader>Nuevo formato</ModalHeader>
              <ModalBody className="gap-4">
                <Input
                  autoFocus
                  label="Nombre"
                  placeholder="Ej. Extracción 2027"
                  value={nuevo.nombre}
                  onValueChange={(v) => setNuevo({ ...nuevo, nombre: v })}
                  onKeyDown={(e) => { if (e.key === 'Enter') crear(); }}
                />
                <Tabs
                  aria-label="Tipo"
                  fullWidth
                  selectedKey={nuevo.tipo}
                  onSelectionChange={(k) => setNuevo({ ...nuevo, tipo: String(k), origen: String(k) === 'flete' ? 'flete2026' : 'extraccion2026' })}
                >
                  <Tab key="extraccion" title={<span className="flex items-center gap-2"><Trees className="h-4 w-4" />Extracción</span>} />
                  <Tab key="flete" title={<span className="flex items-center gap-2"><Truck className="h-4 w-4" />Flete</span>} />
                </Tabs>
                <Select
                  label="Empezar desde"
                  selectedKeys={[nuevo.origen]}
                  disallowEmptySelection
                  onSelectionChange={(k) => setNuevo({ ...nuevo, origen: String([...k][0]) })}
                >
                  {[
                    <SelectItem key={nuevo.tipo === 'flete' ? 'flete2026' : 'extraccion2026'} textValue="2026" startContent={<FileText className="h-4 w-4" />}>2026</SelectItem>,
                    ...(nuevo.tipo === 'flete'
                      ? [<SelectItem key="fleteModerno" textValue="Flete moderno" startContent={<LayoutTemplate className="h-4 w-4" />}>Flete moderno</SelectItem>]
                      : []),
                    <SelectItem key="blanco" textValue="En blanco" startContent={<LayoutTemplate className="h-4 w-4" />}>En blanco</SelectItem>,
                    ...(lista || []).filter((p) => p.tipo === nuevo.tipo && p.compatible).map((p) => (
                      <SelectItem key={`copia:${p.id}`} textValue={`Copia de ${p.nombre}`} startContent={<Copy className="h-4 w-4" />}>Copia de «{p.nombre}»</SelectItem>
                    ))
                  ]}
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => setNuevo(null)}>Cancelar</Button>
                <Button color="primary" isLoading={trabajando} onPress={crear}>Crear y abrir editor</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={Boolean(renombrar)} onOpenChange={(o) => { if (!o) setRenombrar(null); }} placement="center">
        <ModalContent>
          {renombrar && (
            <>
              <ModalHeader>Renombrar diseño</ModalHeader>
              <ModalBody>
                <Input autoFocus label="Nombre" value={renombrar.nombre} onValueChange={(v) => setRenombrar({ ...renombrar, nombre: v })} onKeyDown={(e) => { if (e.key === 'Enter') guardarNombre(); }} />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => setRenombrar(null)}>Cancelar</Button>
                <Button color="primary" onPress={guardarNombre}>Guardar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </PageLayout>
  );
}
