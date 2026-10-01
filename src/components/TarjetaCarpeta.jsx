// Tarjeta de "carpeta" de los dashboards: una por grúa (Extracción) o por
// fletero (Fletes). Al hacer clic se abren sus documentos.
export default function TarjetaCarpeta({ icono, titulo, subtitulo, cantidad, total, onAbrir }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="group flex flex-col items-stretch gap-3 rounded-[22px] border border-surface-border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-panel"
    >
      <div className="flex items-center gap-3">
        {icono}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-ink-900" title={titulo}>{titulo}</div>
          <div className="truncate text-[12.5px] text-ink-500" title={subtitulo}>{subtitulo}</div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-surface-border pt-3 text-[13px]">
        <span className="text-ink-500">{cantidad}</span>
        {total && <span className="font-semibold text-brand-600">{total}</span>}
      </div>
    </button>
  );
}
