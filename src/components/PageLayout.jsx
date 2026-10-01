export default function PageLayout({ title, subtitle, action, children, ancho }) {
  // Algunas pantallas (el formulario de Fletes, con una vista previa ancha
  // de 19cm) necesitan todo el ancho disponible en vez del máximo de
  // siempre, para que la vista previa no quede cortada.
  const anchoClase = ancho === 'completo' ? 'max-w-none' : 'max-w-[1480px]';
  return (
    <div className={`mx-auto ${anchoClase} px-5 pb-16 pt-8 sm:px-8 lg:px-10`}>
      {(title || action) && (
        <div className="mb-9 flex flex-wrap items-start justify-between gap-4">
          <div>
            {title && <h1 className="m-0 text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-ink-900">{title}</h1>}
            {subtitle && <p className="mt-1.5 text-[15px] text-ink-500">{subtitle}</p>}
          </div>
          {action && <div className="flex flex-wrap items-center gap-3">{action}</div>}
        </div>
      )}
      {children}
      <footer className="mt-10 text-center text-[12px] text-ink-400">
        Gestión Extracción y Fletes — Formato 2026
      </footer>
    </div>
  );
}
