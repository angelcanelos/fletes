// Círculo con las iniciales de un nombre (fleteros). El color se elige por
// la posición en el catálogo; `activo` agrega el punto verde/gris.
const TONOS_AVATAR = [
  'bg-tono-indigo-bg text-tono-indigo-texto',
  'bg-tono-ambar-bg text-tono-ambar-texto',
  'bg-tono-verde-bg text-tono-verde-texto',
  'bg-tono-azul-bg text-tono-azul-texto'
];

function iniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/);
  if (partes.length > 1) return (partes[0][0] + partes[1][0]).toUpperCase();
  return (partes[0] || '?').slice(0, 2).toUpperCase();
}

export default function Avatar({ nombre, indice, chico, activo }) {
  return (
    <span className={`relative flex flex-none items-center justify-center rounded-full font-semibold ${TONOS_AVATAR[Math.max(indice, 0) % TONOS_AVATAR.length]} ${chico ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-[15px]'}`}>
      {iniciales(nombre)}
      {activo !== undefined && (
        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${activo ? 'bg-success' : 'bg-ink-200'}`} />
      )}
    </span>
  );
}
