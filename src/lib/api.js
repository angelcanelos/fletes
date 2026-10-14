// Capa de datos de la app: primero intenta hablar directo con Supabase
// (Postgres + Realtime), y si no hay internet cae sola a un espejo local
// (IndexedDB, ver localDb.js) — lee de ahí y encola los cambios en una
// "bandeja de salida" que syncEngine.js sube solo en cuanto vuelve la
// conexión. Así la app de escritorio sigue funcionando sin internet:
// guarda temporal y sincroniza después, como Discord.
//
// La forma de cada método (nombres, parámetros, forma de la respuesta)
// es la misma que siempre: ninguna pantalla tuvo que cambiar una línea.

import { supabase } from './supabaseClient.js';
import { localDb } from './localDb.js';
import { esFalloDeRed, reportarExitoDeRed, reportarFalloDeRed, conLimiteDeTiempo, marcarLenta, estaEnLinea } from './connectivity.js';
import { generarFolioFormato, generarFolioFlete } from './folios.js';
import { haySesionRemota } from './accesoOffline.js';

// Ya sabíamos que estábamos offline (el ping de fondo ya lo detectó):
// ni vale la pena intentar la red, mejor ir directo al espejo local —
// así una pantalla nueva no se queda cargando varios segundos solo para
// confirmar, otra vez, algo que ya sabíamos.
class ModoLocalError extends Error {}

function asegurarIntentoDeRed() {
  if (!estaEnLinea()) throw new ModoLocalError('offline conocido: se usa el espejo local directo');
  // Se entró sin internet y todavía no se recupera la sesión de Supabase:
  // sin ella, la base devolvería listas vacías (reglas de seguridad), así
  // que se sigue trabajando con el espejo local hasta reconectar.
  if (!haySesionRemota()) throw new ModoLocalError('sin sesión remota: se usa el espejo local');
}

// Si Supabase de plano no contesta (falla de red), fue una caída real —
// se marca offline. Si sí contestó pero tardó tanto que conLimiteDeTiempo
// tuvo que abortarla, puede que sí haya internet pero muy lento — no vale
// la pena marcar "offline" por eso (el próximo ping periódico corrige el
// estado solo), pero sí conviene avisar que va lento. Y si ni siquiera se
// intentó la red (ModoLocalError) porque ya sabíamos que estaba caída, no
// hay nada nuevo que reportar.
function manejarFalloDeRed(err) {
  if (err instanceof ModoLocalError) return;
  // El error real de abortar (AbortController, por conLimiteDeTiempo) se
  // reenvuelve varias veces de camino hasta aquí y pierde su .name
  // original, pero el texto "AbortError"/"abort" sobrevive siempre en el
  // mensaje — por eso se detecta así y no con err.name.
  const msg = (err && err.message) || String(err || '');
  if (/abort/i.test(msg)) marcarLenta(true);
  else reportarFalloDeRed();
}

function esRecuperable(err) {
  return err instanceof ModoLocalError || esFalloDeRed(err);
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function idTemporal() {
  // Negativo a propósito: nunca puede chocar con un id real de Postgres
  // (autoincrement siempre positivo), así que sirve para distinguir "esto
  // todavía no existe en Supabase" en cualquier parte del código.
  return -(Date.now() * 1000 + Math.floor(Math.random() * 1000));
}

function normalizarGeneros(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((g) => ({ nombre: String((g && g.nombre) || '').trim() || 'GENERO', metros: num(g && g.metros), precio: num(g && g.precio) }))
    .filter((g) => g.nombre);
}

function normalizarAjustes(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((a) => ({ etiqueta: String((a && a.etiqueta) || '').trim(), monto: num(a && a.monto) }))
    .filter((a) => a.etiqueta);
}

function normalizarLineas(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((l) => ({
      fecha: (l && l.fecha) || '',
      folio: String((l && l.folio) || '').trim(),
      paraje: String((l && l.paraje) || '').trim(),
      grua: String((l && l.grua) || '').trim(),
      metros: num(l && l.metros)
    }))
    .filter((l) => l.grua || l.folio || l.paraje || l.metros);
}

function mesActualIso() {
  return new Date().toISOString().slice(0, 7);
}

function coincide(valor, q) {
  return String(valor || '').toLowerCase().includes(q.toLowerCase());
}

function filtrarFormatosLocal(lista, params) {
  let out = lista;
  if (params.q) out = out.filter((f) => coincide(f.productor, params.q) || coincide(f.folio, params.q) || coincide(f.observaciones, params.q));
  if (params.grua) out = out.filter((f) => f.grua === params.grua);
  if (params.desde) out = out.filter((f) => f.fecha >= params.desde);
  if (params.hasta) out = out.filter((f) => f.fecha <= params.hasta);
  if (params.estado) out = out.filter((f) => f.estado === params.estado);
  return out.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.id - a.id);
}

