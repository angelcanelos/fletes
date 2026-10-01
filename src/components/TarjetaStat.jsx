import { Loader2 } from 'lucide-react';

const TONOS = {
  indigo: 'border-tono-indigo-borde from-tono-indigo-bg text-tono-indigo-texto',
  verde: 'border-tono-verde-borde from-tono-verde-bg text-tono-verde-texto',
  azul: 'border-tono-azul-borde from-tono-azul-bg text-tono-azul-texto',
  ambar: 'border-tono-ambar-borde from-tono-ambar-bg text-tono-ambar-texto',
  rosa: 'border-tono-rosa-borde from-tono-rosa-bg text-tono-rosa-texto',
  teal: 'border-tono-teal-borde from-tono-teal-bg text-tono-teal-texto'
};

// Tarjeta pastel de estadística (ícono, etiqueta y valor grande). Mientras
// el valor no llega (undefined/null) muestra un indicador de carga.
export default function TarjetaStat({ etiqueta, valor, icon: Icon, tono = 'indigo' }) {
  return (
    <div className={`rounded-[34px] border bg-gradient-to-br to-white/60 px-6 py-5 shadow-card ${TONOS[tono]}`}>
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card">
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <div className="text-[13px] font-semibold uppercase leading-tight tracking-[0.06em]">{etiqueta}</div>
      <div className="mt-1 text-[1.75rem] font-semibold leading-tight text-ink-900">
        {valor ?? <Loader2 className="my-1.5 h-6 w-6 animate-spin text-ink-300" strokeWidth={2.25} />}
      </div>
    </div>
  );
}
