// Acceso sin internet.
//
// 1) Sesión guardada: Supabase guarda la sesión en localStorage, pero su
//    token de acceso vence cada hora. Si la app se abre sin internet, no
//    puede renovarlo y responde "sin sesión" — aunque la sesión (y su
//    token de renovación) sigue guardada. Aquí se lee esa sesión guardada
//    para dejar entrar igual; al volver internet Supabase la renueva sola.
//
// 2) Login sin internet: cada vez que alguien inicia sesión CON internet,
//    se guarda en esta computadora una huella de su contraseña (PBKDF2 con
//    sal aleatoria; nunca la contraseña). Sin internet, el login compara
//    contra esa huella. Solo funciona en computadoras donde esa persona ya
//    entró al menos una vez con internet.
//
// Además lleva la cuenta de si hay una sesión REAL de Supabase: sin ella
// no tiene sentido consultar ni subir nada (las reglas de seguridad de la
// base devolverían listas vacías o rechazarían los cambios), así que la
// app trabaja con el espejo local hasta que la haya.


const CLAVE_VERIFICADORES = 'ft_acceso_offline_v1';
const CLAVE_SESION_OFFLINE = 'ft_sesion_offline_v1';
const ITERACIONES = 210000;

// ---------- Sesión remota (Supabase) ----------

let sesionRemota = false;
const listeners = new Set();

export function haySesionRemota() {
  return sesionRemota;
}

export function fijarSesionRemota(valor) {
  const nuevo = Boolean(valor);
  if (nuevo === sesionRemota) return;
  sesionRemota = nuevo;
  for (const fn of listeners) fn(nuevo);
}

export function alCambiarSesionRemota(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function claveSesionSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
}

// Sin internet, supabase.auth.signOut() intenta renovar el token antes de
// cerrar, falla y NO borra la sesión guardada: se borra aquí para que
// "Cerrar sesión" de verdad cierre en esta computadora.
export function borrarSesionGuardadaSupabase() {
  try { localStorage.removeItem(claveSesionSupabase()); } catch { /* nada */ }
}

// La sesión que Supabase dejó guardada (aunque su token ya haya vencido).
export function leerSesionGuardadaSupabase() {
  try {
    const crudo = localStorage.getItem(claveSesionSupabase());
    if (!crudo) return null;
    const s = JSON.parse(crudo);
    const sesion = s && s.currentSession ? s.currentSession : s;
    if (sesion && sesion.user && sesion.refresh_token) return sesion;
  } catch { /* sin localStorage o dato corrupto */ }
  return null;
}

// ---------- Huellas de contraseña ----------

function aBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function deBase64(texto) {
  return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
}

async function derivar(password, sal, iteraciones) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, material, 256);
  return aBase64(bits);
}

function leerVerificadores() {
  try { return JSON.parse(localStorage.getItem(CLAVE_VERIFICADORES) || '{}') || {}; } catch { return {}; }
}

function normalizarCorreo(email) {
  return String(email || '').trim().toLowerCase();
}

export async function guardarVerificador(email, password, usuario) {
  if (!crypto || !crypto.subtle) return;
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(password, sal, ITERACIONES);
  const todos = leerVerificadores();
  todos[normalizarCorreo(email)] = {
    sal: aBase64(sal),
    hash,
    iteraciones: ITERACIONES,
    usuario: usuario ? { id: usuario.id, email: usuario.email } : { email: normalizarCorreo(email) },
    actualizado: new Date().toISOString()
  };
  try { localStorage.setItem(CLAVE_VERIFICADORES, JSON.stringify(todos)); } catch { /* sin espacio */ }
}

export function tieneAccesoOffline(email) {
  return Boolean(leerVerificadores()[normalizarCorreo(email)]);
}

// Devuelve el usuario si la contraseña coincide con la huella guardada.
export async function verificarOffline(email, password) {
  const v = leerVerificadores()[normalizarCorreo(email)];
  if (!v || !crypto || !crypto.subtle) return null;
  const hash = await derivar(password, deBase64(v.sal), v.iteraciones || ITERACIONES);
  // Comparación de longitud fija (evita atajos por tiempo).
  let distinto = hash.length ^ v.hash.length;
  for (let i = 0; i < Math.min(hash.length, v.hash.length); i++) distinto |= hash.charCodeAt(i) ^ v.hash.charCodeAt(i);
  return distinto === 0 ? v.usuario : null;
}

// ---------- Sesión sin conexión (sobrevive a cerrar la app) ----------

export function leerSesionOffline() {
  try { return JSON.parse(localStorage.getItem(CLAVE_SESION_OFFLINE) || 'null'); } catch { return null; }
}

export function guardarSesionOffline(usuario) {
  try { localStorage.setItem(CLAVE_SESION_OFFLINE, JSON.stringify({ usuario, desde: new Date().toISOString() })); } catch { /* sin espacio */ }
}

export function borrarSesionOffline() {
  try { localStorage.removeItem(CLAVE_SESION_OFFLINE); } catch { /* nada */ }
}

// ¿Una falla de login fue por no tener internet (y no por contraseña mala)?
export function esErrorDeRedAuth(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = err ? `${err.name || ''} ${err.message || ''}` : '';
  return /fetch|network|NetworkError|Load failed|AuthRetryableFetchError|ERR_|timeout|abort/i.test(msg) || (err && err.status === 0);
}

