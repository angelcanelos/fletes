import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { alCambiarConexion, estaEnLinea } from './connectivity.js';
import {
  fijarSesionRemota, leerSesionGuardadaSupabase, guardarVerificador, verificarOffline, tieneAccesoOffline,
  leerSesionOffline, guardarSesionOffline, borrarSesionOffline, esErrorDeRedAuth, borrarSesionGuardadaSupabase
} from './accesoOffline.js';

const AuthContext = createContext(null);

// Sin internet, getSession() puede tardar mientras Supabase reintenta
// renovar el token; no se deja a la persona esperando: pasado este
// tiempo se decide con lo que haya guardado en la computadora.
const ESPERA_SESION_MS = 2500;
const ESPERA_LOGIN_MS = 6000;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = aún no se sabe, null = sin sesión
  // Acceso sin conexión: { usuario } cuando se entró sin internet (con la
  // sesión guardada o con la huella de la contraseña).
  const [offline, setOffline] = useState(null);
  const [cargando, setCargando] = useState(true);
  // La contraseña tecleada en un login sin internet se guarda SOLO en
  // memoria, para reconectar sola en cuanto vuelva la conexión.
  const passwordMemoria = useRef(null);
  const reconectando = useRef(false);

  useEffect(() => {
    let vivo = true;

    function aplicarSesion(s) {
      setSession(s);
      fijarSesionRemota(Boolean(s));
      if (s) {
        setOffline(null);
        borrarSesionOffline();
        passwordMemoria.current = null;
      }
    }

    function accesoLocal() {
      // 1) Supabase dejó la sesión guardada (solo venció el token por falta
      //    de internet): se entra con ella y se renueva al reconectar.
      const guardada = leerSesionGuardadaSupabase();
      if (guardada) return { usuario: { id: guardada.user.id, email: guardada.user.email }, origen: 'sesion' };
      // 2) Ya se había entrado sin internet (con la contraseña) y se cerró la app.
      const off = leerSesionOffline();
      if (off && off.usuario) return { usuario: off.usuario, origen: 'contrasena' };
      return null;
    }

    const limite = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, tiempoAgotado: true }), ESPERA_SESION_MS));
    Promise.race([supabase.auth.getSession(), limite]).then(({ data }) => {
      if (!vivo) return;
      if (data && data.session) aplicarSesion(data.session);
      else {
        setSession(null);
        fijarSesionRemota(false);
        setOffline(accesoLocal());
      }
      setCargando(false);
    }).catch(() => {
      if (!vivo) return;
      setSession(null);
      setOffline(accesoLocal());
      setCargando(false);
    });

    // Se actualiza sola cuando el usuario inicia/cierra sesión o cuando el
    // token se refresca (también al volver internet).
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      if (!vivo) return;
      if (nuevaSesion) aplicarSesion(nuevaSesion);
      else {
        setSession(null);
        fijarSesionRemota(false);
      }
    });

    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  // Al volver internet estando en modo sin conexión: se intenta recuperar
  // la sesión real para poder sincronizar.
  useEffect(() => {
    async function intentar() {
      if (!estaEnLinea() || reconectando.current) return;
      const { data } = await supabase.auth.getSession().catch(() => ({ data: {} }));
      if (data && data.session) return; // onAuthStateChange ya la aplica
      if (offline && passwordMemoria.current && offline.usuario && offline.usuario.email) {
        reconectando.current = true;
        try {
          await supabase.auth.signInWithPassword({ email: offline.usuario.email, password: passwordMemoria.current });
        } catch { /* se reintenta en el próximo cambio de conexión */ } finally {
          reconectando.current = false;
        }
      }
    }
    if (!offline) return undefined;
    intentar();
    return alCambiarConexion((enLinea) => { if (enLinea) intentar(); });
  }, [offline]);

  async function iniciarSesion(email, password) {
    // Si ya se sabe que no hay internet, ni se intenta la red (evita
    // esperar varios segundos a que falle); si parece haber pero Supabase
    // no contesta, se deja de esperar a los pocos segundos.
    const sinRed = !estaEnLinea() || (typeof navigator !== 'undefined' && navigator.onLine === false);
    const fallaDeRed = (motivo) => ({ data: null, error: { name: 'AuthRetryableFetchError', message: motivo } });
    const { data, error } = sinRed
      ? fallaDeRed('offline')
      : await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise((resolve) => setTimeout(() => resolve(fallaDeRed('timeout')), ESPERA_LOGIN_MS))
      ]);
    if (!error) {
      // Deja lista esta computadora para poder entrar sin internet después.
      guardarVerificador(email, password, data && data.user).catch(() => {});
      return { offline: false };
    }
    if (!esErrorDeRedAuth(error)) throw error;

    // Sin internet: se compara con la huella guardada en esta computadora.
    const usuario = await verificarOffline(email, password);
    if (usuario) {
      passwordMemoria.current = password;
      guardarSesionOffline(usuario);
      setOffline({ usuario, origen: 'contrasena' });
      return { offline: true };
    }
    if (tieneAccesoOffline(email)) throw new Error('Contraseña incorrecta.');
    throw new Error('No hay internet y esta computadora todavía no tiene guardado el acceso de este correo. Entra una vez con internet y a partir de ahí podrás entrar también sin conexión.');
  }

  // Desde el aviso "vuelve a escribir tu contraseña para sincronizar".
  async function reconectar(password) {
    const email = (offline && offline.usuario && offline.usuario.email) || '';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    guardarVerificador(email, password, data && data.user).catch(() => {});
  }

  async function cerrarSesion() {
    // Sin internet solo se puede cerrar la sesión en esta computadora.
    await supabase.auth.signOut({ scope: estaEnLinea() ? 'global' : 'local' }).catch(() => {});
    if (leerSesionGuardadaSupabase()) borrarSesionGuardadaSupabase();
    passwordMemoria.current = null;
    borrarSesionOffline();
    setOffline(null);
    setSession(null);
    fijarSesionRemota(false);
  }

  async function restablecerContrasena(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    });
    if (error) throw error;
  }

  const modoOffline = !session && Boolean(offline);
  const value = {
    session,
    usuario: session ? session.user : offline ? offline.usuario : null,
    cargando,
    autenticado: Boolean(session) || Boolean(offline),
    modoOffline,
    origenOffline: offline ? offline.origen : null,
    iniciarSesion,
    reconectar,
    cerrarSesion,
    restablecerContrasena
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
