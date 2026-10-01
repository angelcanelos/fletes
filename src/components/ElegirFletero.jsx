import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { fechaLegible } from '../lib/calc.js';
import { normalizar } from '../lib/texto.js';
import TarjetaCarpeta from './TarjetaCarpeta.jsx';
import Avatar from './Avatar.jsx';
import { FiltroBuscar } from './Filtros.jsx';

// Atajo de "Nuevo flete" en Inicio: muestra las carpetas de fleteros y, al
// elegir uno, abre directo el formulario con ese fletero ya puesto.
// resumen: { [nombre]: { cantidad, ultimaFecha } }
export default function ElegirFletero({ isOpen, onClose, fleteros, resumen }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const visibles = fleteros.filter((f) => normalizar(f.nombre).includes(normalizar(q)));

  function cerrar() {
    setQ('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(abierto) => { if (!abierto) cerrar(); }}
      size="5xl"
      scrollBehavior="inside"
      placement="center"
      classNames={{ base: 'rounded-panel', header: 'flex-col gap-1 px-7 pt-7', body: 'px-7 pb-7' }}
    >
      <ModalContent>
        <ModalHeader>
          <span className="text-[1.5rem] font-semibold text-ink-900">Nuevo flete</span>
          <span className="text-[14px] font-normal text-ink-500">Elige el fletero para empezar el comprobante.</span>
          <div className="mt-3 flex">
            <FiltroBuscar placeholder="Buscar fletero…" value={q} onChange={setQ} />
          </div>
        </ModalHeader>
        <ModalBody>
          {fleteros.length === 0 ? (
            <p className="py-8 text-center text-ink-500">Aún no hay fleteros. Agrégalos en Ajustes.</p>
          ) : visibles.length === 0 ? (
            <p className="py-8 text-center text-ink-500">Ningún fletero coincide con la búsqueda.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
              {visibles.map((f) => {
                const r = resumen[f.nombre];
                return (
                  <TarjetaCarpeta
                    key={f.nombre}
                    icono={<Avatar nombre={f.nombre} indice={fleteros.indexOf(f)} activo={Boolean(r)} />}
                    titulo={f.nombre}
                    subtitulo={r ? `Último: ${fechaLegible(r.ultimaFecha)}` : 'Sin fletes registrados'}
                    cantidad={`${r ? r.cantidad : 0} flete${r && r.cantidad === 1 ? '' : 's'}`}
                    total="Crear flete →"
                    onAbrir={() => navigate(`/fletes/nuevo?fletero=${encodeURIComponent(f.nombre)}`)}
                  />
                );
              })}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
