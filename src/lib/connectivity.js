import { supabase } from './supabaseClient.js';

// "navigator.onLine" solo dice si hay una tarjeta de red conectada, no si
// en verdad hay internet ni si Supabase responde — por eso se combina con
// un ping real a Supabase cada cierto tiempo. Cualquier parte de la app
// puede suscribirse a los cambios de estado (por ejemplo el indicador en
// el sidebar, o el motor de sincronización).

const TIEMPO_LIMITE_MS = 6000; // más de esto sin respuesta y se cae al modo local
const TIEMPO_LENTO_MS = 1500; // el ping responde, pero tarda más de esto: "conexión lenta"

let enLinea = typeof navigator === 'undefined' ? true : navigator.onLine;
let lenta = false;
const listeners = new Set();
const listenersLenta = new Set();

function avisar() {
  for (const fn of listeners) fn(enLinea);
}

function avisarLenta() {
  for (const fn of listenersLenta) fn(lenta);
}

function fijarEstado(nuevo) {
  if (nuevo === enLinea) return;
  enLinea = nuevo;
  avisar();
}

// Cualquier lugar que note que una operación se sintió lenta (el ping, o
// una llamada real de la API que tuvo que abortarse por tardar demasiado)
// puede marcarlo aquí. Si de verdad no hay conexión, el siguiente ping lo
// va a detectar como "offline" en vez de "lenta" — son dos cosas
// distintas: lenta = hay internet pero va mal; offline = no hay nada.
export function marcarLenta(nuevo) {
  if (nuevo === lenta) return;
  lenta = nuevo;
  avisarLenta();
}

export function estaLenta() {
  return lenta;
}

export function alCambiarLenta(fn) {
  listenersLenta.add(fn);
  return () => listenersLenta.delete(fn);
}

// Corre una consulta de Supabase con un límite de tiempo: si no responde
// a tiempo, se aborta de verdad (AbortController) para que esa petición
// nunca llegue a completarse del lado del servidor más tarde — así no hay
// riesgo de duplicar nada cuando, por ejemplo, un "crear" lento se cae a
// la cola local y luego se reintenta. Quien llama a esto trata el error
// de aborto igual que cualquier otra falla de red (ver esFalloDeRed).
export function conLimiteDeTiempo(builder, ms = TIEMPO_LIMITE_MS) {
  const controlador = new AbortController();
  const cronometro = setTimeout(() => controlador.abort(), ms);
  return builder.abortSignal(controlador.signal).then(
    (resultado) => { clearTimeout(cronometro); return resultado; },
    (error) => { clearTimeout(cronometro); throw error; }
  );
}

async function ping() {
  const inicio = Date.now();
  try {
    const { error } = await conLimiteDeTiempo(supabase.from('settings').select('clave').limit(1), 4000);
    fijarEstado(!error);
    if (!error) marcarLenta(Date.now() - inicio > TIEMPO_LENTO_MS);
  } catch {
    fijarEstado(false);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { ping(); });
  window.addEventListener('offline', () => fijarEstado(false));
  // Ping periódico: detecta tanto "se cayó internet sin avisar" como "ya
  // volvió" aunque el evento 'online' del navegador no dispare a tiempo.
  setInterval(ping, 15000);
  ping();
}

export function estaEnLinea() {
  return enLinea;
}

// Marca el estado como offline de inmediato cuando una llamada real a
// Supabase falla por red (más confiable que esperar al siguiente ping).
export function reportarFalloDeRed() {
  fijarEstado(false);
}

export function reportarExitoDeRed() {
  fijarEstado(true);
  marcarLenta(false);
}

export function alCambiarConexion(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function forzarPing() {
  return ping();
}

// Supabase-js no arroja excepción cuando falla la red: regresa
// { error: { message: 'Failed to fetch', ... } }, con la misma forma que
// un error real de la base (RLS, validación, etc). Se distinguen por el
// texto del mensaje — esto lo usan tanto api.js como syncEngine.js para
// decidir "esto hay que ponerlo en cola" vs "esto hay que mostrárselo al
// usuario tal cual". Un abort por conLimiteDeTiempo (conexión lenta que
// nunca contestó) cuenta igual que una falla de red.
export function esFalloDeRed(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (err && err.name === 'AbortError') return true;
  const msg = (err && err.message) || String(err || '');
  return /fetch|network|NetworkError|Load failed|ERR_|abort/i.test(msg);
}
