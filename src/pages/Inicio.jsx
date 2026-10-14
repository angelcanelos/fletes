import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Trees, Truck, Settings, ArrowRight, FileStack, CalendarCheck,
  Printer, SquarePen, Loader2
} from 'lucide-react';
import { Api } from '../lib/api.js';
import { calcularFormato, calcularFlete, formatoMoneda, fechaLegible } from '../lib/calc.js';
import PageLayout from '../components/PageLayout.jsx';
import TarjetaStat from '../components/TarjetaStat.jsx';
import ElegirFletero from '../components/ElegirFletero.jsx';
import ElegirGrua from '../components/ElegirGrua.jsx';
import useRealtimeLista from '../hooks/useRealtimeLista.js';

function parseJson(json, fallback) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista)) return lista;
  } catch { /* ignora settings corruptos */ }
  return fallback;
}

function preciosPorGruaDe(gruas) {
  const mapa = {};
  gruas.forEach((g) => { if (g && g.grua) mapa[g.grua] = g.precio_flete; });
  return mapa;
}

export default function Inicio() {
  const [statsFormatos, setStatsFormatos] = useState(null);
  const [statsFletes, setStatsFletes] = useState(null);
  const [catalogos, setCatalogos] = useState({ gruas: [], fleteros: [] });
  const [recientesFormatos, setRecientesFormatos] = useState(null);
  const [recientesFletes, setRecientesFletes] = useState(null);
  const [resumenFleteros, setResumenFleteros] = useState({});
  const [elegirFletero, setElegirFletero] = useState(false);
  const [resumenGruas, setResumenGruas] = useState({});
  const [elegirGrua, setElegirGrua] = useState(false);

  const cargar = useCallback(async () => {
    const [sf, sl, settings, formatos, fletes] = await Promise.all([
      Api.stats(),
      Api.statsFletes(),
      Api.obtenerSettings(),
      Api.listarFormatos({}),
      Api.listarFletes({})
    ]);
    setStatsFormatos(sf);
    setStatsFletes(sl);
    setCatalogos({
      gruas: parseJson(settings.gruas_json, []),
      fleteros: parseJson(settings.fleteros_json, [])
    });
    setRecientesFormatos(formatos.slice(0, 5));
    setRecientesFletes(fletes.slice(0, 5));
    // fletes llega ordenado del más reciente al más antiguo.
    const resumen = {};
    for (const f of fletes) {
      const r = (resumen[f.fletero] ||= { cantidad: 0, ultimaFecha: f.fecha });
      r.cantidad += 1;
    }
    setResumenFleteros(resumen);
    // formatos también llega del más reciente al más antiguo.
    const porGrua = {};
    for (const f of formatos) {
      const r = (porGrua[f.grua] ||= { cantidad: 0, ultimaFecha: f.fecha });
      r.cantidad += 1;
    }
    setResumenGruas(porGrua);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useRealtimeLista('formatos', cargar);
  useRealtimeLista('fletes', cargar);

  const preciosPorGrua = preciosPorGruaDe(catalogos.gruas);

  return (
    <PageLayout
      title="Inicio"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setElegirGrua(true)}
          className="group flex items-center justify-between gap-4 rounded-panel bg-brand-600 px-6 py-5 text-left text-white shadow-panel transition-transform hover:-translate-y-0.5 hover:bg-brand-700"
        >
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-wide text-brand-100">Extracción</div>
            <div className="mt-0.5 text-lg font-bold">Nueva extracción</div>
          </div>
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white/15 transition-transform group-hover:scale-105">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </span>
        </button>
        <button
          type="button"
          onClick={() => setElegirFletero(true)}
          className="group flex items-center justify-between gap-4 rounded-panel bg-ink-900 px-6 py-5 text-left text-white shadow-panel transition-transform hover:-translate-y-0.5 hover:bg-ink-800"
        >
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-wide text-ink-300">Fletes</div>
            <div className="mt-0.5 text-lg font-bold">Nuevo flete</div>
          </div>
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white/10 transition-transform group-hover:scale-105">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </span>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <TarjetaStat icon={FileStack} valor={statsFormatos?.totalFormatos} etiqueta="Extracciones guardadas" tono="indigo" />
        <TarjetaStat icon={CalendarCheck} valor={statsFormatos?.esteMes} etiqueta="Extracciones este mes" tono="azul" />
        <TarjetaStat icon={FileStack} valor={statsFletes?.totalFletes} etiqueta="Fletes guardados" tono="verde" />
        <TarjetaStat icon={CalendarCheck} valor={statsFletes?.esteMes} etiqueta="Fletes este mes" tono="ambar" />
        <TarjetaStat icon={Trees} valor={catalogos.gruas.length} etiqueta="Grúas registradas" tono="rosa" />
        <TarjetaStat icon={Truck} valor={catalogos.fleteros.length} etiqueta="Fleteros registrados" tono="teal" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ListaReciente
          titulo="Extracción reciente"
          icon={Trees}
          verTodoHref="/extraccion"
          items={recientesFormatos}
          vacio="Aún no hay extracciones guardadas."
          render={(f) => ({
            id: f.id,
            folio: f.folio || f.id,
            fecha: f.fecha,
            titulo: f.productor,
            subtitulo: f.grua,
            total: calcularFormato({ generos: f.generos, ajustes: f.ajustes, iva_rate: f.iva_rate, retencion_rate: f.retencion_rate, isr_rate: f.isr_rate }).totalNeto,
            editarHref: `/extraccion/${f.id}/editar`,
            imprimirHref: `/extraccion/imprimir/${f.id}`
          })}
        />
        <ListaReciente
          titulo="Fletes recientes"
          icon={Truck}
          verTodoHref="/fletes"
          items={recientesFletes}
          vacio="Aún no hay fletes guardados."
          render={(f) => ({
            id: f.id,
            folio: f.folio || f.id,
            fecha: f.fecha,
            titulo: f.fletero,
            subtitulo: `${(f.lineas || []).length} viaje${(f.lineas || []).length === 1 ? '' : 's'}`,
            total: calcularFlete({ lineas: f.lineas, precio_flete: f.precio_flete, ajustes: f.ajustes, iva_rate: f.iva_rate, retencion_rate: f.retencion_rate, isr_rate: f.isr_rate, precios_por_grua: preciosPorGrua }).total,
            editarHref: `/fletes/${f.id}/editar`,
            imprimirHref: `/fletes/imprimir/${f.id}`
          })}
        />
      </div>

      <Link
        to="/ajustes"
        className="mt-6 flex items-center justify-between gap-3 rounded-panel border border-surface-border bg-surface-card px-5 py-4 text-sm font-semibold text-ink-800 shadow-card transition-colors hover:bg-surface-muted"
      >
        <span className="flex items-center gap-2.5">
          <Settings className="h-[18px] w-[18px] text-ink-500" strokeWidth={2} />
          Administrar catálogos (grúas, fleteros, parajes, destinos, géneros)
        </span>
        <ArrowRight className="h-4 w-4 text-ink-400" strokeWidth={2.25} />
      </Link>

      <ElegirGrua
        isOpen={elegirGrua}
        onClose={() => setElegirGrua(false)}
        gruas={catalogos.gruas}
        resumen={resumenGruas}
      />
      <ElegirFletero
        isOpen={elegirFletero}
        onClose={() => setElegirFletero(false)}
        fleteros={catalogos.fleteros.filter((f) => f && f.nombre)}
        resumen={resumenFleteros}
      />
    </PageLayout>
  );
}

function ListaReciente({ titulo, icon: Icon, verTodoHref, items, vacio, render }) {
  return (
    <div className="rounded-panel border border-surface-border bg-surface-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
        <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Icon className="h-4 w-4 text-brand-600" strokeWidth={2.25} />
          {titulo}
        </div>
        <Link to={verTodoHref} className="flex items-center gap-1 text-[12.5px] font-semibold text-brand-600 hover:text-brand-700">
          Ver todo <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Link>
      </div>
      {items === null ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} /> Cargando…
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-400">{vacio}</div>
      ) : (
        <ul>
          {items.map((raw) => {
            const it = render(raw);
            return (
              <li key={it.id} className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-3 last:border-b-0">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-ink-900">{it.titulo}</div>
                  <div className="truncate text-xs text-ink-500">{it.subtitulo} · {fechaLegible(it.fecha)} · ${formatoMoneda(it.total)}</div>
                </div>
                <div className="flex flex-none items-center gap-1">
                  <Link to={it.imprimirHref} target="_blank" rel="noreferrer" title="Imprimir" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700">
                    <Printer className="h-4 w-4" strokeWidth={2.1} />
                  </Link>
                  <Link to={it.editarHref} title="Editar" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700">
                    <SquarePen className="h-4 w-4" strokeWidth={2.1} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
