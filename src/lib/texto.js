// Búsqueda sin distinguir mayúsculas ni acentos ("eleazar" encuentra
// "Eleázar").
export function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
