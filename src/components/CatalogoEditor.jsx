import { useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Switch, Button } from '@heroui/react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Api } from '../lib/api.js';
import Panel from './Panel.jsx';
import { useToast } from './Toast.jsx';

export default function CatalogoEditor({
  icon, titulo, descripcion, settingsKey, campos, valorInicial, filaVacia
}) {
  const [filas, setFilas] = useState(valorInicial && valorInicial.length ? valorInicial : [{ ...filaVacia }]);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  function campoFila(idx, key, value) {
    setFilas((f) => f.map((fila, i) => (i === idx ? { ...fila, [key]: value } : fila)));
  }

  function agregarFila() {
    setFilas((f) => [...f, { ...filaVacia }]);
  }

  function quitarFila(idx) {
    setFilas((f) => f.filter((_, i) => i !== idx));
  }

  function saltarAlSiguiente(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.target.form || e.target.closest('form');
      if (!form) return;
      const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
      const idx = inputs.indexOf(e.target);
      if (idx >= 0 && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    }
  }

  async function guardar() {
    setGuardando(true);
    try {
      const claveP = campos[0].key;
      const limpio = filas
        .filter((fila) => String(fila[claveP] || '').trim())
        .map((fila) => {
          const out = {};
          for (const c of campos) {
            if (c.tipo === 'switch') out[c.key] = Boolean(fila[c.key]);
            else if (c.tipo === 'number') out[c.key] = parseFloat(fila[c.key]) || 0;
            else out[c.key] = String(fila[c.key] || '').trim().toUpperCase();
          }
          return out;
        });
      await Api.actualizarSettings({ [settingsKey]: JSON.stringify(limpio) });
      setFilas(limpio.length ? limpio : [{ ...filaVacia }]);
      toast.exito(`${titulo}: guardado correctamente.`);
    } catch (err) {
      toast.error(err.message || `No se pudo guardar ${titulo.toLowerCase()}.`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Panel titulo={titulo} icon={icon}>
      {descripcion && <p className="mb-3 text-xs text-ink-500">{descripcion}</p>}
      <Table removeWrapper aria-label={titulo} className="w-full">
        <TableHeader>
          {[
            ...campos.map((c) => (
              <TableColumn key={c.key} className="bg-transparent px-2 text-xs uppercase text-ink-500">{c.label}</TableColumn>
            )),
            <TableColumn key="__acciones" className="bg-transparent" aria-label="Acciones">{''}</TableColumn>
          ]}
        </TableHeader>
        <TableBody emptyContent=" ">
          {filas.map((fila, i) => (
            <TableRow key={i}>
              {[
                ...campos.map((c) => (
                  <TableCell key={c.key} className="px-2 py-1.5">
                    {c.tipo === 'switch' ? (
                      <Switch size="sm" isSelected={Boolean(fila[c.key])} onValueChange={(val) => campoFila(i, c.key, val)} />
                    ) : (
                      <Input
                        type={c.tipo === 'number' ? 'number' : 'text'}
                        step={c.tipo === 'number' ? '0.01' : undefined}
                        size="sm"
                        variant="bordered"
                        placeholder={c.placeholder || ''}
                        value={fila[c.key]}
                        onChange={(e) => campoFila(i, c.key, e.target.value)}
                        onKeyDown={saltarAlSiguiente}
                      />
                    )}
                  </TableCell>
                )),
                <TableCell key="__acciones" className="px-2 py-1.5">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    color="danger"
                    title={`Quitar ${titulo.toLowerCase()}`}
                    aria-label={`Quitar ${titulo.toLowerCase()}`}
                    isDisabled={filas.length <= 1}
                    onPress={() => quitarFila(i)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                  </Button>
                </TableCell>
              ]}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button variant="flat" startContent={<Plus className="h-4 w-4" strokeWidth={2.5} />} onPress={agregarFila}>
          Agregar
        </Button>
        <Button
          color="primary"
          isDisabled={guardando}
          onPress={guardar}
          startContent={guardando ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
        >
          Guardar {titulo.toLowerCase()}
        </Button>
      </div>
    </Panel>
  );
}
