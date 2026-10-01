import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, Loader2, FileWarning } from 'lucide-react';
import { Api } from '../lib/api.js';
import DocumentoRender from '../editor/render/DocumentoRender.jsx';
import { normalizarDoc } from '../editor/modelo.js';
import { datosEjemplo } from '../editor/campos.js';

// Hoja de prueba de un diseño del editor, con datos de ejemplo — para
// revisar márgenes y escala en la impresora antes de ponerlo en uso.
export default function ImprimirPrueba() {
  const { id } = useParams();
  const [plantilla, setPlantilla] = useState(null);
  const [settings, setSettings] = useState({});
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([Api.obtenerPlantilla(id), Api.obtenerSettings().catch(() => ({}))]);
        setPlantilla(p);
        setSettings(s || {});
        document.title = `Prueba · ${p.nombre}`;
      } catch {
        setError(true);
      }
    })();
  }, [id]);

  const doc = useMemo(() => (plantilla ? normalizarDoc(plantilla.project_data) : null), [plantilla]);
  const datos = useMemo(() => (plantilla ? datosEjemplo(plantilla.tipo, settings) : null), [plantilla, settings]);

  return (
    <div className="min-h-screen bg-surface px-0 pb-[60px] pt-6 font-sans">
      <div className="no-imprimir mx-auto mb-6 flex max-w-[520px] flex-col items-center gap-3 px-4 text-center">
        <p className="m-0 text-[13px] text-ink-500">Hoja de prueba con datos de ejemplo{plantilla ? ` · «${plantilla.nombre}»` : ''}</p>
        <button
          className="flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-[15px] font-bold text-white shadow-panel transition-transform hover:scale-[1.03] hover:bg-brand-700"
          onClick={() => window.print()}
        >
          <Printer className="h-[18px] w-[18px]" strokeWidth={2.5} /> Imprimir prueba
        </button>
      </div>
      {error && (
        <div className="flex flex-col items-center gap-3 p-[60px_20px] text-center text-ink-600">
          <FileWarning className="h-10 w-10 text-danger" strokeWidth={1.75} /> No se encontró ese diseño.
        </div>
      )}
      {!error && !doc && (
        <div className="no-imprimir flex items-center justify-center gap-2.5 p-[60px_20px] text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
        </div>
      )}
      {doc && (
        <div className="flex justify-center">
          <div className="shadow-[0_4px_24px_rgba(0,0,0,0.15)] print:shadow-none">
            <DocumentoRender doc={doc} datos={datos} tipo={plantilla.tipo} modo="impresion" />
          </div>
        </div>
      )}
    </div>
  );
}
