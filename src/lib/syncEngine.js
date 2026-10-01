// Motor de sincronización: cuando vuelve la conexión, sube en orden todo
// lo que se guardó en la "bandeja de salida" (outbox) mientras estaba
// offline, y reconcilia el espejo local con lo que Supabase confirme
// (por ejemplo, un formato creado sin internet tiene un id temporal
// hasta que Supabase le asigna el id real).

import { supabase } from './supabaseClient.js';
import { localDb } from './localDb.js';
import { alCambiarConexion, estaEnLinea, reportarExitoDeRed, reportarFalloDeRed, esFalloDeRed, conLimiteDeTiempo, marcarLenta } from './connectivity.js';
import { generarFolioFormato, generarFolioFlete } from './folios.js';
import { haySesionRemota, alCambiarSesionRemota } from './accesoOffline.js';

let sincronizando = false;
const listeners = new Set();

function avisar() {
  for (const fn of listeners) fn({ sincronizando });
}

export function alCambiarSync(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function contarPendientes() {
  return localDb.outbox.count();
}

export function estaSincronizando() {
  return sincronizando;
}

// Cuando algo creado offline (id temporal, negativo) por fin se sube,
// hay que "renombrarlo" en el espejo local y en cualquier otro pendiente
// del outbox que todavía lo referenciara (por ejemplo, si se editó dos
// veces antes de recuperar internet).
async function reemplazarIdTemporal(entidad, tempId, filaReal) {
  const tabla = localDb.table(entidad);
  await tabla.delete(tempId);
  await tabla.put(filaReal);

  const pendientes = await localDb.outbox.where({ entidad, entidadId: tempId }).toArray();
  for (const p of pendientes) {
    await localDb.outbox.update(p.id, { entidadId: filaReal.id });
  }
}

async function aplicar(item) {
  const { entidad, accion, entidadId, payload } = item;

  if (accion === 'upsert_settings') {
    const { error } = await conLimiteDeTiempo(supabase.from('settings').upsert(payload, { onConflict: 'clave' }));
    if (error) throw new Error(error.message);
    for (const fila of payload) await localDb.settings.put(fila);
    return;
  }

  const tabla = entidad; // 'formatos' | 'fletes'

  if (accion === 'crear') {
    const insertado = await conLimiteDeTiempo(supabase.from(tabla).insert(payload).select().single());
    if (insertado.error) throw new Error(insertado.error.message);
    const folio = tabla === 'formatos'
      ? generarFolioFormato(insertado.data.id, insertado.data.fecha)
      : generarFolioFlete(insertado.data.id, insertado.data.fecha);
    const actualizado = await conLimiteDeTiempo(supabase.from(tabla).update({ folio }).eq('id', insertado.data.id).select().single());
    if (actualizado.error) throw new Error(actualizado.error.message);
    await reemplazarIdTemporal(entidad, entidadId, actualizado.data);
  } else if (accion === 'actualizar') {
    // Un registro creado offline y editado offline antes de sincronizar
    // todavía tiene id temporal (negativo): no existe en Supabase, así
    // que no hay nada que actualizar ahí todavía — sus cambios ya están
    // en el "crear" que se procesa primero (mismo orden del outbox), así
    // que este "actualizar" se puede descartar sin perder nada.
    if (entidadId < 0) return;
    const { data, error } = await conLimiteDeTiempo(supabase.from(tabla).update(payload).eq('id', entidadId).select().maybeSingle());
    if (error) throw new Error(error.message);
    if (data) await localDb.table(entidad).put(data);
  } else if (accion === 'eliminar') {
    if (entidadId < 0) {
      await localDb.table(entidad).delete(entidadId);
      return;
    }
    const { error } = await conLimiteDeTiempo(supabase.from(tabla).delete().eq('id', entidadId));
    if (error) throw new Error(error.message);
    await localDb.table(entidad).delete(entidadId);
  }
}

export async function sincronizarAhora() {
  // Sin sesión real de Supabase (se entró sin internet y aún no se
  // reconecta) no se sube nada: la cola espera intacta.
  if (sincronizando || !estaEnLinea() || !haySesionRemota()) return;
  sincronizando = true;
  avisar();
  try {
    for (;;) {
      const item = await localDb.outbox.orderBy('id').first();
      if (!item) break;
      try {
        await aplicar(item);
        await localDb.outbox.delete(item.id);
        reportarExitoDeRed();
      } catch (err) {
        if (esFalloDeRed(err)) {
          const msg = (err && err.message) || String(err || '');
          if (/abort/i.test(msg)) marcarLenta(true); else reportarFalloDeRed();
        }
        break; // deja el resto en cola; se reintenta en la próxima pasada
      }
    }
  } finally {
    sincronizando = false;
    avisar();
  }
}

if (typeof window !== 'undefined') {
  alCambiarConexion((enLinea) => { if (enLinea) sincronizarAhora(); });
  alCambiarSesionRemota((hay) => { if (hay) sincronizarAhora(); });
  setInterval(() => { if (estaEnLinea()) sincronizarAhora(); }, 20000);
  // Al abrir la app: si quedó algo pendiente de la sesión anterior (se
  // cerró sin internet), lo intenta subir de una vez.
  sincronizarAhora();
}
