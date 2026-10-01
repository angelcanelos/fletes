import { useMemo } from 'react';
import ReciboFormato from './ReciboFormato.jsx';
import ReciboFlete from './ReciboFlete.jsx';
import DocumentoRender from '../editor/render/DocumentoRender.jsx';
import { normalizarDoc } from '../editor/modelo.js';
import { construirDatos } from '../editor/campos.js';
import { fechaLargaEs } from '../lib/calc.js';

// Dibuja un comprobante con el diseño elegido en el Editor de Formatos, o
// con el diseño original 2026 (ReciboFormato / ReciboFlete) si no hay
// ninguno. `registro` tiene la forma de una fila de `formatos` o `fletes`.
//
// modo: 'impresion' (agrega las reglas de papel para imprimir) o
// 'miniatura' (vistas previas de los formularios).
export default function ReciboDinamico({ tipo, plantilla, registro, settings = {}, gruas = [], modo = 'impresion' }) {
  const doc = useMemo(() => (plantilla ? normalizarDoc(plantilla.project_data) : null), [plantilla]);
  const datos = useMemo(() => (doc ? construirDatos(tipo, registro, settings, gruas) : null), [doc, tipo, registro, settings, gruas]);

  if (doc) return <DocumentoRender doc={doc} datos={datos} tipo={tipo} modo={modo} />;

  if (tipo === 'flete') {
    return (
      <ReciboFlete
        fletero={registro.fletero}
        fecha={registro.fecha}
        lineas={registro.lineas}
        precioFlete={registro.precio_flete}
        ajustes={registro.ajustes}
        ivaRate={registro.iva_rate}
        retencionRate={registro.retencion_rate}
        isrRate={registro.isr_rate}
        gruasCatalog={gruas}
      />
    );
  }
  return (
    <ReciboFormato
      productor={registro.productor}
      grua={registro.grua}
      fechaTexto={fechaLargaEs(registro.fecha)}
      productoFsc={registro.producto_fsc}
      etiquetaExtra={registro.destino}
      generos={registro.generos}
      ajustes={registro.ajustes}
      ivaRate={registro.iva_rate}
      isrRate={registro.isr_rate}
    />
  );
}

// Ancho natural (px) del comprobante, para ajustar las vistas previas.
export function anchoRecibo(tipo, plantilla) {
  if (plantilla) return normalizarDoc(plantilla.project_data).pagina.ancho;
  return tipo === 'flete' ? 719 : 397;
}
