import { Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Tooltip } from '@heroui/react';
import { ArrowLeft, Undo2, Redo2, ChevronDown, Check, Loader2, CloudOff, Printer, Star, Save } from 'lucide-react';
import { useEditor } from '../store.js';
import { TIPOS_FORMATO } from '../modelo.js';

function zoom(detalle) {
  window.dispatchEvent(new CustomEvent('editor:zoom', { detail: detalle }));
}

export default function BarraSuperior({ estadoGuardado, onGuardar, onVolver, onUsar, onProbar }) {
  const plantilla = useEditor((s) => s.plantilla);
  const z = useEditor((s) => s.zoom);
  const puedeDeshacer = useEditor((s) => s.pasado.length > 0);
  const puedeRehacer = useEditor((s) => s.futuro.length > 0);
  const sucio = useEditor((s) => s.sucio);

  return (
    <header className="flex h-12 flex-none items-center gap-2 border-b border-default-100 bg-content1 px-2">
      <Tooltip content="Volver a Formatos" size="sm" delay={300}>
        <Button isIconOnly size="sm" variant="light" aria-label="Volver" onPress={onVolver}><ArrowLeft className="h-4 w-4" /></Button>
      </Tooltip>
      <div className="flex min-w-0 items-center gap-2">
        <input
          className="w-[140px] min-w-0 truncate lg:w-[260px] rounded-md bg-transparent px-2 py-1 text-[13px] font-semibold outline-none hover:bg-default-100 focus:bg-default-100 focus:ring-1 focus:ring-primary"
          aria-label="Nombre del diseño"
          value={plantilla ? plantilla.nombre : ''}
          onChange={(e) => useEditor.getState().setPlantilla({ nombre: e.target.value, nombreSucio: true })}
          onBlur={() => onGuardar({ soloNombre: true })}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
        {plantilla && <Chip size="sm" variant="flat" className="h-5 text-[10px]">{TIPOS_FORMATO[plantilla.tipo]}</Chip>}
        {plantilla && plantilla.activo && (
          <Chip size="sm" color="success" variant="flat" startContent={<Star className="h-3 w-3" />} className="hidden h-5 text-[10px] xl:flex">En uso al imprimir</Chip>
        )}
      </div>

      <div className="ml-2 flex items-center gap-0.5">
        <Tooltip content="Deshacer (Ctrl+Z)" size="sm" delay={300}>
          <Button isIconOnly size="sm" variant="light" aria-label="Deshacer" isDisabled={!puedeDeshacer} onPress={() => useEditor.getState().deshacer()}><Undo2 className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="Rehacer (Ctrl+Shift+Z)" size="sm" delay={300}>
          <Button isIconOnly size="sm" variant="light" aria-label="Rehacer" isDisabled={!puedeRehacer} onPress={() => useEditor.getState().rehacer()}><Redo2 className="h-4 w-4" /></Button>
        </Tooltip>
      </div>

      <div className="flex-1" />

      <span className="hidden min-w-[132px] items-center justify-end gap-1.5 whitespace-nowrap text-[11px] text-default-400 lg:flex" aria-live="polite">
        {estadoGuardado === 'guardando' && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>}
        {estadoGuardado === 'error' && <><CloudOff className="h-3.5 w-3.5 text-danger" /> <span className="text-danger">No se pudo guardar</span></>}
        {estadoGuardado !== 'guardando' && estadoGuardado !== 'error' && (sucio ? 'Cambios sin guardar' : <><Check className="h-3.5 w-3.5 text-success" /> Guardado</>)}
      </span>

      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button size="sm" variant="light" className="min-w-[64px] flex-none px-2 text-[12px]" endContent={<ChevronDown className="h-3 w-3" />}>{Math.round(z * 100)}%</Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Zoom"
          onAction={(k) => {
            if (k === 'ajustar') window.dispatchEvent(new Event('editor:ajustar'));
            else if (k === 'mas') zoom({ factor: 1.25 });
            else if (k === 'menos') zoom({ factor: 0.8 });
            else zoom({ zoom: Number(k) });
          }}
        >
          <DropdownSection showDivider>
            <DropdownItem key="mas" endContent={<span className="text-[11px] text-default-400">Ctrl +</span>}>Acercar</DropdownItem>
            <DropdownItem key="menos" endContent={<span className="text-[11px] text-default-400">Ctrl −</span>}>Alejar</DropdownItem>
            <DropdownItem key="ajustar" endContent={<span className="text-[11px] text-default-400">Shift 1</span>}>Ajustar a la pantalla</DropdownItem>
          </DropdownSection>
          <DropdownSection>
            {[0.5, 1, 1.5, 2, 4].map((v) => <DropdownItem key={String(v)}>{v * 100}%</DropdownItem>)}
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      <Tooltip content="Abrir una hoja de prueba con datos de ejemplo para imprimir" size="sm" delay={300}>
        <Button size="sm" variant="flat" startContent={<Printer className="h-3.5 w-3.5" />} onPress={onProbar} aria-label="Probar impresión"><span className="hidden xl:inline">Probar impresión</span></Button>
      </Tooltip>
      {plantilla && !plantilla.activo && (
        <Button size="sm" variant="flat" color="success" startContent={<Star className="h-3.5 w-3.5" />} onPress={onUsar} aria-label="Usar para imprimir"><span className="hidden lg:inline">Usar para imprimir</span></Button>
      )}
      <Button size="sm" color="primary" startContent={<Save className="h-3.5 w-3.5" />} onPress={() => onGuardar({})}>Guardar</Button>
    </header>
  );
}
