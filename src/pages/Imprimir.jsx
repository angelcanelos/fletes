import { Api } from '../lib/api.js';
import PantallaImprimir from '../components/PantallaImprimir.jsx';

export default function Imprimir() {
  return (
    <PantallaImprimir
      tipo="extraccion"
      obtener={Api.obtenerFormato}
      volverA="/extraccion"
      titulo={(f) => `Extracción ${f.folio || f.id} - ${f.productor}`}
      textoNoEncontrado="No se encontró esa extracción."
      textoSinId="No se indicó qué extracción imprimir."
    />
  );
}
