import { useCallback, useEffect, useState } from 'react';
import { Api } from '../lib/api.js';
import useRealtimeLista from './useRealtimeLista.js';

// Diseño del Editor de Formatos que está "en uso" para un tipo
// ('extraccion' | 'flete'), o null si se usa el diseño original 2026.
// Se actualiza solo si alguien cambia el diseño en uso desde otra compu.
export default function usePlantillaEnUso(tipo) {
  const [estado, setEstado] = useState({ cargando: true, plantilla: null });

  const cargar = useCallback(async () => {
    try {
      const p = await Api.plantillaEnUso(tipo);
      setEstado({ cargando: false, plantilla: p });
    } catch {
      setEstado({ cargando: false, plantilla: null });
    }
  }, [tipo]);

  useEffect(() => { cargar(); }, [cargar]);
  useRealtimeLista('plantillas_formato', cargar);

  return estado;
}
