import { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw, Snail } from 'lucide-react';
import { alCambiarConexion, estaEnLinea, alCambiarLenta, estaLenta } from '../lib/connectivity.js';
import { alCambiarSync, contarPendientes, sincronizarAhora } from '../lib/syncEngine.js';
import { useToast } from './Toast.jsx';

// Igual que Discord cuando pierde conexión: un aviso chico y claro de que
// se sigue pudiendo trabajar, más un contador de lo que falta por subir.
// "Lenta" es un estado aparte de "sin conexión": hay internet pero
// Supabase está tardando, así que la app ya se cayó sola al espejo local
// para esa operación en vez de quedarse cargando para siempre.
export default function SyncStatus() {
  const [enLinea, setEnLinea] = useState(estaEnLinea());
  const [lenta, setLenta] = useState(estaLenta());
  const [sincronizando, setSincronizando] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const toast = useToast();
  const avisoLentaMostrado = useRef(false);

  useEffect(() => {
    const quitar1 = alCambiarConexion(setEnLinea);
    const quitar2 = alCambiarSync(({ sincronizando }) => setSincronizando(sincronizando));
    const quitar3 = alCambiarLenta((v) => {
      setLenta(v);
      if (v && !avisoLentaMostrado.current) {
        avisoLentaMostrado.current = true;
        toast.info('Tu conexión a internet está lenta. Puedes seguir trabajando normal: se guarda aquí mismo y se sincroniza solo en cuanto mejore.');
      }
      if (!v) avisoLentaMostrado.current = false;
    });
    let activo = true;
    async function refrescarConteo() {
      const n = await contarPendientes();
      if (activo) setPendientes(n);
    }
    refrescarConteo();
    const intervalo = setInterval(refrescarConteo, 4000);
    return () => { activo = false; quitar1(); quitar2(); quitar3(); clearInterval(intervalo); };
  }, [toast]);

  if (enLinea && !lenta && pendientes === 0 && !sincronizando) return null;

  if (!enLinea) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-warning-bg/10 px-3 py-2 text-[11.5px] font-semibold text-warning">
        <WifiOff className="h-3.5 w-3.5 flex-none" strokeWidth={2.25} />
        <span className="min-w-0 flex-1">
          Sin conexión — se sigue guardando aquí{pendientes > 0 ? ` (${pendientes} pendiente${pendientes === 1 ? '' : 's'})` : ''}.
        </span>
      </div>
    );
  }

  if (lenta) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-warning-bg/10 px-3 py-2 text-[11.5px] font-semibold text-warning">
        <Snail className="h-3.5 w-3.5 flex-none" strokeWidth={2.25} />
        <span className="min-w-0 flex-1">
          Conexión lenta — se sigue guardando aquí{pendientes > 0 ? ` (${pendientes} pendiente${pendientes === 1 ? '' : 's'})` : ''}.
        </span>
      </div>
    );
  }

  if (sincronizando || pendientes > 0) {
    return (
      <button
        type="button"
        onClick={() => sincronizarAhora()}
        className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[11.5px] font-semibold text-ink-300 transition-colors hover:bg-white/10"
      >
        <RefreshCw className={`h-3.5 w-3.5 flex-none ${sincronizando ? 'animate-spin' : ''}`} strokeWidth={2.25} />
        <span className="min-w-0 flex-1 text-left">
          {sincronizando ? 'Sincronizando…' : `${pendientes} cambio${pendientes === 1 ? '' : 's'} por subir`}
        </span>
      </button>
    );
  }

  return null;
}
