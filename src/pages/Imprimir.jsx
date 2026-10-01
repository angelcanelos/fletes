import { Api } from '../lib/api.js';
import PantallaImprimir from '../components/PantallaImprimir.jsx';

export default function Imprimir() {
  return (
    <PantallaImprimir
      tipo="extraccion"
      obtener={Api.obtenerFormato}
      volverA="/extraccion"
      titulo={(f) => `Formato ${f.folio || f.id} - ${f.productor}`}
      textoNoEncontrado="No se encontró ese formato."
      textoSinId="No se indicó qué formato imprimir."
    />
  );
}