function filtrarFletesLocal(lista, params) {
  let out = lista;
  if (params.q) out = out.filter((f) => coincide(f.fletero, params.q) || coincide(f.folio, params.q) || coincide(f.observaciones, params.q));
  if (params.fletero) out = out.filter((f) => f.fletero === params.fletero);
  if (params.grua) out = out.filter((f) => (f.lineas || []).some((l) => l.grua === params.grua));
  if (params.desde) out = out.filter((f) => f.fecha >= params.desde);
  if (params.hasta) out = out.filter((f) => f.fecha <= params.hasta);
  if (params.estado) out = out.filter((f) => f.estado === params.estado);
  return out.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.id - a.id);
}

async function encolar(entidad, accion, entidadId, payload) {
  await localDb.outbox.add({ entidad, accion, entidadId, payload, creadoEn: Date.now() });
}

export const Api = {
  // ---------------- Formatos (Extracción) ----------------
  async listarFormatos(params = {}) {
    try {
      asegurarIntentoDeRed();
      let q = supabase.from('formatos').select('*');
      if (params.q) { const like = `%${params.q}%`; q = q.or(`productor.ilike.${like},folio.ilike.${like},observaciones.ilike.${like}`); }
      if (params.grua) q = q.eq('grua', params.grua);
      if (params.desde) q = q.gte('fecha', params.desde);
      if (params.hasta) q = q.lte('fecha', params.hasta);
      if (params.estado) q = q.eq('estado', params.estado);
      q = q.order('fecha', { ascending: false }).order('id', { ascending: false });
      const { data, error } = await conLimiteDeTiempo(q);
      if (error) throw new Error(error.message);
      reportarExitoDeRed();
      if (data.length) await localDb.formatos.bulkPut(data);
      return data;
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      return filtrarFormatosLocal(await localDb.formatos.toArray(), params);
    }
  },
  async obtenerFormato(id) {
    id = Number(id);
    if (id < 0) {
      const local = await localDb.formatos.get(id);
      if (!local) throw new Error('No se encontró la extracción');
      return local;
    }
    try {
      asegurarIntentoDeRed();
      const { data, error } = await conLimiteDeTiempo(supabase.from('formatos').select('*').eq('id', id).maybeSingle());
      if (error) throw new Error(error.message);
      if (data) { reportarExitoDeRed(); await localDb.formatos.put(data); return data; }
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
    }
    const local = await localDb.formatos.get(id);
    if (!local) throw new Error('No se encontró la extracción');
    return local;
  },
  async crearFormato(payload) {
    if (!payload.productor || !String(payload.productor).trim()) throw new Error('El nombre del productor es obligatorio');
    if (!payload.grua || !String(payload.grua).trim()) throw new Error('La grúa es obligatoria');
    if (!payload.fecha) throw new Error('La fecha es obligatoria');

    const ahora = new Date().toISOString();
    const fila = {
      productor: payload.productor.trim(),
      grua: payload.grua.trim(),
      destino: (payload.destino || '').trim(),
      fecha: payload.fecha,
      fecha_texto: payload.fecha_texto || null,
      producto_fsc: payload.producto_fsc || '',
      generos: normalizarGeneros(payload.generos),
      ajustes: normalizarAjustes(payload.ajustes),
      iva_rate: num(payload.iva_rate ?? 0.16),
      retencion_rate: num(payload.retencion_rate ?? 0),
      isr_rate: num(payload.isr_rate ?? 0.0125),
      observaciones: payload.observaciones || null,
      estado: payload.estado || 'guardado',
      created_at: ahora,
      updated_at: ahora
    };
    try {
      asegurarIntentoDeRed();
      const insertado = await conLimiteDeTiempo(supabase.from('formatos').insert(fila).select().single());
      if (insertado.error) throw new Error(insertado.error.message);
      const folio = generarFolioFormato(insertado.data.id, fila.fecha);
      const actualizado = await conLimiteDeTiempo(supabase.from('formatos').update({ folio }).eq('id', insertado.data.id).select().single());
      if (actualizado.error) throw new Error(actualizado.error.message);
      reportarExitoDeRed();
      await localDb.formatos.put(actualizado.data);
      return actualizado.data;
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      const id = idTemporal();
      const registro = { id, folio: null, ...fila };
      await localDb.formatos.put(registro);
      await encolar('formatos', 'crear', id, fila);
      return registro;
    }
  },
  async actualizarFormato(id, payload) {
    id = Number(id);
    const cambios = { updated_at: new Date().toISOString() };
    if (payload.productor !== undefined) cambios.productor = payload.productor.trim();
    if (payload.grua !== undefined) cambios.grua = payload.grua.trim();
    if (payload.destino !== undefined) cambios.destino = (payload.destino || '').trim();
    if (payload.fecha !== undefined) cambios.fecha = payload.fecha;
    if (payload.fecha_texto !== undefined) cambios.fecha_texto = payload.fecha_texto || null;
    if (payload.producto_fsc !== undefined) cambios.producto_fsc = payload.producto_fsc || '';
    if (payload.generos !== undefined) cambios.generos = normalizarGeneros(payload.generos);
    if (payload.ajustes !== undefined) cambios.ajustes = normalizarAjustes(payload.ajustes);
    if (payload.iva_rate !== undefined) cambios.iva_rate = num(payload.iva_rate);
    if (payload.retencion_rate !== undefined) cambios.retencion_rate = num(payload.retencion_rate);
    if (payload.isr_rate !== undefined) cambios.isr_rate = num(payload.isr_rate);
    if (payload.observaciones !== undefined) cambios.observaciones = payload.observaciones || null;
    if (payload.estado !== undefined) cambios.estado = payload.estado || 'guardado';

    if (id < 0) {
      // Todavía no existe en Supabase: se mezcla con el "crear" pendiente
      // en vez de encolar una edición aparte.
      const pendiente = await localDb.outbox.where({ entidad: 'formatos', accion: 'crear', entidadId: id }).first();
      const actual = (await localDb.formatos.get(id)) || {};
      const combinado = { ...actual, ...cambios };
      await localDb.formatos.put(combinado);
      if (pendiente) await localDb.outbox.update(pendiente.id, { payload: { ...pendiente.payload, ...cambios } });
      return combinado;
    }

    try {
      asegurarIntentoDeRed();
      const { data, error } = await conLimiteDeTiempo(supabase.from('formatos').update(cambios).eq('id', id).select().maybeSingle());
      if (error) throw new Error(error.message);
      if (!data) throw new Error('No se encontró la extracción');
      reportarExitoDeRed();
      await localDb.formatos.put(data);
      return data;
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      const actual = (await localDb.formatos.get(id)) || {};
      const combinado = { ...actual, ...cambios };
      await localDb.formatos.put(combinado);
      await encolar('formatos', 'actualizar', id, cambios);
      return combinado;
    }
  },
  async eliminarFormato(id) {
    id = Number(id);
    if (id < 0) {
      const pendiente = await localDb.outbox.where({ entidad: 'formatos', accion: 'crear', entidadId: id }).first();
      if (pendiente) await localDb.outbox.delete(pendiente.id);
      await localDb.formatos.delete(id);
      return true;
    }
    try {
      asegurarIntentoDeRed();
      const { error } = await conLimiteDeTiempo(supabase.from('formatos').delete().eq('id', id));
      if (error) throw new Error(error.message);
      reportarExitoDeRed();
      await localDb.formatos.delete(id);
      return true;
    } catch (err) {
      if (!esRecuperable(err)) return false;
      manejarFalloDeRed(err);
      await encolar('formatos', 'eliminar', id, null);
      await localDb.formatos.delete(id);
      return true;
    }
  },
  async stats() {
    try {
      asegurarIntentoDeRed();
      const [{ count: totalFormatos }, { count: esteMes }, { data: gruasData }] = await Promise.all([
        conLimiteDeTiempo(supabase.from('formatos').select('*', { count: 'exact', head: true })),
        conLimiteDeTiempo(supabase.from('formatos').select('*', { count: 'exact', head: true }).like('fecha', `${mesActualIso()}%`)),
        conLimiteDeTiempo(supabase.from('formatos').select('grua'))
      ]);
      reportarExitoDeRed();
      const gruas = [...new Set((gruasData || []).map((r) => r.grua))];
      return { totalFormatos: totalFormatos || 0, esteMes: esteMes || 0, gruas };
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      const local = await localDb.formatos.toArray();
      const mes = mesActualIso();
      return {
        totalFormatos: local.length,
        esteMes: local.filter((f) => (f.fecha || '').startsWith(mes)).length,
        gruas: [...new Set(local.map((f) => f.grua))]
      };
    }
  },

  // ---------------- Settings / catálogos ----------------
  async obtenerSettings() {
    try {
      asegurarIntentoDeRed();
      const { data, error } = await conLimiteDeTiempo(supabase.from('settings').select('clave, valor'));
      if (error) throw new Error(error.message);
      reportarExitoDeRed();
      if (data.length) await localDb.settings.bulkPut(data);
      const out = {};
      for (const row of data) out[row.clave] = row.valor;
      return out;
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      const local = await localDb.settings.toArray();
      const out = {};
      for (const row of local) out[row.clave] = row.valor;
      return out;
    }
  },
  async actualizarSettings(data) {
    const filas = Object.entries(data).map(([clave, valor]) => ({ clave, valor: String(valor) }));
    try {
      asegurarIntentoDeRed();
      const { error } = await conLimiteDeTiempo(supabase.from('settings').upsert(filas, { onConflict: 'clave' }));
      if (error) throw new Error(error.message);
      reportarExitoDeRed();
      await localDb.settings.bulkPut(filas);
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      await localDb.settings.bulkPut(filas);
      await encolar('settings', 'upsert_settings', null, filas);
    }
    return Api.obtenerSettings();
  },

  // ---------------- Fletes ----------------
  async listarFletes(params = {}) {
    try {
      asegurarIntentoDeRed();
      let q = supabase.from('fletes').select('*');
      if (params.q) { const like = `%${params.q}%`; q = q.or(`fletero.ilike.${like},folio.ilike.${like},observaciones.ilike.${like}`); }
      if (params.fletero) q = q.eq('fletero', params.fletero);
      if (params.grua) q = q.contains('lineas', [{ grua: params.grua }]);
      if (params.desde) q = q.gte('fecha', params.desde);
      if (params.hasta) q = q.lte('fecha', params.hasta);
      if (params.estado) q = q.eq('estado', params.estado);
      q = q.order('fecha', { ascending: false }).order('id', { ascending: false });
      const { data, error } = await conLimiteDeTiempo(q);
      if (error) throw new Error(error.message);
      reportarExitoDeRed();
      if (data.length) await localDb.fletes.bulkPut(data);
      return data;
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      return filtrarFletesLocal(await localDb.fletes.toArray(), params);
    }
  },
  async obtenerFlete(id) {
    id = Number(id);
    if (id < 0) {
      const local = await localDb.fletes.get(id);
      if (!local) throw new Error('No se encontró el flete');
      return local;
    }
    try {
      asegurarIntentoDeRed();
      const { data, error } = await conLimiteDeTiempo(supabase.from('fletes').select('*').eq('id', id).maybeSingle());
      if (error) throw new Error(error.message);
      if (data) { reportarExitoDeRed(); await localDb.fletes.put(data); return data; }
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
    }
    const local = await localDb.fletes.get(id);
    if (!local) throw new Error('No se encontró el flete');
    return local;
  },
  async crearFlete(payload) {
    if (!payload.fletero || !String(payload.fletero).trim()) throw new Error('El fletero es obligatorio');
    if (!payload.fecha) throw new Error('La fecha es obligatoria');

    const ahora = new Date().toISOString();
    const fila = {
      fletero: payload.fletero.trim(),
      fecha: payload.fecha,
      fecha_texto: payload.fecha_texto || null,
      lineas: normalizarLineas(payload.lineas),
      precio_flete: num(payload.precio_flete),
      ajustes: normalizarAjustes(payload.ajustes),
      iva_rate: num(payload.iva_rate ?? 0.16),
      retencion_rate: num(payload.retencion_rate ?? 0.04),
      isr_rate: num(payload.isr_rate ?? 0.0125),
      observaciones: payload.observaciones || null,
      estado: payload.estado || 'guardado',
      created_at: ahora,
      updated_at: ahora
    };
    try {
      asegurarIntentoDeRed();
      const insertado = await conLimiteDeTiempo(supabase.from('fletes').insert(fila).select().single());
      if (insertado.error) throw new Error(insertado.error.message);
      const folio = generarFolioFlete(insertado.data.id, fila.fecha);
      const actualizado = await conLimiteDeTiempo(supabase.from('fletes').update({ folio }).eq('id', insertado.data.id).select().single());
      if (actualizado.error) throw new Error(actualizado.error.message);
      reportarExitoDeRed();
      await localDb.fletes.put(actualizado.data);
      return actualizado.data;
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      const id = idTemporal();
      const registro = { id, folio: null, ...fila };
      await localDb.fletes.put(registro);
      await encolar('fletes', 'crear', id, fila);
      return registro;
    }
  },
  async actualizarFlete(id, payload) {
    id = Number(id);
    const cambios = { updated_at: new Date().toISOString() };
    if (payload.fletero !== undefined) cambios.fletero = payload.fletero.trim();
    if (payload.fecha !== undefined) cambios.fecha = payload.fecha;
    if (payload.fecha_texto !== undefined) cambios.fecha_texto = payload.fecha_texto || null;
    if (payload.lineas !== undefined) cambios.lineas = normalizarLineas(payload.lineas);
    if (payload.precio_flete !== undefined) cambios.precio_flete = num(payload.precio_flete);
    if (payload.ajustes !== undefined) cambios.ajustes = normalizarAjustes(payload.ajustes);
    if (payload.iva_rate !== undefined) cambios.iva_rate = num(payload.iva_rate);
    if (payload.retencion_rate !== undefined) cambios.retencion_rate = num(payload.retencion_rate);
    if (payload.isr_rate !== undefined) cambios.isr_rate = num(payload.isr_rate);
    if (payload.observaciones !== undefined) cambios.observaciones = payload.observaciones || null;
    if (payload.estado !== undefined) cambios.estado = payload.estado || 'guardado';

    if (id < 0) {
      const pendiente = await localDb.outbox.where({ entidad: 'fletes', accion: 'crear', entidadId: id }).first();
      const actual = (await localDb.fletes.get(id)) || {};
      const combinado = { ...actual, ...cambios };
      await localDb.fletes.put(combinado);
      if (pendiente) await localDb.outbox.update(pendiente.id, { payload: { ...pendiente.payload, ...cambios } });
      return combinado;
    }

    try {
      asegurarIntentoDeRed();
      const { data, error } = await conLimiteDeTiempo(supabase.from('fletes').update(cambios).eq('id', id).select().maybeSingle());
      if (error) throw new Error(error.message);
      if (!data) throw new Error('No se encontró el flete');
      reportarExitoDeRed();
      await localDb.fletes.put(data);
      return data;
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      const actual = (await localDb.fletes.get(id)) || {};
      const combinado = { ...actual, ...cambios };
      await localDb.fletes.put(combinado);
      await encolar('fletes', 'actualizar', id, cambios);
      return combinado;
    }
  },
  async eliminarFlete(id) {
    id = Number(id);
    if (id < 0) {
      const pendiente = await localDb.outbox.where({ entidad: 'fletes', accion: 'crear', entidadId: id }).first();
      if (pendiente) await localDb.outbox.delete(pendiente.id);
      await localDb.fletes.delete(id);
      return true;
    }
    try {
      asegurarIntentoDeRed();
      const { error } = await conLimiteDeTiempo(supabase.from('fletes').delete().eq('id', id));
      if (error) throw new Error(error.message);
      reportarExitoDeRed();
      await localDb.fletes.delete(id);
      return true;
    } catch (err) {
      if (!esRecuperable(err)) return false;
      manejarFalloDeRed(err);
      await encolar('fletes', 'eliminar', id, null);
      await localDb.fletes.delete(id);
      return true;
    }
  },
  async statsFletes() {
    try {
      asegurarIntentoDeRed();
      const [{ count: totalFletes }, { count: esteMes }] = await Promise.all([
        conLimiteDeTiempo(supabase.from('fletes').select('*', { count: 'exact', head: true })),
        conLimiteDeTiempo(supabase.from('fletes').select('*', { count: 'exact', head: true }).like('fecha', `${mesActualIso()}%`))
      ]);
      reportarExitoDeRed();
      return { totalFletes: totalFletes || 0, esteMes: esteMes || 0 };
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      const local = await localDb.fletes.toArray();
      const mes = mesActualIso();
      return { totalFletes: local.length, esteMes: local.filter((f) => (f.fecha || '').startsWith(mes)).length };
    }
  },

  // ---------------- Plantillas (Editor de Formatos) ----------------
  // Leer funciona offline (caché local); crear/editar requiere conexión:
  // un diseño es un documento grande que solo se edita en una
  // computadora a la vez, no vale la pena encolarlo en el outbox.
  async listarPlantillas(tipo) {
    try {
      asegurarIntentoDeRed();
      let q = supabase.from('plantillas_formato').select('*');
      if (tipo) q = q.eq('tipo', tipo);
      q = q.order('updated_at', { ascending: false });
      const { data, error } = await conLimiteDeTiempo(q);
      if (error) throw new Error(error.message);
      reportarExitoDeRed();
      if (tipo) await localDb.plantillas.where('tipo').equals(tipo).delete();
      else await localDb.plantillas.clear();
      if (data.length) await localDb.plantillas.bulkPut(data.map(plantillaLocal));
      return data;
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      const local = await localDb.plantillas.toArray();
      return local.filter((p) => !tipo || p.tipo === tipo).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    }
  },
  async obtenerPlantilla(id) {
    id = Number(id);
    try {
      asegurarIntentoDeRed();
      const { data, error } = await conLimiteDeTiempo(supabase.from('plantillas_formato').select('*').eq('id', id).maybeSingle());
      if (error) throw new Error(error.message);
      reportarExitoDeRed();
      if (data) { await localDb.plantillas.put(plantillaLocal(data)); return data; }
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
    }
    const local = await localDb.plantillas.get(id);
    if (!local) throw new Error('No se encontró el diseño');
    return local;
  },
  // Diseño en uso para imprimir un tipo, o null si se usa el original.
  async plantillaEnUso(tipo) {
    try {
      asegurarIntentoDeRed();
      const { data, error } = await conLimiteDeTiempo(
        supabase.from('plantillas_formato').select('*').eq('tipo', tipo).eq('activo', true).order('updated_at', { ascending: false })
      );
      if (error) throw new Error(error.message);
      reportarExitoDeRed();
      const p = data.find(esCompatible) || null;
      if (p) await localDb.plantillas.put(plantillaLocal(p));
      return p;
    } catch (err) {
      if (!esRecuperable(err)) throw err;
      manejarFalloDeRed(err);
      const local = await localDb.plantillas.where('tipo').equals(tipo).toArray();
      return local.find((p) => p.activo && esCompatible(p)) || null;
    }
  },
  async crearPlantilla({ nombre, tipo, project_data }) {
    requiereConexion();
    if (!nombre || !String(nombre).trim()) throw new Error('El nombre del diseño es obligatorio');
    if (!['extraccion', 'flete'].includes(tipo)) throw new Error('Tipo de formato inválido');
    const ahora = new Date().toISOString();
    const fila = { nombre: nombre.trim(), tipo, activo: false, html: '', css: '', project_data: project_data || {}, created_at: ahora, updated_at: ahora };
    const { data, error } = await conLimiteDeTiempo(supabase.from('plantillas_formato').insert(fila).select().single());
    if (error) throw new Error(errorPlantilla(error));
    reportarExitoDeRed();
    await localDb.plantillas.put(plantillaLocal(data));
    return data;
  },
  async actualizarPlantilla(id, cambios) {
    requiereConexion();
    const fila = { updated_at: new Date().toISOString() };
    if (cambios.nombre != null) {
      if (!String(cambios.nombre).trim()) throw new Error('El nombre del diseño es obligatorio');
      fila.nombre = String(cambios.nombre).trim();
    }
    if (cambios.project_data != null) fila.project_data = cambios.project_data;
    const { data, error } = await conLimiteDeTiempo(supabase.from('plantillas_formato').update(fila).eq('id', Number(id)).select().single());
    if (error) throw new Error(errorPlantilla(error));
    reportarExitoDeRed();
    await localDb.plantillas.put(plantillaLocal(data));
    return data;
  },
  async duplicarPlantilla(id, nombre) {
    const original = await Api.obtenerPlantilla(id);
    return Api.crearPlantilla({ nombre: nombre || `${original.nombre} (copia)`, tipo: original.tipo, project_data: original.project_data });
  },
  async eliminarPlantilla(id) {
    requiereConexion();
    const { error } = await conLimiteDeTiempo(supabase.from('plantillas_formato').delete().eq('id', Number(id)));
    if (error) throw new Error(errorPlantilla(error));
    reportarExitoDeRed();
    await localDb.plantillas.delete(Number(id));
    return true;
  },
  // id = null → volver al diseño original 2026 (ninguno activo).
  async usarPlantilla(id, tipo) {
    requiereConexion();
    const desactivar = await conLimiteDeTiempo(supabase.from('plantillas_formato').update({ activo: false }).eq('tipo', tipo).eq('activo', true));
    if (desactivar.error) throw new Error(errorPlantilla(desactivar.error));
    if (id != null) {
      const activar = await conLimiteDeTiempo(supabase.from('plantillas_formato').update({ activo: true }).eq('id', Number(id)));
      if (activar.error) throw new Error(errorPlantilla(activar.error));
    }
    reportarExitoDeRed();
    const locales = await localDb.plantillas.where('tipo').equals(tipo).toArray();
    await localDb.plantillas.bulkPut(locales.map((p) => ({ ...p, activo: id != null && p.id === Number(id) })));
    return true;
  }
};

function requiereConexion() {
  if (!estaEnLinea() || !haySesionRemota()) throw new Error('Sin conexión: los diseños solo se pueden editar con internet.');
}

// Solo los diseños hechos con el editor actual se pueden imprimir (los del
// editor anterior, GrapesJS, se ignoran y se usa el diseño original).
function esCompatible(p) {
  return Boolean(p && p.project_data && Array.isArray(p.project_data.elementos));
}

// Dexie no indexa booleanos: se guarda activo tal cual (se filtra en
// memoria), pero se asegura que el id sea número.
function plantillaLocal(p) {
  return { ...p, id: Number(p.id) };
}

function errorPlantilla(error) {
  const msg = (error && error.message) || String(error || '');
  if (esFalloDeRed(error) || /fetch|network|abort/i.test(msg)) return 'Sin conexión: los diseños solo se pueden editar con internet.';
  return msg;
}
