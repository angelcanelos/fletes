import { useEffect, useMemo, useState } from 'react';
import { Switch, Button, Tooltip } from '@heroui/react';
import { Plus, Search, X, Pencil, Trash2 } from 'lucide-react';
import { Api } from '../lib/api.js';
import { formatoMoneda } from '../lib/calc.js';
import { normalizar } from '../lib/texto.js';
import { useToast } from './Toast.jsx';
import DialogoEditar from './DialogoEditar.jsx';
import { useConfirm } from './ConfirmDialog.jsx';

// Deja una fila con la forma que se guarda en settings (texto en
// mayúsculas, números y switches como tales).
function limpiarFila(fila, campos) {
  const out = { ...fila };
  for (const c of campos) {
    if (c.tipo === 'switch') out[c.key] = Boolean(fila[c.key]);
    else if (c.tipo === 'number') out[c.key] = parseFloat(fila[c.key]) || 0;
    else out[c.key] = String(fila[c.key] || '').trim().toUpperCase();
  }
  return out;
}

// Catálogo de Ajustes (lista guardada como JSON en settings). Cada dato se
// ve como texto; al hacer clic en uno se edita solo ese dato en una ventana
// y se guarda en ese momento. Los switches se guardan solos al cambiarlos.
export default function CatalogoEditor({
  titulo, singular, settingsKey, campos, valorInicial, filaVacia, onEstado
}) {
  const claveP = campos[0].key;
  const [filas, setFilas] = useState(() => (valorInicial || []).filter((f) => String(f[claveP] || '').trim()));
  // null = cerrado; { indice: -1 } = agregar (todos los campos);
  // { indice: n, key } = editar solo ese campo de esa fila.
  const [editando, setEditando] = useState(null);
  const [q, setQ] = useState('');
  const toast = useToast();
  const confirmar = useConfirm();

  const camposTexto = campos.filter((c) => c.tipo !== 'switch');
  const switches = campos.filter((c) => c.tipo === 'switch');

  useEffect(() => {
    if (onEstado) onEstado({ total: filas.length });
  }, [filas.length]);

  const visibles = useMemo(() => {
    const todas = filas.map((fila, i) => ({ fila, i }));
    if (!q.trim()) return todas;
    const nq = normalizar(q);
    return todas.filter(({ fila }) => camposTexto.some((c) => normalizar(String(fila[c.key] ?? '')).includes(nq)));
  }, [filas, q]);

  // Guarda la lista completa; si falla, la pantalla vuelve a como estaba.
  async function persistir(nueva, mensaje) {
    const anterior = filas;
    setFilas(nueva);
    try {
      await Api.actualizarSettings({ [settingsKey]: JSON.stringify(nueva) });
      if (mensaje) toast.exito(mensaje);
    } catch (err) {
      setFilas(anterior);
      throw new Error(err.message || `No se pudo guardar ${titulo.toLowerCase()}.`);
    }
  }

  async function guardarFila(valores) {
    const base = editando.indice >= 0 ? filas[editando.indice] : {};
    const fila = limpiarFila({ ...base, ...valores }, campos);
    const nombre = fila[claveP];
    if (!nombre) throw new Error(`Falta escribir ${campos[0].label.toLowerCase()}.`);
    const idx = editando.indice;
    if (filas.some((f, i) => i !== idx && f[claveP] === nombre)) {
      throw new Error(`Ya existe ${singular === 'grúa' ? 'una' : 'un'} ${singular} llamad${singular === 'grúa' ? 'a' : 'o'} ${nombre}.`);
    }
    const nueva = idx < 0 ? [...filas, fila] : filas.map((f, i) => (i === idx ? fila : f));
    await persistir(nueva, idx < 0 ? `Se agregó ${nombre}.` : `Se guardó ${nombre}.`);
  }

  async function eliminarFila(idx) {
    const nombre = filas[idx][claveP];
    const ok = await confirmar({
      titulo: `¿Eliminar ${nombre}?`,
      texto: `Se quitará del catálogo de ${titulo.toLowerCase()}. Los documentos ya guardados no cambian.`,
      textoConfirmar: 'Eliminar'
    });
    if (!ok) return;
    try {
      await persistir(filas.filter((_, i) => i !== idx), `Se eliminó ${nombre}.`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function cambiarSwitch(idx, key, valor) {
    try {
      await persistir(filas.map((f, i) => (i === idx ? { ...f, [key]: valor } : f)));
    } catch (err) {
      toast.error(err.message);
    }
  }

  function valorTexto(fila, c) {
    if (c.tipo === 'number') return `${c.prefijo || ''}${formatoMoneda(fila[c.key])}`;
    return fila[c.key] || '—';
  }

  const plantilla = [
    ...camposTexto.map((c) => (c.tipo === 'number' ? 'minmax(100px,0.6fr)' : 'minmax(140px,1.4fr)')),
    ...switches.map(() => '108px'),
    '36px'
  ].join(' ');

  const filaEditada = editando && editando.indice >= 0 ? filas[editando.indice] : null;
  const campoEditado = filaEditada ? campos.find((c) => c.key === editando.key) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-surface-border px-5 py-3.5">
        <div className="text-[13px] text-ink-500">
          <span className="font-semibold text-ink-900">{filas.length}</span> {filas.length === 1 ? singular : titulo.toLowerCase()}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {filas.length > 6 && (
            <div className="relative w-[240px] max-w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" strokeWidth={2.25} />
              <input
                className="form-input w-full py-1.5 pl-9 pr-8 text-[13px]"
                placeholder={`Buscar ${singular}…`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label={`Buscar ${singular}`}
              />
              {q && (
                <button type="button" onClick={() => setQ('')} aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-ink-700">
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}
          <Button color="primary" size="sm" startContent={<Plus className="h-4 w-4" strokeWidth={2.5} />} onPress={() => setEditando({ indice: -1 })}>
            Agregar {singular}
          </Button>
        </div>
      </div>

      {filas.length === 0 ? (
        <p className="px-5 py-10 text-center text-[14px] text-ink-500">
          Aún no hay {titulo.toLowerCase()}. Usa “Agregar {singular}” para crear {singular === 'grúa' ? 'la primera' : 'el primero'}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div
              className="grid items-center gap-3 bg-surface-muted/60 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500"
              style={{ gridTemplateColumns: plantilla }}
            >
              {camposTexto.map((c) => (
                <div key={c.key} className={c.tipo === 'number' ? 'text-right' : ''}>{c.label}</div>
              ))}
              {switches.map((c) => <div key={c.key} className="text-center">{c.label}</div>)}
              <div />
            </div>

            {visibles.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-ink-500">Nada coincide con “{q}”.</p>
            ) : (
              <ul className="m-0 list-none divide-y divide-surface-border p-0">
                {visibles.map(({ fila, i }) => (
                  <li
                    key={`${fila[claveP]}-${i}`}
                    className="group/fila grid items-center gap-3 px-5 py-2 text-[14px] transition-colors hover:bg-surface-muted/40"
                    style={{ gridTemplateColumns: plantilla }}
                  >
                    {camposTexto.map((c, ci) => (
                      <Tooltip key={c.key} content={`Editar ${c.label.toLowerCase()}`} delay={300} closeDelay={0} placement="top">
                        <button
                          type="button"
                          onClick={() => setEditando({ indice: i, key: c.key })}
                          className={`group/celda -mx-2 flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left outline-none ring-brand-200 transition-colors hover:bg-brand-50 hover:ring-1 focus-visible:bg-brand-50 focus-visible:ring-2 ${
                            c.tipo === 'number' ? 'justify-end' : ''
                          }`}
                        >
                          <span className={`truncate ${ci === 0 ? 'font-semibold text-ink-900' : 'text-ink-600'} ${c.tipo === 'number' ? 'tabular-nums' : ''}`}>
                            {valorTexto(fila, c)}
                          </span>
                          <Pencil className="h-3.5 w-3.5 flex-none text-brand-600 opacity-0 transition-opacity group-hover/celda:opacity-100 group-focus-visible/celda:opacity-100" strokeWidth={2.25} />
                        </button>
                      </Tooltip>
                    ))}
                    {switches.map((c) => (
                      <div key={c.key} className="flex justify-center">
                        <Switch
                          size="sm"
                          color="primary"
                          isSelected={Boolean(fila[c.key])}
                          onValueChange={(v) => cambiarSwitch(i, c.key, v)}
                          aria-label={`${c.label} — ${fila[claveP]}`}
                        />
                      </div>
                    ))}
                    <Tooltip content={`Eliminar ${singular}`} delay={300} closeDelay={0} placement="top" color="danger">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label={`Eliminar ${fila[claveP]}`}
                        className="text-ink-300 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/fila:opacity-100 data-[hover=true]:bg-danger-bg data-[hover=true]:text-danger"
                        onPress={() => eliminarFila(i)}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                      </Button>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <DialogoEditar
        abierto={!!editando}
        titulo={campoEditado ? `Editar ${campoEditado.label.toLowerCase()}` : `Agregar ${singular}`}
        subtitulo={filaEditada ? filaEditada[claveP] : null}
        campos={campoEditado ? [campoEditado] : campos}
        valores={filaEditada ? { [editando.key]: filaEditada[editando.key] } : filaVacia}
        textoGuardar={filaEditada ? 'Guardar' : 'Agregar'}
        onCerrar={() => setEditando(null)}
        onGuardar={guardarFila}
      />
    </div>
  );
}
