import { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Switch } from '@heroui/react';
import { Loader2, Trash2 } from 'lucide-react';

// Ventana para editar un registro de Ajustes (una fila de catálogo o un
// dato general). campos: [{ key, label, tipo: 'text'|'number'|'pct'|'switch',
// placeholder, prefijo, ayuda }]. onGuardar(valores) puede lanzar un error
// con mensaje para mostrarlo dentro de la ventana sin cerrarla.
export default function DialogoEditar({
  abierto, titulo, subtitulo, campos, valores, onCerrar, onGuardar, onEliminar, textoGuardar = 'Guardar'
}) {
  const [datos, setDatos] = useState(valores || {});
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  // Eliminar pide un segundo clic para confirmar, sin abrir otra ventana.
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  // Solo al abrir: así un re-render del padre no borra lo que se escribe.
  useEffect(() => {
    if (abierto) {
      setDatos(valores || {});
      setError('');
      setOcupado(false);
      setConfirmarEliminar(false);
    }
  }, [abierto]);

  function campo(key, value) {
    setDatos((d) => ({ ...d, [key]: value }));
    setError('');
  }

  async function enviar(e) {
    e.preventDefault();
    setOcupado(true);
    try {
      await onGuardar(datos);
      onCerrar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar.');
      setOcupado(false);
    }
  }

  async function eliminar() {
    if (!confirmarEliminar) { setConfirmarEliminar(true); return; }
    setOcupado(true);
    try {
      await onEliminar();
      onCerrar();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar.');
      setOcupado(false);
    }
  }

  return (
    <Modal
      isOpen={abierto}
      onOpenChange={(a) => { if (!a && !ocupado) onCerrar(); }}
      placement="center"
      backdrop="opaque"
      size="md"
      classNames={{ base: 'rounded-panel' }}
    >
      <ModalContent>
        <form onSubmit={enviar}>
          <ModalHeader className="flex-col gap-0.5 px-6 pt-6">
            <span className="text-[17px] font-semibold text-ink-900">{titulo}</span>
            {subtitulo && <span className="text-[13px] font-normal text-ink-500">{subtitulo}</span>}
          </ModalHeader>
          <ModalBody className="gap-4 px-6">
            {campos.map((c, i) => (
              c.tipo === 'switch' ? (
                <label key={c.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-surface-border px-4 py-3">
                  <span>
                    <span className="block text-[14px] font-medium text-ink-900">{c.label}</span>
                    {c.ayuda && <span className="block text-[12px] text-ink-500">{c.ayuda}</span>}
                  </span>
                  <Switch size="sm" color="primary" isSelected={Boolean(datos[c.key])} onValueChange={(v) => campo(c.key, v)} aria-label={c.label} />
                </label>
              ) : (
                <div key={c.key} className="flex flex-col gap-1.5">
                  <label className="form-label" htmlFor={`dlg-${c.key}`}>{c.label}</label>
                  <div className="relative">
                    {c.prefijo && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-400">{c.prefijo}</span>}
                    <input
                      id={`dlg-${c.key}`}
                      className={`form-input w-full ${c.prefijo ? 'pl-7' : ''} ${c.tipo === 'pct' ? 'pr-8' : ''}`}
                      type={c.tipo === 'text' ? 'text' : 'number'}
                      step={c.tipo === 'text' ? undefined : (c.step || '0.01')}
                      min={c.tipo === 'text' ? undefined : '0'}
                      placeholder={c.placeholder || ''}
                      autoFocus={i === 0}
                      value={datos[c.key] ?? ''}
                      onChange={(e) => campo(c.key, e.target.value)}
                    />
                    {c.tipo === 'pct' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-400">%</span>}
                  </div>
                  {c.ayuda && <span className="text-[12px] text-ink-500">{c.ayuda}</span>}
                </div>
              )
            ))}
            {error && <p className="m-0 rounded-lg bg-danger-bg px-3 py-2 text-[13px] text-danger">{error}</p>}
          </ModalBody>
          <ModalFooter className="px-6 pb-6">
            {onEliminar && (
              <Button
                variant={confirmarEliminar ? 'solid' : 'light'}
                color="danger"
                className="mr-auto"
                isDisabled={ocupado}
                onPress={eliminar}
                startContent={<Trash2 className="h-4 w-4" strokeWidth={2.25} />}
              >
                {confirmarEliminar ? '¿Seguro? Eliminar' : 'Eliminar'}
              </Button>
            )}
            <Button variant="flat" isDisabled={ocupado} onPress={onCerrar}>Cancelar</Button>
            <Button type="submit" color="primary" isDisabled={ocupado}
              startContent={ocupado ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : null}>
              {textoGuardar}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
