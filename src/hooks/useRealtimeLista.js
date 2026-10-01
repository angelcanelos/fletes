import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient.js';

// Se suscribe a los cambios (insert/update/delete) de una tabla de
// Supabase en tiempo real y llama a "onCambio" cada vez que algo cambia
// —en esta compu o en cualquier otra sesión abierta—, para que las
// pantallas de lista (Dashboard, FletesDashboard, Inicio) se refresquen
// solas, sin que nadie tenga que recargar la página.
//
// onCambio se guarda en un ref para siempre llamar a la versión más
// reciente (por ejemplo la que ya "ve" los filtros actuales) sin tener
// que cerrar y volver a abrir la suscripción cada vez que cambian.
export default function useRealtimeLista(tabla, onCambio) {
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;

  useEffect(() => {
    const canal = supabase
      .channel(`realtime:${tabla}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        onCambioRef.current();
      })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [tabla]);
}
