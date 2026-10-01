import { Api } from '../lib/api.js';
import PantallaImprimir from '../components/PantallaImprimir.jsx';

export default function FleteImprimir() {
  return (
    <PantallaImprimir
      tipo="flete"
      obtener={Api.obtenerFlete}
      volverA="/fletes"
      titulo={(f) => `Flete ${f.folio || f.id} - ${f.fletero}`}
      textoNoEncontrado="No se encontró ese flete."
      textoSinId="No se indicó qué flete imprimir."
    />
  );
}
