import { Clock, Check } from 'lucide-react';

// Marca un flete o una extracción como facturado (palomita verde) o
// pendiente (reloj ámbar). Se guarda en el campo `estado` que ya existía
// ('guardado' = pendiente, 'facturado'), así funciona también sin internet.
export function esFacturado(doc) {
  return doc && doc.estado === 'facturado';
}

export default function BotonFacturado({ doc, onAlternar, conTexto }) {
  const facturado = esFacturado(doc);
  const titulo = facturado ? 'Facturado · clic para marcar como pendiente' : 'Pendiente de facturar · clic para marcar como facturado';
  const Icono = facturado ? Check : Clock;
  const color = facturado
    ? 'bg-success-bg text-success hover:bg-success-bg/70'
    : 'bg-warning-bg text-warning hover:bg-warning-bg/70';

  if (conTexto) {
    return (
      <button
        type="button"
        onClick={() => onAlternar(doc)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition-colors ${color}`}
        title={titulo} aria-label={titulo} aria-pressed={facturado}
      >
        <Icono className="h-3.5 w-3.5" strokeWidth={2.5} /> {facturado ? 'Facturado' : 'Pendiente'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAlternar(doc)}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${color}`}
      title={titulo} aria-label={titulo} aria-pressed={facturado}
    >
      <Icono className="h-4 w-4" strokeWidth={facturado ? 2.75 : 2} />
    </button>
  );
}
