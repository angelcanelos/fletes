import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, X, ArrowLeft, FolderOpen,
  Printer, SquarePen, Trash2, TreePine, Loader2
} from 'lucide-react';
import { Api } from '../lib/api.js';
import { calcularFormato, formatoMoneda, fechaLegible } from '../lib/calc.js';
import PageLayout from '../components/PageLayout.jsx';
import TarjetaCarpeta from '../components/TarjetaCarpeta.jsx';
import { FiltroBuscar, FiltroFecha, FiltroSelect } from '../components/Filtros.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import useRealtimeLista from '../hooks/useRealtimeLista.js';

function totalDe(f) {
  const r = calcularFormato({
    generos: f.generos, ajustes: f.ajustes,
    iva_rate: f.iva_rate, isr_rate: f.isr_rate
  });
  return r.totalNeto;
}

function parseGruas(json) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista)) return lista.filter((g) => g && g.grua);
  } catch { /* ignora settings corruptos */ }
  return [];
}

const filtrosVacios = { q: '', grua: '', desde: '', hasta: '' };

export default function Dashboard() {
  const [gruas, setGruas] = useState([]);
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [formatos, setFormatos] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const confirmar = useConfirm();
  const toast = useToast();

  const cargarGruas = useCallback(async () => {
    const s = await Api.obtenerSettings();
    setGruas(parseGruas(s.gruas_json));
  }, []);

  const cargarTabla = useCallback(async (f) => {
    const data = await Api.listarFormatos(f);
    setFormatos(data);
  }, []);

  useEffect(() => { cargarGruas(); }, [cargarGruas]);
  useEffect(() => { cargarTabla(filtros); }, [filtros, cargarTabla]);
  // En tiempo real: si alguien más (u otra pestaña/dispositivo) crea,
  // edita o borra un formato, esta lista se refresca sola.
  useRealtimeLista('formatos', () => cargarTabla(filtros));

  async function eliminar(f) {
    const ok = await confirmar({
      titulo: `¿Eliminar la extracción de ${f.productor}?`,
      texto: `Folio ${f.folio || f.id} · esta acción no se puede deshacer.`,
      textoConfirmar: 'Sí, eliminar',
      peligro: true
    });
    if (!ok) return;
    setEliminandoId(f.id);
    try {
      await Api.eliminarFormato(f.id);
      await cargarTabla(filtros);
      toast.exito('Extracción eliminada correctamente.');
    } catch {
      toast.error('No se pudo eliminar la extracción. Intenta de nuevo.');
    } finally {
      setEliminandoId(null);
    }
  }

  const campo = (name, value) => setFiltros((prev) => ({ ...prev, [name]: value }));
  const hayFiltrosActivos = Object.values(filtros).some(Boolean);
  const vistaCarpetas = !hayFiltrosActivos;
  const grupoAbierto = gruas.find((g) => g.grua === filtros.grua);

  function abrirGrua(nombreGrua) {
    setFiltros({ ...filtrosVacios, grua: nombreGrua });
  }

  // Conteo y total por grúa, calculados sobre los formatos ya cargados
  // (cuando no hay filtros activos, formatos trae todos).
  const resumenPorGrua = {};
  if (vistaCarpetas && formatos) {
    for (const f of formatos) {
      if (!resumenPorGrua[f.grua]) resumenPorGrua[f.grua] = { cantidad: 0, total: 0 };
      resumenPorGrua[f.grua].cantidad += 1;
      resumenPorGrua[f.grua].total += totalDe(f);
    }
  }

  return (
    <PageLayout
      title="Extracción"
      action={
        <Link to={urlNueva(filtros.grua)} className="btn-primary">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Nueva extracción
        </Link>
      }
    >
      <div className="panel-lista p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <FiltroBuscar
            placeholder="Buscar productor, folio u observaciones…"
            value={filtros.q}
            onChange={(v) => campo('q', v)}
          />
          <FiltroSelect
            label="Grúa"
            textoTodos="Todas"
            value={filtros.grua}
            onChange={(v) => campo('grua', v)}
            opciones={gruas.map((g) => ({ valor: g.grua, texto: g.grua }))}
            className="w-[170px]"
          />
          <FiltroFecha label="Desde" value={filtros.desde} onChange={(v) => campo('desde', v)} />
          <FiltroFecha label="Hasta" value={filtros.hasta} onChange={(v) => campo('hasta', v)} />
          {hayFiltrosActivos && (
            <button type="button" className="btn-secondary h-14 px-5" onClick={() => setFiltros(filtrosVacios)}>
              <X className="h-4 w-4" strokeWidth={2.25} /> Limpiar
            </button>
          )}
        </div>

        <div className="mt-5 border-t border-surface-border pt-5">
          {vistaCarpetas ? (
            formatos === null ? (
              <div className="flex items-center justify-center gap-2.5 p-10 text-center text-ink-500">
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
              </div>
            ) : gruas.length === 0 ? (
              <EstadoVacio />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
                {gruas.map((g) => {
                  const r = resumenPorGrua[g.grua] || { cantidad: 0, total: 0 };
                  return (
                    <TarjetaCarpeta
                      key={g.grua}
                      icono={
                        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                          <FolderOpen className="h-5 w-5" strokeWidth={1.9} />
                        </span>
                      }
                      titulo={g.grua}
                      subtitulo={g.productor || 'Sin productor asignado'}
                      cantidad={`${r.cantidad} ${r.cantidad === 1 ? 'extracción' : 'extracciones'}`}
                      total={r.cantidad > 0 ? `$${formatoMoneda(r.total)}` : null}
                      onAbrir={() => abrirGrua(g.grua)}
                    />
                  );
                })}
              </div>
            )
          ) : (
            <div>
              {grupoAbierto && filtros.grua && !filtros.q && !filtros.desde && !filtros.hasta && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => setFiltros(filtrosVacios)} className="btn-secondary px-4 py-2 text-[13px]">
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Grúas
                  </button>
                  <span className="text-lg font-semibold text-ink-900">{grupoAbierto.grua}</span>
                  <span className="text-sm text-ink-500">{grupoAbierto.productor}</span>
                </div>
              )}
              {formatos === null ? (
                <div className="flex items-center justify-center gap-2.5 p-10 text-center text-ink-500">
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
                </div>
              ) : formatos.length === 0 ? (
                <EstadoVacio hayFiltrosActivos grua={filtros.grua} />
              ) : (
                <div className="overflow-auto rounded-card border border-surface-border">
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr>
                      {['Folio', 'Fecha', 'Productor', 'Grúa', 'Total neto', 'Acciones'].map((h) => (
                        <th key={h} className="border-b border-surface-border px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formatos.map((f) => (
                      <tr key={f.id} className={`border-b border-surface-border transition-colors last:border-b-0 hover:bg-brand-50/40 ${eliminandoId === f.id ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-3.5">{f.folio || f.id}</td>
                        <td className="px-4 py-3.5">{fechaLegible(f.fecha)}</td>
                        <td className="px-4 py-3.5">{f.productor}</td>
                        <td className="px-4 py-3.5">{f.grua}</td>
                        <td className="px-4 py-3.5 font-bold">${formatoMoneda(totalDe(f))}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            <a
                              className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[12.5px] font-bold text-brand-700 transition-colors hover:bg-brand-100"
                              href={`/extraccion/imprimir/${f.id}`} target="_blank" rel="noreferrer" title="Imprimir extracción"
                            >
                              <Printer className="h-3.5 w-3.5" strokeWidth={2.25} /> Imprimir
                            </a>
                            <Link className="btn-secondary px-3 py-1.5 text-[12.5px]" to={`/extraccion/${f.id}/editar`} title="Editar extracción">
                              <SquarePen className="h-3.5 w-3.5" strokeWidth={2.25} /> Editar
                            </Link>
                            <button
                              className="btn-danger px-3 py-1.5 text-[12.5px]"
                              onClick={() => eliminar(f)}
                              disabled={eliminandoId === f.id}
                              title="Eliminar extracción"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

// Dentro de la carpeta de una grúa, "Nueva extracción" abre el formulario
// con esa grúa (y su productor) ya puestos, igual que Fletes con el fletero.
function urlNueva(grua) {
  return grua ? `/extraccion/nuevo?grua=${encodeURIComponent(grua)}` : '/extraccion/nuevo';
}

function EstadoVacio({ hayFiltrosActivos, grua }) {
  return (
    <div className="p-[40px_20px] text-center text-ink-500">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <TreePine className="h-8 w-8" strokeWidth={1.75} />
      </div>
      {hayFiltrosActivos ? (
        <>
          No se encontró ninguna extracción con esos filtros.
          {grua && (
            <div>
              <Link to={urlNueva(grua)} className="btn-primary mt-4 inline-flex">
                <Plus className="h-4 w-4" strokeWidth={2.5} /> Crear extracción
              </Link>
            </div>
          )}
        </>
      ) : (
        <>
          Aún no hay extracciones guardadas.<br />
          <Link to="/extraccion/nuevo" className="btn-primary mt-3.5 inline-flex">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Crear la primera extracción
          </Link>
        </>
      )}
    </div>
  );
}
