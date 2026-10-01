import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, FileWarning, LayoutTemplate } from 'lucide-react';
import { Api } from '../lib/api.js';
import ReciboDinamico from './ReciboDinamico.jsx';
import { plantillaCompatible } from '../editor/modelo.js';

const ORIGINAL = 'original';

function parseGruas(json) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista)) return lista.filter((g) => g && g.grua);
  } catch { /* ignora settings corruptos */ }
  return [];
}

// Pantalla de impresión compartida por Extracción y Fletes. Usa el diseño
// "en uso" del Editor de Formatos (o el original 2026), y permite cambiar
// de diseño solo para esta impresión (?plantilla=id).
export default function PantallaImprimir({ tipo, obtener, volverA, titulo, textoNoEncontrado, textoSinId }) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [registro, setRegistro] = useState(null);
  const [settings, setSettings] = useState(null);
  const [plantillas, setPlantillas] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setError(true); return; }
    (async () => {
      try {
        const [r, s, lista] = await Promise.all([obtener(id), Api.obtenerSettings(), Api.listarPlantillas(tipo).catch(() => [])]);
        setRegistro(r);
        setSettings(s);
        setPlantillas(lista.filter(plantillaCompatible));
        document.title = titulo(r);
      } catch {
        setError(true);
      }
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const elegidaParam = params.get('plantilla');
  const activa = (plantillas || []).find((p) => p.activo);
  const elegida = elegidaParam === ORIGINAL
    ? null
    : (plantillas || []).find((p) => String(p.id) === elegidaParam) || activa || null;
  const valorSelect = elegida ? String(elegida.id) : ORIGINAL;

  return (
    <div className="min-h-screen bg-surface px-0 pb-[60px] pt-6 font-sans">
      <div className="no-imprimir mx-auto mb-6 flex max-w-[680px] flex-wrap items-center justify-center gap-4 px-4">
        <Link
          to={volverA}
          className="flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-bold text-ink-800 no-underline shadow-panel transition-transform hover:scale-[1.03] hover:bg-surface-muted"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} /> Volver al listado
        </Link>
        {plantillas && plantillas.length > 0 && (
          <label className="flex items-center gap-2 rounded-full bg-white py-2 pl-4 pr-2 text-[13px] font-semibold text-ink-700 shadow-panel">
            <LayoutTemplate className="h-4 w-4 text-brand-600" strokeWidth={2.25} />
            Diseño
            <select
              className="max-w-[220px] rounded-full border border-surface-border bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-800 outline-none focus:border-brand-500"
              value={valorSelect}
              onChange={(e) => {
                const v = e.target.value;
                const siguiente = new URLSearchParams(params);
                if ((activa && v === String(activa.id)) || (!activa && v === ORIGINAL)) siguiente.delete('plantilla');
                else siguiente.set('plantilla', v);
                setParams(siguiente, { replace: true });
              }}
            >
              <option value={ORIGINAL}>{`2026${!activa ? ' (en uso)' : ''}`}</option>
              {plantillas.map((p) => <option key={p.id} value={String(p.id)}>{`${p.nombre}${p.activo ? ' (en uso)' : ''}`}</option>)}
            </select>
          </label>
        )}
        <button
          className="flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-[15px] font-bold text-white shadow-panel transition-transform hover:scale-[1.03] hover:bg-brand-700"
          onClick={() => window.print()}
        >
          <Printer className="h-[18px] w-[18px]" strokeWidth={2.5} /> Imprimir
        </button>
      </div>

      {error && (
        <div className="flex flex-col items-center gap-3 p-[60px_20px] text-center text-ink-600">
          <FileWarning className="h-10 w-10 text-danger" strokeWidth={1.75} />
          {id ? textoNoEncontrado : textoSinId}
        </div>
      )}
      {!error && id && !(registro && settings && plantillas) && (
        <div className="no-imprimir flex items-center justify-center gap-2.5 p-[60px_20px] text-center text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
        </div>
      )}

      {registro && settings && plantillas && (
        elegida ? (
          <div className="flex justify-center">
            <div className="shadow-[0_4px_24px_rgba(0,0,0,0.15)] print:shadow-none">
              <ReciboDinamico tipo={tipo} plantilla={elegida} registro={registro} settings={settings} gruas={parseGruas(settings.gruas_json)} modo="impresion" />
            </div>
          </div>
        ) : (
          <div className="print:!shadow-none shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
            <ReciboDinamico tipo={tipo} plantilla={null} registro={registro} settings={settings} gruas={parseGruas(settings.gruas_json)} modo="impresion" />
          </div>
        )
      )}
    </div>
  );
}
