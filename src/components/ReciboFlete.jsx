import { useState } from 'react';
import { calcularFlete, fechaCortaEs, formatoMonedaConSigno } from '../lib/calc.js';

// Estructura del comprobante "Flete de Madera en Rollo". Usa las clases
// de src/styles/flete.css (prefijo ft-, independiente de formato.css /
// Extracción) para no tocar ese diseño. Se usa tanto en la vista previa
// como en la pantalla de impresión, así siempre se ven igual.

function soloNumeroGrua(grua) {
  const g = (grua || '').trim();
  const m = g.replace(/^GRUA\s*/i, '').trim();
  return m || g;
}

function preciosPorGrua(gruasCatalog) {
  const mapa = {};
  (gruasCatalog || []).forEach((g) => {
    if (g && g.grua) mapa[g.grua] = g.precio_flete;
  });
  return mapa;
}

export default function ReciboFlete({
  fletero,
  fecha,
  lineas,
  precioFlete,
  ajustes,
  ivaRate,
  retencionRate,
  isrRate,
  gruasCatalog,
  logoSrc = '/images/logo.png'
}) {
  const [logoError, setLogoError] = useState(false);
  const r = calcularFlete({
    lineas, precio_flete: precioFlete, ajustes, iva_rate: ivaRate, retencion_rate: retencionRate, isr_rate: isrRate,
    precios_por_grua: preciosPorGrua(gruasCatalog)
  });
  const M = (v) => Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ivaPct = ivaRate * 100;
  const retencionPct = retencionRate * 100;
  const isrPct = isrRate * 100;
  const pct = (n) => (Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2));
  const conSubtotal = r.grupos.length > 1;
  const columnas = conSubtotal ? [14, 13, 24, 13, 16, 20] : [15, 14, 29, 13, 29];

  return (
    <div className="ft-hoja">
      <div className="ft-encabezado">
        <div className="ft-titulo-box">Flete De<br />Madera En<br />Rollo</div>
        <div className="ft-logo-decor">
          <div className="ft-logo-halo ft-logo-halo-2"></div>
          <div className="ft-logo-halo ft-logo-halo-1"></div>
          <div className="ft-logo-wrap">
            {logoError
              ? <div className="ft-logo-fallback">LOGO</div>
              : <img src={logoSrc} alt="logo" onError={() => setLogoError(true)} />}
          </div>
        </div>
      </div>

      <div className="ft-fletero">{fletero || 'FLETERO'}</div>

      <div className="ft-fecha-box">{fechaCortaEs(fecha) || 'FECHA'}</div>

      <table className="ft-tabla ft-tabla-head">
        <colgroup>{columnas.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Folio</th>
            <th>Paraje</th>
            <th>Grua #</th>
            <th className="ft-num">Metros</th>
            {conSubtotal && <th></th>}
          </tr>
        </thead>
      </table>

      <table className="ft-tabla ft-tabla-body">
        <colgroup>{columnas.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
        <tbody>
          {r.lineas.map((l, i) => {
            const grupo = r.grupos.find((g) => g.finIndex === i);
            return (
              <tr key={i} className={i % 2 === 0 ? 'ft-fila-azul' : 'ft-fila-blanca'}>
                <td>{l.fecha ? l.fecha.split('-').reverse().join('/') : ''}</td>
                <td>{l.folio}</td>
                <td>{l.paraje}</td>
                <td>{soloNumeroGrua(l.grua)}</td>
                <td className="ft-num">{Number(l.metros || 0).toFixed(3)}</td>
                {conSubtotal && (
                  <td className="ft-num ft-subtotal-cell">
                    {grupo && (
                      <span className="ft-subtotal-badge">
                        <span className="ft-check">✓</span>{Number(grupo.metros).toFixed(3)}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="ft-totales">
        <tbody>
          <tr><td className="ft-label" colSpan={2}>Total en metros</td><td className="ft-val">{Number(r.totalMetros || 0).toFixed(3)}</td></tr>
          {r.grupos.map((g, gi) => (
            <tr key={gi}>
              <td className="ft-num-izq">{M(g.precio)}</td>
              <td className="ft-label">Precio flete</td>
              <td className="ft-val">{M(g.importe)}</td>
            </tr>
          ))}
          <tr><td className="ft-label" colSpan={2}>Total $</td><td className="ft-val">{M(r.totalFlete)}</td></tr>
        </tbody>
      </table>

      <table className="ft-resumen">
        <tbody>
          <tr><td className="ft-label">Flete de madera en rollo</td><td className="ft-val">{M(r.totalFlete)}</td></tr>
          {r.ajustes.map((a, i) => (
            <tr key={i}><td className="ft-label">{a.etiqueta}</td><td className="ft-val">{formatoMonedaConSigno(a.monto)}</td></tr>
          ))}
          <tr><td className="ft-label">Mas pago de iva {pct(ivaPct)} %</td><td className="ft-val">{M(r.iva)}</td></tr>
          {retencionRate > 0 && (
            <tr><td className="ft-label">Menos pago de retencion {pct(retencionPct)} %</td><td className="ft-val">{M(r.retencion)}</td></tr>
          )}
          {isrRate > 0 && (
            <tr><td className="ft-label">Menos pago de isr retenido {pct(isrPct)} %</td><td className="ft-val">{M(r.isr)}</td></tr>
          )}
          <tr className="ft-total"><td className="ft-label">Total</td><td className="ft-val">{M(r.total)}</td></tr>
        </tbody>
      </table>

      <div className="ft-saldo">
        <span>Saldo a favor:</span>
        <span className="ft-val">{M(r.saldoFavor)}</span>
      </div>
      <div className="ft-footer-space"></div>
    </div>
  );
}
