export default function PageLayout({ title, subtitle, action, children, ancho }) {
  // Algunas pantallas (el formulario de Fletes, con una vista previa ancha
  // de 19cm) necesitan todo el ancho disponible en vez del máximo de
  // siempre, para que la vista previa no quede cortada.
  const anchoClase = ancho === 'completo' ? 'max-w-none' : 'max-w-[1200px]';
  return (
    <div className={`mx-auto ${anchoClase} px-5 pb-16 pt-6 sm:px-7 lg:px-9`}>
      {(title || action) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h1 className="m-0 text-2xl font-bold text-ink-900">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
      <footer className="mt-10 text-center text-[12px] text-ink-400">
        Forestal Tezains — Formato oficial 2026
      </footer>
    </div>
  );
}
