import { useEffect, useState } from 'react';
import { Button, Input } from '@heroui/react';
import { CloudOff, KeyRound } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import { alCambiarConexion, estaEnLinea } from '../lib/connectivity.js';
import { useToast } from './Toast.jsx';

// Barra superior del modo sin conexión:
// - Sin internet: avisa que se trabaja con los datos de esta computadora.
// - Ya hay internet pero no se pudo recuperar la sesión sola (por ejemplo
//   se cerró la app mientras estaba sin conexión): pide la contraseña para
//   reconectar y subir lo pendiente.
export default function AvisoSesion() {
  const { modoOffline, usuario, reconectar } = useAuth();
  const [enLinea, setEnLinea] = useState(estaEnLinea());
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [mostrarPedir, setMostrarPedir] = useState(false);
  const toast = useToast();

  useEffect(() => alCambiarConexion(setEnLinea), []);

  // Se da unos segundos para que la sesión se recupere sola antes de
  // pedir la contraseña.
  useEffect(() => {
    if (!modoOffline || !enLinea) { setMostrarPedir(false); return undefined; }
    const t = setTimeout(() => setMostrarPedir(true), 6000);
    return () => clearTimeout(t);
  }, [modoOffline, enLinea]);

  if (!modoOffline) return null;

  if (!enLinea || !mostrarPedir) {
    return (
      <div className="no-imprimir flex items-center gap-2.5 border-b border-warning/20 bg-warning-bg px-5 py-2 text-[13px] text-warning">
        <CloudOff className="h-4 w-4 flex-none" strokeWidth={2.25} />
        <span>
          <b>Modo sin conexión.</b> Trabajando con los datos guardados en esta computadora; lo que guardes se sube solo al volver internet.
        </span>
      </div>
    );
  }

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await reconectar(password);
      setPassword('');
      toast.exito('Conectado. Subiendo los cambios pendientes…');
    } catch (err) {
      setError(/Invalid login/i.test(err.message || '') ? 'Contraseña incorrecta.' : err.message || 'No se pudo conectar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="no-imprimir flex flex-wrap items-center gap-3 border-b border-warning/20 bg-warning-bg px-5 py-2.5 text-[13px] text-warning">
      <KeyRound className="h-4 w-4 flex-none" strokeWidth={2.25} />
      <span className="min-w-[220px] flex-1">
        <b>Ya hay internet.</b> Escribe tu contraseña ({usuario && usuario.email}) para sincronizar lo que guardaste sin conexión.
      </span>
      <Input
        type="password"
        size="sm"
        variant="bordered"
        aria-label="Contraseña"
        placeholder="Contraseña"
        value={password}
        onValueChange={setPassword}
        className="w-48"
        classNames={{ inputWrapper: 'bg-white' }}
        autoComplete="current-password"
      />
      <Button type="submit" size="sm" color="primary" isLoading={enviando} isDisabled={!password}>Conectar</Button>
      {error && <span className="w-full text-danger">{error}</span>}
    </form>
  );
}
