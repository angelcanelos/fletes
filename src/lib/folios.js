// Igual que generarFolio() en db/formatos.js / db/fletes.js (versión
// SQLite anterior): mismo formato de folio, para que no cambie nada de
// cara a la secretaria. Se comparte entre api.js y syncEngine.js porque
// ambos necesitan generar el folio justo después de crear la fila (una
// vez que ya se sabe el id real que asignó la base de datos).
export function generarFolioFormato(id, fecha) {
  const anio = (fecha || '').slice(0, 4) || String(new Date().getFullYear());
  return `${anio}-${String(id).padStart(4, '0')}`;
}

export function generarFolioFlete(id, fecha) {
  const anio = (fecha || '').slice(0, 4) || String(new Date().getFullYear());
  return `F${anio}-${String(id).padStart(4, '0')}`;
}
