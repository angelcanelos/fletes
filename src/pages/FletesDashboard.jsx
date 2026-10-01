import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, X, ArrowLeft,
  Printer, SquarePen, Trash2, TreePine, Loader2
} from 'lucide-react';
import { Api } from '../lib/api.js';
import { normalizar } from '../lib/texto.js';
import { calcularFlete, formatoMoneda, fechaLegible } from '../lib/calc.js';
import PageLayout from '../components/PageLayout.jsx';
import TarjetaCarpeta from '../components/TarjetaCarpeta.jsx';
import Avatar from '../components/Avatar.jsx';
import { FiltroBuscar, FiltroFecha, FiltroSelect } from '../components/Filtros.jsx';
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

// Mismos campos que busca Api.listarFletes con `q`, pero en pantalla: así
// una sola consulta alimenta las tarjetas, la lista de fleteros y la tabla.
function coincideFlete(f, q) {
  const n = normalizar(q);
  return [f.fletero, f.folio, f.observaciones].some((c) => normalizar(c).includes(n));
}

const filtrosVacios = { q: '', fletero: '', desde: '', hasta: '' };

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

  // El texto y el fletero se filtran en pantalla; solo el periodo va a la
  // consulta.
  const { desde, hasta } = filtros;
  const cargarFletes = useCallback(async () => {
    setFletes(await Api.listarFletes({ desde, hasta }));
  }, [desde, hasta]);

  useEffect(() => { cargarFleteros(); }, [cargarFleteros]);
  useEffect(() => { cargarFletes(); }, [cargarFletes]);
  useRealtimeLista('fletes', cargarFletes);

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
      await cargarFletes();
      toast.exito('Flete eliminado correctamente.');
    } catch {
      toast.error('No se pudo eliminar el flete. Intenta de nuevo.');
    } finally {
      setEliminandoId(null);
    }
  }

  const campo = (name, value) => setFiltros((prev) => ({ ...prev, [name]: value }));
  const hayFiltrosActivos = Object.values(filtros).some(Boolean);

  // Resumen por fletero en el periodo (fletes llega ordenado del
  // más reciente al más antiguo).
  const resumenPorFletero = {};
  for (const f of fletes || []) {
    const total = totalDe(f, preciosPorGrua);
    const r = (resumenPorFletero[f.fletero] ||= { cantidad: 0, total: 0, ultimo: f });
    r.cantidad += 1;
    r.total += total;
  }

  const fleteroAbierto = filtros.fletero;
  const fleterosVisibles = fleteros.filter((f) => normalizar(f.nombre).includes(normalizar(filtros.q)));
  const fletesVisibles = (fletes || []).filter((f) =>
    (!fleteroAbierto || f.fletero === fleteroAbierto) && (!filtros.q || coincideFlete(f, filtros.q))
  );


  const tablaProps = { preciosPorGrua, eliminandoId, onEliminar: eliminar };

  return (
    <PageLayout
      title="Gestión de Fletes"
      action={
        <Link to={fleteroAbierto ? `/fletes/nuevo?fletero=${encodeURIComponent(fleteroAbierto)}` : '/fletes/nuevo'} className="btn-primary px-6 py-3 text-[15px]">
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.25} /> Nuevo flete
        </Link>
      }
    >
      <div className="panel-lista p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <FiltroBuscar
            placeholder={fleteroAbierto ? 'Buscar folio u observaciones…' : 'Buscar fletero, folio u observaciones…'}
            value={filtros.q}
            onChange={(v) => campo('q', v)}
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
          {fleteroAbierto ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => campo('fletero', '')} className="btn-secondary px-4 py-2 text-[13px]">
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} /> Fleteros
                </button>
                <Avatar nombre={fleteroAbierto} indice={fleteros.findIndex((f) => f.nombre === fleteroAbierto)} chico />
                <span className="text-lg font-semibold text-ink-900">{fleteroAbierto}</span>
                <span className="ml-auto text-sm text-ink-500">
                  {fletesVisibles.length} flete{fletesVisibles.length === 1 ? '' : 's'}
                </span>
              </div>
              {fletes === null ? <Cargando /> : fletesVisibles.length === 0
                ? <EstadoVacio texto="Este fletero no tiene fletes con esos filtros." fletero={fleteroAbierto} />
                : <TablaFletes fletes={fletesVisibles} {...tablaProps} />}
            </>
          ) : (
            <>
              {fletes === null ? <Cargando /> : fleteros.length === 0 ? (
                <EstadoVacio texto="Aún no hay fleteros. Agrégalos en Ajustes." />
              ) : fleterosVisibles.length === 0 ? (
                <p className="py-8 text-center text-ink-500">Ningún fletero coincide con la búsqueda.</p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
                  {fleterosVisibles.map((f) => {
                    const r = resumenPorFletero[f.nombre];
                    return (
                      <TarjetaCarpeta
                        key={f.nombre}
                        icono={<Avatar nombre={f.nombre} indice={fleteros.indexOf(f)} activo={Boolean(r)} />}
                        titulo={f.nombre}
                        subtitulo={r ? `Último: ${fechaLegible(r.ultimo.fecha)}` : 'Sin fletes registrados'}
                        cantidad={`${r ? r.cantidad : 0} flete${r && r.cantidad === 1 ? '' : 's'}`}
                        total={r ? `$${formatoMoneda(r.total)}` : null}
                        onAbrir={() => setFiltros((prev) => ({ ...prev, q: '', fletero: f.nombre }))}
                      />
                    );
                  })}
                </div>
              )}
  
              {filtros.q && fletes && fletesVisibles.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                    Fletes que coinciden ({fletesVisibles.length})
                  </h2>
                  <TablaFletes fletes={fletesVisibles} {...tablaProps} conFletero />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function TablaFletes({ fletes, preciosPorGrua, eliminandoId, onEliminar, conFletero }) {
  const columnas = ['Folio', 'Fecha', ...(conFletero ? ['Fletero'] : []), 'Viajes', 'Total', ''];
  return (
    <div className="overflow-auto rounded-card border border-surface-border bg-white">
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr>
            {columnas.map((h, i) => (
              <th key={i} className="border-b border-surface-border px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fletes.map((f) => (
            <tr key={f.id} className={`border-b border-surface-border transition-colors last:border-b-0 hover:bg-brand-50/40 ${eliminandoId === f.id ? 'opacity-40' : ''}`}>
              <td className="px-4 py-3.5 font-medium text-ink-900">{f.folio || f.id}</td>
              <td className="px-4 py-3.5 text-ink-600">{fechaLegible(f.fecha)}</td>
              {conFletero && <td className="px-4 py-3.5">{f.fletero}</td>}
              <td className="px-4 py-3.5 text-ink-600">{(f.lineas || []).length}</td>
              <td className="px-4 py-3.5 font-semibold text-ink-900">${formatoMoneda(totalDe(f, preciosPorGrua))}</td>
              <td className="px-4 py-3.5">
                <div className="flex justify-end gap-1.5">
                  <a
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100"
                    href={`/fletes/imprimir/${f.id}`} target="_blank" rel="noreferrer" title="Imprimir flete" aria-label="Imprimir flete"
                  >
                    <Printer className="h-4 w-4" strokeWidth={2} />
                  </a>
                  <Link
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-ink-700 transition-colors hover:bg-ink-100"
                    to={`/fletes/${f.id}/editar`} title="Editar flete" aria-label="Editar flete"
                  >
                    <SquarePen className="h-4 w-4" strokeWidth={2} />
                  </Link>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-danger-bg text-danger transition-colors hover:bg-[#fbd0d0] disabled:opacity-50"
                    onClick={() => onEliminar(f)}
                    disabled={eliminandoId === f.id}
                    title="Eliminar flete" aria-label="Eliminar flete"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cargando() {
  return (
    <div className="flex items-center justify-center gap-2.5 p-10 text-ink-500">
      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
    </div>
  );
}

function EstadoVacio({ texto, fletero }) {
  return (
    <div className="p-[40px_20px] text-center text-ink-500">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <TreePine className="h-8 w-8" strokeWidth={1.75} />
      </div>
      {texto}
      {fletero && (
        <div>
          <Link to={`/fletes/nuevo?fletero=${encodeURIComponent(fletero)}`} className="btn-primary mt-4 inline-flex">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Crear flete
          </Link>
        </div>
      )}
    </div>
  );
}
