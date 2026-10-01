import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Filter, X, ArrowLeft, FolderOpen, UserRound,
  Printer, SquarePen, Trash2, TreePine, Loader2
} from 'lucide-react';
import { Api } from '../lib/api.js';
import { calcularFlete, formatoMoneda, fechaLegible } from '../lib/calc.js';
import PageLayout from '../components/PageLayout.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import useRealtimeLista from '../hooks/useRealtimeLista.js';

function totalDe(f, preciosPorGrua) {
  const r = calcularFlete({
    lineas: f.lineas, precio_flete: f.precio_flete, ajustes: f.ajustes,
    iva_rate: f.iva_rate, retencion_rate: f.retencion_rate, isr_rate: f.isr_rate,
    precios_por_grua: preciosPorGrua
  });
  return r.total;
}

function parseFleteros(json) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista)) return lista.filter((f) => f && f.nombre);
  } catch { /* ignora settings corruptos */ }
  return [];
}

function parseGruas(json) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista)) return lista.filter((g) => g && g.grua);
  } catch { /* ignora settings corruptos */ }
  return [];
}

function preciosPorGruaDe(gruas) {
  const mapa = {};
  gruas.forEach((g) => { if (g && g.grua) mapa[g.grua] = g.precio_flete; });
  return mapa;
}

// Las carpetas se ven más limpias con solo el primer nombre de cada
// fletero (los nombres completos son largos) — pero si dos fleteros
// comparten el mismo primer nombre, esos dos (solo esos) se muestran
// completos para no confundirlos.
function etiquetasCortas(fleteros) {
  const conteoPrimerNombre = {};
  for (const f of fleteros) {
    const primero = (f.nombre || '').trim().split(/\s+/)[0] || '';
    conteoPrimerNombre[primero] = (conteoPrimerNombre[primero] || 0) + 1;
  }
  const etiquetas = {};
  for (const f of fleteros) {
    const partes = (f.nombre || '').trim().split(/\s+/);
    const primero = partes[0] || '';
    etiquetas[f.nombre] = conteoPrimerNombre[primero] > 1 ? f.nombre : primero;
  }
  return etiquetas;
}

const filtrosVacios = { q: '', fletero: '', desde: '', hasta: '', estado: '' };

