import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// Etiqueta "Actualización disponible": solo aparece en la app de
// escritorio (window.actualizaciones lo pone electron/preload.js) cuando
// hay una versión nueva publicada en GitHub. Al darle clic, Electron abre
// el splash que descarga e instala, y la app se vuelve a abrir sola.
export default function AvisoActualizacion({ chica }) {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    const api = window.actualizaciones;
    if (!api) return undefined;
    // El aviso pudo haber llegado antes de que React montara este
    // componente, así que también se pregunta el estado al montar.
    api.estado().then((e) => setVersion(e?.version ?? null));
    return api.alDisponible((e) => setVersion(e?.version ?? null));
  }, []);

  if (!version) return null;

  const instalar = () => window.actualizaciones.instalar();

  if (chica) {
    return (
      <button
        type="button"
        onClick={instalar}
        className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-boton transition-colors hover:bg-brand-700"
      >
        <Download className="h-3.5 w-3.5" strokeWidth={2.4} /> Actualizar
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={instalar}
      className="group flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-600 to-[#8b5cf6] px-3.5 py-3 text-left text-white shadow-boton transition-transform hover:-translate-y-px active:translate-y-0"
    >
      <span className="relative grid h-8 w-8 flex-none place-items-center rounded-xl bg-white/15">
        <Download className="h-4 w-4" strokeWidth={2.4} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-brand-600 motion-safe:animate-pulse" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold leading-tight">Actualización disponible</span>
        <span className="block text-[11.5px] leading-tight text-white/80">Versión {version} · Clic para instalar</span>
      </span>
    </button>
  );
}
