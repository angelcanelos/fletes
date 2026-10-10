import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { FolderOpen } from 'lucide-react';
import { fechaLegible } from '../lib/calc.js';
import { normalizar } from '../lib/texto.js';
import TarjetaCarpeta from './TarjetaCarpeta.jsx';
import { FiltroBuscar } from './Filtros.jsx';

// Atajo de "Nueva extracción" en Inicio: muestra las carpetas de grúas y,
// al elegir una, abre directo el formulario con esa grúa (y su productor)
// ya puestos. resumen: { [grua]: { cantidad, ultimaFecha } }
export default function ElegirGrua({ isOpen, onClose, gruas, resumen }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const visibles = gruas.filter((g) => normalizar(`${g.grua} ${g.productor || ''}`).includes(normalizar(q)));

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
          <span className="text-[1.5rem] font-semibold text-ink-900">Nueva extracción</span>
          <span className="text-[14px] font-normal text-ink-500">Elige la grúa para empezar el formato.</span>
          <div className="mt-3 flex">
            <FiltroBuscar placeholder="Buscar grúa o productor…" value={q} onChange={setQ} />
          </div>
        </ModalHeader>
        <ModalBody>
          {gruas.length === 0 ? (
            <p className="py-8 text-center text-ink-500">Aún no hay grúas. Agrégalas en Ajustes.</p>
          ) : visibles.length === 0 ? (
            <p className="py-8 text-center text-ink-500">Ninguna grúa coincide con la búsqueda.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
              {visibles.map((g) => {
                const r = resumen[g.grua];
                return (
                  <TarjetaCarpeta
                    key={g.grua}
                    icono={
                      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                        <FolderOpen className="h-5 w-5" strokeWidth={1.9} />
                      </span>
                    }
                    titulo={g.grua}
                    subtitulo={g.productor || 'Sin productor asignado'}
                    cantidad={r ? `${r.cantidad} ${r.cantidad === 1 ? 'extracción' : 'extracciones'} · Última: ${fechaLegible(r.ultimaFecha)}` : 'Sin extracciones'}
                    total="Crear extracción →"
                    onAbrir={() => navigate(`/extraccion/nuevo?grua=${encodeURIComponent(g.grua)}`)}
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
