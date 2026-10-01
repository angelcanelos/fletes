import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '@heroui/react';
import { LayoutGrid, Trees, Truck, Settings, Menu, X, LogOut, PenTool } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import SyncStatus from './SyncStatus.jsx';

const items = [
  { to: '/inicio', label: 'Inicio', icon: LayoutGrid, end: true },
  { to: '/extraccion', label: 'Extracción', icon: Trees },
  { to: '/fletes', label: 'Fletes', icon: Truck },
  { to: '/formatos', label: 'Formatos', icon: PenTool },
  { to: '/ajustes', label: 'Ajustes', icon: Settings }
];

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-600 text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]'
                : 'text-ink-200 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Icon className="h-[18px] w-[18px] flex-none" strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, cerrarSesion } = useAuth();

  return (
    <>
      {/* Barra superior solo en móvil/tablet: abre el sidebar como overlay */}
      <div className="no-imprimir sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-900 px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2.5">
          <img src="/images/LogoFletes.png" alt="" className="h-8 w-8 flex-none rounded-lg object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <span className="text-[15px] font-bold">Forestal Tezains</span>
        </div>
        <Button
          isIconOnly
          variant="light"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onPress={() => setAbierto((v) => !v)}
          className="text-ink-200 hover:text-white"
        >
          {abierto ? <X className="h-5 w-5" strokeWidth={2.25} /> : <Menu className="h-5 w-5" strokeWidth={2.25} />}
        </Button>
      </div>

      {/* Overlay móvil */}
      {abierto && (
        <div
          className="no-imprimir fixed inset-0 z-40 bg-black/40 animate-overlay-in lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      <aside
        className={`no-imprimir fixed inset-y-0 left-0 z-50 flex w-[248px] flex-none flex-col border-r border-ink-800 bg-ink-900 py-5 transition-transform lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 hidden items-center gap-2.5 px-5 lg:flex">
          <img src="/images/LogoFletes.png" alt="" className="h-9 w-9 flex-none rounded-lg object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold leading-tight text-white">Forestal Tezains</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Extracción &amp; Fletes</div>
          </div>
        </div>

        <NavItems onNavigate={() => setAbierto(false)} />

        <div className="mt-auto flex flex-col gap-3 px-3 pt-4">
          <SyncStatus />
        </div>
        <div className="flex flex-col gap-3 px-5 pt-2">
          {usuario && (
            <div className="flex items-center justify-between gap-2 border-t border-ink-800 pt-3">
              <span className="min-w-0 truncate text-[12px] text-ink-400" title={usuario.email}>{usuario.email}</span>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                onPress={cerrarSesion}
                className="flex-none text-ink-400 hover:text-white"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.1} />
              </Button>
            </div>
          )}
          <div className="text-[11px] leading-relaxed text-ink-500">Formato oficial 2026</div>
        </div>
      </aside>
    </>
  );
}