export default function FletesDashboard() {
  const [fleteros, setFleteros] = useState([]);
  const [preciosPorGrua, setPreciosPorGrua] = useState({});
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [fletes, setFletes] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const confirmar = useConfirm();
  const toast = useToast();

  const cargarFleteros = useCallback(async () => {
    const s = await Api.obtenerSettings();
    setFleteros(parseFleteros(s.fleteros_json));
    setPreciosPorGrua(preciosPorGruaDe(parseGruas(s.gruas_json)));
  }, []);

  const cargarTabla = useCallback(async (f) => {
    const data = await Api.listarFletes(f);
    setFletes(data);
  }, []);

  useEffect(() => { cargarFleteros(); }, [cargarFleteros]);
  useEffect(() => { cargarTabla(filtros); }, [filtros, cargarTabla]);
  useRealtimeLista('fletes', () => cargarTabla(filtros));

  async function eliminar(f) {
    const ok = await confirmar({
      titulo: `¿Eliminar el flete de ${f.fletero}?`,
      texto: `Folio ${f.folio || f.id} · esta acción no se puede deshacer.`,
      textoConfirmar: 'Sí, eliminar',
      peligro: true
    });
    if (!ok) return;
    setEliminandoId(f.id);
    try {
      await Api.eliminarFlete(f.id);
      await cargarTabla(filtros);
      toast.exito('Flete eliminado correctamente.');
    } catch {
      toast.error('No se pudo eliminar el flete. Intenta de nuevo.');
    } finally {
      setEliminandoId(null);
    }
  }

  const campo = (name, value) => setFiltros((prev) => ({ ...prev, [name]: value }));
  const hayFiltrosActivos = Object.values(filtros).some(Boolean);
  const vistaCarpetas = !hayFiltrosActivos;
  const grupoAbierto = fleteros.find((f) => f.nombre === filtros.fletero);

  function abrirFletero(nombre) {
    setFiltros({ ...filtrosVacios, fletero: nombre });
  }

  // Conteo y total por fletero, calculados sobre los fletes ya cargados
  // (cuando no hay filtros activos, fletes trae todos).
  const resumenPorFletero = {};
  if (vistaCarpetas && fletes) {
    for (const f of fletes) {
      if (!resumenPorFletero[f.fletero]) resumenPorFletero[f.fletero] = { cantidad: 0, total: 0 };
      resumenPorFletero[f.fletero].cantidad += 1;
      resumenPorFletero[f.fletero].total += totalDe(f, preciosPorGrua);
    }
  }
  const etiquetas = etiquetasCortas(fleteros);

  return (
    <PageLayout
      title="Fletes"
      subtitle="Consulta, busca, imprime o crea un nuevo comprobante de flete de madera en rollo."
      action={
        <Link to={filtros.fletero ? `/fletes/nuevo?fletero=${encodeURIComponent(filtros.fletero)}` : '/fletes/nuevo'} className="btn-primary">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Nuevo flete
        </Link>
      }
    >
      <div className="mb-5 card p-5">
        <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide text-ink-500">
          <Filter className="h-3.5 w-3.5" strokeWidth={2.5} /> Filtros
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <Campo label="Buscar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" strokeWidth={2.25} />
              <input
                type="text"
                className="campo-input min-w-[160px] pl-9"
                placeholder="Fletero, folio, paraje..."
                value={filtros.q}
                onChange={(e) => campo('q', e.target.value)}
              />
            </div>
          </Campo>
          <Campo label="Fletero">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" strokeWidth={2.25} />
              <select className="campo-input min-w-[170px] pl-9" value={filtros.fletero} onChange={(e) => campo('fletero', e.target.value)}>
                <option value="">Todos</option>
                {fleteros.map((f) => <option key={f.nombre} value={f.nombre}>{f.nombre}</option>)}
              </select>
            </div>
          </Campo>
          <Campo label="Desde">
            <input type="date" className="campo-input min-w-[140px]" value={filtros.desde} onChange={(e) => campo('desde', e.target.value)} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" className="campo-input min-w-[140px]" value={filtros.hasta} onChange={(e) => campo('hasta', e.target.value)} />
          </Campo>
          <Campo label="Estado">
            <select className="campo-input min-w-[140px]" value={filtros.estado} onChange={(e) => campo('estado', e.target.value)}>
              <option value="">Todos</option>
              <option value="guardado">Guardado</option>
              <option value="pagado">Pagado</option>
            </select>
          </Campo>
          {hayFiltrosActivos && (
            <button type="button" className="btn-secondary" onClick={() => setFiltros(filtrosVacios)}>
              <X className="h-4 w-4" strokeWidth={2.5} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {vistaCarpetas ? (
        fletes === null ? (
          <div className="flex items-center justify-center gap-2.5 card p-10 text-center text-ink-500">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
          </div>
        ) : fleteros.length === 0 ? (
          <EstadoVacio />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
            {fleteros.map((f) => {
              const r = resumenPorFletero[f.nombre] || { cantidad: 0, total: 0 };
              return (
                <button
                  key={f.nombre}
                  type="button"
                  onClick={() => abrirFletero(f.nombre)}
                  className="group flex flex-col items-start gap-2.5 card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-panel"
                >
                  <div className="flex w-full items-center gap-3">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                      <FolderOpen className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-ink-900" title={f.nombre}>{etiquetas[f.nombre]}</div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between border-t border-surface-border pt-2.5 text-xs">
                    <span className="font-semibold text-ink-500">{r.cantidad} flete{r.cantidad === 1 ? '' : 's'}</span>
                    {r.cantidad > 0 && <span className="font-bold text-brand-600">${formatoMoneda(r.total)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div className="overflow-auto card">
          {grupoAbierto && filtros.fletero && !filtros.q && !filtros.desde && !filtros.hasta && !filtros.estado && (
            <div className="flex items-center gap-2.5 border-b border-surface-border px-4 py-3">
              <button type="button" onClick={() => setFiltros(filtrosVacios)} className="btn-secondary px-3.5 py-1.5 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Fleteros
              </button>
              <span className="text-sm font-bold text-ink-900">{grupoAbierto.nombre}</span>
            </div>
          )}
          {fletes === null ? (
            <div className="flex items-center justify-center gap-2.5 p-10 text-center text-ink-500">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
            </div>
          ) : fletes.length === 0 ? (
            <EstadoVacio hayFiltrosActivos />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['Folio', 'Fecha', 'Fletero', 'Viajes', 'Total', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="border-b border-surface-border bg-surface-muted px-2.5 py-2.5 text-left text-[12.5px] font-semibold uppercase tracking-wide text-ink-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fletes.map((f) => (
                  <tr key={f.id} className={`border-b border-surface-border transition-colors hover:bg-surface-muted ${eliminandoId === f.id ? 'opacity-40' : ''}`}>
                    <td className="px-2.5 py-3">{f.folio || f.id}</td>
                    <td className="px-2.5 py-3">{fechaLegible(f.fecha)}</td>
                    <td className="px-2.5 py-3">{f.fletero}</td>
                    <td className="px-2.5 py-3">{(f.lineas || []).length}</td>
                    <td className="px-2.5 py-3 font-bold">${formatoMoneda(totalDe(f, preciosPorGrua))}</td>
                    <td className="px-2.5 py-3">
                      <span className={`rounded-full px-2.5 py-[3px] text-xs font-bold ${f.estado === 'pagado' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>
                        {f.estado === 'pagado' ? 'Pagado' : 'Guardado'}
                      </span>
                    </td>
                    <td className="px-2.5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <a
                          className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[12.5px] font-bold text-brand-700 transition-colors hover:bg-brand-100"
                          href={`/fletes/imprimir/${f.id}`} target="_blank" rel="noreferrer" title="Imprimir flete"
                        >
                          <Printer className="h-3.5 w-3.5" strokeWidth={2.25} /> Imprimir
                        </a>
                        <Link className="btn-secondary px-3 py-1.5 text-[12.5px]" to={`/fletes/${f.id}/editar`} title="Editar flete">
                          <SquarePen className="h-3.5 w-3.5" strokeWidth={2.25} /> Editar
                        </Link>
                        <button
                          className="btn-danger px-3 py-1.5 text-[12.5px]"
                          onClick={() => eliminar(f)}
                          disabled={eliminandoId === f.id}
                          title="Eliminar flete"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </PageLayout>
  );
}

function EstadoVacio({ hayFiltrosActivos }) {
  return (
    <div className="card p-[50px_20px] text-center text-ink-500">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <TreePine className="h-8 w-8" strokeWidth={1.75} />
      </div>
      {hayFiltrosActivos ? (
        <>No se encontró ningún flete con esos filtros.</>
      ) : (
        <>
          Aún no hay fletes guardados.<br />
          <Link to="/fletes/nuevo" className="btn-primary mt-3.5 inline-flex">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Crear el primer flete
          </Link>
        </>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12.5px] font-semibold text-ink-500">{label}</label>
      {children}
    </div>
  );
}
