import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '@heroui/react';
import { House, Pickaxe, Truck, Settings, Menu, X, LogOut, FileText, CircleUserRound } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import SyncStatus from './SyncStatus.jsx';

const items = [
  { to: '/inicio', label: 'Inicio', icon: House, end: true },
  { to: '/extraccion', label: 'Extracción', icon: Pickaxe },
  { to: '/fletes', label: 'Fletes', icon: Truck },
  { to: '/formatos', label: 'Formatos', icon: FileText },
  { to: '/ajustes', label: 'Ajustes', icon: Settings }
];

function Marca({ chica }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/images/logo-tezains.png"
        alt=""
        className={`flex-none object-contain ${chica ? 'h-9 w-9' : 'h-11 w-11'}`}
      />
      <div className="min-w-0">
        <div className="truncate text-[17px] font-semibold leading-tight text-ink-900">Gestión</div>
        <div className="text-[12px] leading-tight text-ink-500">Extracción y Fletes</div>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1.5 px-4">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] transition-colors ${
              isActive
                ? 'bg-brand-50 font-medium text-brand-700'
                : 'text-ink-600 hover:bg-surface-muted hover:text-ink-900'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-[19px] w-[19px] flex-none" strokeWidth={1.9} />
              <span className="flex-1">{label}</span>
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function TarjetaCuenta({ usuario, cerrarSesion }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-[#8b5cf6] p-5 text-white shadow-boton">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/80">
        <CircleUserRound className="h-3.5 w-3.5" strokeWidth={2.25} /> Cuenta
      </div>
      <div className="mb-4 truncate text-[14.5px]" title={usuario.email}>{usuario.email}</div>
      <button
        type="button"
        onClick={cerrarSesion}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-white/20"
      >
        <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} /> Cerrar sesión
      </button>
    </div>
  );
}

export default function Sidebar() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, cerrarSesion } = useAuth();

  return (
    <>
      {/* Barra superior solo en móvil/tablet: abre el sidebar como overlay */}
      <div className="no-imprimir sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-surface-border bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Marca chica />
        <Button
          isIconOnly
          variant="light"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onPress={() => setAbierto((v) => !v)}
          className="text-ink-600"
        >
          {abierto ? <X className="h-5 w-5" strokeWidth={2.25} /> : <Menu className="h-5 w-5" strokeWidth={2.25} />}
        </Button>
      </div>

      {/* Overlay móvil */}
      {abierto && (
        <div
          className="no-imprimir fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm animate-overlay-in lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      <aside
        className={`no-imprimir fixed inset-y-0 left-0 z-50 flex w-[284px] flex-none flex-col border-r border-surface-border bg-white py-6 transition-transform lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-9 px-7">
          <Marca />
        </div>

        <NavItems onNavigate={() => setAbierto(false)} />

        <div className="mt-auto flex flex-col gap-3 px-5 pt-4">
          <SyncStatus />
          {usuario && <TarjetaCuenta usuario={usuario} cerrarSesion={cerrarSesion} />}
        </div>
      </aside>
    </>
  );
}
