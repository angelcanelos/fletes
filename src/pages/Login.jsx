import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Input, Button } from '@heroui/react';
import { LogIn, TriangleAlert, ArrowLeft, Loader2, WifiOff } from 'lucide-react';
import { alCambiarConexion, estaEnLinea } from '../lib/connectivity.js';
import { tieneAccesoOffline } from '../lib/accesoOffline.js';
import { useAuth } from '../lib/AuthContext.jsx';

// Solo se recuerda el correo (nunca la contraseña) para que la próxima
// vez solo haga falta teclear la contraseña — igual en la versión web
// que en la de escritorio, porque ambas usan el mismo localStorage del
// navegador/Electron.
const CORREO_GUARDADO_KEY = 'ft_ultimo_correo';

export default function Login() {
  const { autenticado, cargando, iniciarSesion, restablecerContrasena } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(CORREO_GUARDADO_KEY) || ''; } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const passwordRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [modo, setModo] = useState('login'); // 'login' | 'restablecer'
  const [avisoRestablecer, setAvisoRestablecer] = useState('');
  const [enLinea, setEnLinea] = useState(() => estaEnLinea() && (typeof navigator === 'undefined' || navigator.onLine));
  useEffect(() => alCambiarConexion(setEnLinea), []);

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <Loader2 className="h-6 w-6 animate-spin text-ink-400" strokeWidth={2.25} />
      </div>
    );
  }

  if (autenticado) {
    const destino = location.state?.from || '/inicio';
    return <Navigate to={destino} replace />;
  }

  async function enviarLogin(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await iniciarSesion(email.trim(), password);
      try { localStorage.setItem(CORREO_GUARDADO_KEY, email.trim()); } catch { /* localStorage no disponible */ }
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setEnviando(false);
    }
  }

  async function enviarRestablecer(e) {
    e.preventDefault();
    setError('');
    setAvisoRestablecer('');
    setEnviando(true);
    try {
      await restablecerContrasena(email.trim());
      setAvisoRestablecer('Si ese correo tiene una cuenta, te enviamos un enlace para restablecer la contraseña.');
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
          <img
            src="/images/LogoFletes.png"
            alt=""
            className="h-14 w-14 rounded-xl object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <div className="text-lg font-bold text-white">Forestal Tezains</div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-400">Extracción &amp; Fletes</div>
          </div>
        </div>

        <div className="rounded-panel bg-white p-6 shadow-popover">
          {modo === 'login' ? (
            <form onSubmit={enviarLogin}>
              <h1 className="m-0 mb-1 text-lg font-bold text-ink-900">Iniciar sesión</h1>
              <p className="mb-5 text-sm text-ink-500">Entra con tu correo y contraseña para continuar.</p>

              {!enLinea && !error && (
                <div className="mb-4 flex items-start gap-2 rounded-[10px] bg-warning-bg px-3.5 py-2.5 text-sm text-warning">
                  <WifiOff className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2.25} />
                  <span>
                    Sin internet.{' '}
                    {tieneAccesoOffline(email)
                      ? 'Puedes entrar con tu contraseña de siempre y trabajar sin conexión.'
                      : 'Solo se puede entrar sin conexión con un correo que ya haya iniciado sesión antes en esta computadora.'}
                  </span>
                </div>
              )}
              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-[10px] bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2.25} />
                  <span>{error}</span>
                </div>
              )}

              <Input
                id="login-email"
                label="Correo"
                type="email"
                autoComplete="username"
                isRequired
                variant="bordered"
                className="mb-3.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                ref={passwordRef}
                id="login-password"
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                autoFocus={Boolean(email)}
                isRequired
                variant="bordered"
                className="mb-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="mb-4 text-xs font-semibold text-brand-600 hover:text-brand-700"
                onClick={() => { setModo('restablecer'); setError(''); }}
              >
                ¿Olvidaste tu contraseña?
              </button>

              <Button type="submit" color="primary" fullWidth isLoading={enviando} startContent={!enviando && <LogIn className="h-4 w-4" strokeWidth={2.5} />}>
                Entrar
              </Button>

              <p className="mt-4 text-center text-xs text-ink-400">
                ¿No tienes cuenta? Pídele al administrador que te invite desde el panel de Supabase.
              </p>
            </form>
          ) : (
            <form onSubmit={enviarRestablecer}>
              <button
                type="button"
                className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-700"
                onClick={() => { setModo('login'); setError(''); setAvisoRestablecer(''); }}
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Volver a iniciar sesión
              </button>
              <h1 className="m-0 mb-1 text-lg font-bold text-ink-900">Restablecer contraseña</h1>
              <p className="mb-5 text-sm text-ink-500">Te mandamos un enlace a tu correo para elegir una nueva.</p>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-[10px] bg-danger-bg px-3.5 py-2.5 text-sm text-danger">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2.25} />
                  <span>{error}</span>
                </div>
              )}
              {avisoRestablecer && (
                <div className="mb-4 rounded-[10px] bg-success-bg px-3.5 py-2.5 text-sm text-success">
                  {avisoRestablecer}
                </div>
              )}

              <Input
                id="reset-email"
                label="Correo"
                type="email"
                autoComplete="username"
                isRequired
                variant="bordered"
                className="mb-4"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button type="submit" color="primary" fullWidth isLoading={enviando}>
                Enviar enlace
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function traducirError(err) {
  const msg = (err && err.message) || '';
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('Email not confirmed')) return 'Falta confirmar el correo. Revisa tu bandeja de entrada.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Sin conexión a internet. Revisa la red e intenta de nuevo.';
  return msg || 'No se pudo completar la acción. Intenta de nuevo.';
}
