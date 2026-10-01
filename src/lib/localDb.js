import Dexie from 'dexie';

// Espejo local (IndexedDB, vía Dexie) de lo que hay en Supabase, más una
// "bandeja de salida" (outbox) de cambios hechos sin internet. Vive en el
// navegador/Electron, no en el servidor — así la app de escritorio puede
// seguir funcionando sin conexión: lee del espejo, y cada creación/edición
// hecha offline se guarda aquí hasta poder subirse sola.
export const localDb = new Dexie('forestal_tezains_local');

localDb.version(1).stores({
  // id como clave: coincide con el id real de Supabase una vez
  // sincronizado; mientras está pendiente de subir, usa un id temporal
  // negativo (ver localId() en syncEngine.js).
  formatos: 'id, fecha, grua, productor, estado',
  fletes: 'id, fecha, fletero, estado',
  settings: 'clave',
  // outbox: una fila por cada cambio hecho sin internet, en el orden en
  // que se hizo (para subirlos en el mismo orden al reconectar).
  outbox: '++id, entidad, accion, entidadId, creadoEn'
});

// v2: caché de los diseños del Editor de Formatos, solo de lectura — así
// imprimir con un diseño personalizado funciona también sin internet.
// Editar diseños sí requiere conexión (no pasan por el outbox).
localDb.version(2).stores({
  plantillas: 'id, tipo'
});

export default localDb;
