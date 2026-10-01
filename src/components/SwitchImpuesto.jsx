import { Switch } from '@heroui/react';

// Un impuesto en los formularios: el porcentaje viene del catálogo
// (Ajustes) y aquí solo se decide si se aplica o no a este documento.
export default function SwitchImpuesto({ nombre, porcentaje, activo, onCambiar, ayuda }) {
  const pct = (Number(porcentaje) || 0).toLocaleString('es-MX', { maximumFractionDigits: 4 });
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        activo ? 'border-brand-200 bg-brand-50/60' : 'border-surface-border bg-surface-muted/60'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`text-[14px] font-semibold ${activo ? 'text-ink-900' : 'text-ink-500'}`}>{nombre}</span>
          <span className={`text-[13px] ${activo ? 'text-brand-700' : 'text-ink-400 line-through'}`}>{pct} %</span>
        </div>
        {ayuda && <div className="text-[12px] text-ink-500">{ayuda}</div>}
      </div>
      <Switch
        size="sm"
        color="primary"
        isSelected={activo}
        onValueChange={onCambiar}
        aria-label={`Aplicar ${nombre}`}
      />
    </div>
  );
}
