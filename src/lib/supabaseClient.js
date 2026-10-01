import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y llena los valores de tu proyecto de Supabase.'
  );
}

// Un solo cliente para toda la app: autenticación, lecturas/escrituras y
// las suscripciones en tiempo real (Supabase Realtime) usan esta misma
// instancia. La sesión se guarda sola en localStorage y se refresca sola.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
