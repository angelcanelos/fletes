import { useState } from 'react';
import { calcularFormato, formatoMonedaConSigno } from '../lib/calc.js';

// Este componente reproduce EXACTAMENTE la estructura HTML y las clases
// que usa src/styles/formato.css (copiado sin cambios del formato.css
// original). No se debe alterar el árbol de elementos ni los nombres de
// clase: es lo que garantiza que el comprobante se vea e imprima igual
// al diseño oficial 2026, tanto en la vista previa como al imprimir.

export default function ReciboFormato({
  productor,
  grua,
  fechaTexto,
  productoFsc,
  etiquetaExtra,
  generos,
  ajustes,
  ivaRate,
  isrRate,
  logoSrc = '/images/logo.png'
}) {
  const [logoError, setLogoError] = useState(false);

  const r = calcularFormato({ generos, ajustes, iva_rate: ivaRate, isr_rate: isrRate });
  const M = (v) => Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ivaPct = ivaRate * 100;
  const ivaPctTexto = Number.isInteger(ivaPct) ? ivaPct.toFixed(0) : ivaPct.toFixed(2);

  return (
    <div className="hoja">
      <div className="f-encabezado">
        <div className="f-logo-wrap">
          {logoError
            ? <div className="f-logo-fallback">LOGO</div>
            : <img src={logoSrc} alt="logo" onError={() => setLogoError(true)} />}
        </div>
        <div className="f-cintillo"><h1>Extraccion<br />de troceria<br />en rollo</h1></div>
      </div>
      <div className="f-fsc">
        {String(productoFsc || '').split('\n').map((linea, i, arr) => (
          <span key={i}>{linea}{i < arr.length - 1 ? <br /> : null}</span>
        ))}
      </div>
      <div className="f-caja f-caja--productor">
        <span className="f-caja-box">{productor || 'PRODUCTOR'}</span>
        <span className="f-madymsa">{etiquetaExtra || ''}</span>
      </div>
      <div className="f-caja f-caja--grua">
        <div className="f-caja-sombra"></div>
        <span className="f-caja-box">{grua || 'GRUA'}</span>
      </div>
      <div className="f-caja f-caja--fecha">
        <div className="f-caja-sombra"></div>
        <span className="f-caja-box">{fechaTexto || 'FECHA'}</span>
      </div>
      <div className="f-tabla-wrap">
        <table className="f-tabla">
          <thead><tr><th>Genero</th><th>Metros</th><th>Precio $</th><th>Total</th></tr></thead>
          <tbody>
            {r.generos.map((g, i) => (
              <tr key={i}>
                <td>{g.nombre}</td>
                <td>{Number(g.metros || 0).toFixed(3)}</td>
                <td>{M(g.precio)}</td>
                <td>{M(g.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="f-resumen">
          <tbody>
            {r.ajustes.map((a, i) => (
              <tr key={i}><td className="f-label" colSpan={3}>{a.etiqueta}</td><td className="f-val">{formatoMonedaConSigno(a.monto)}</td></tr>
            ))}
            <tr><td colSpan={4}>&nbsp;</td></tr>
            <tr><td className="f-label" colSpan={3}>Subtotal</td><td className="f-val">{M(r.subtotal)}</td></tr>
            <tr><td className="f-label" colSpan={3}>Mas iva {ivaPctTexto} %</td><td className="f-val">{M(r.iva)}</td></tr>
            {isrRate > 0 && (
              <tr><td className="f-label" colSpan={3}>I S R</td><td className="f-val">{M(r.isr)}</td></tr>
            )}
            <tr className="f-total-neto"><td className="f-label" colSpan={3}>Total neto</td><td className="f-val">{M(r.totalNeto)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="f-saldo"><span>Saldo a favor :</span><span>{M(r.saldoFavor)}</span></div>
      <div className="f-footer-space"></div>
    </div>
  );
}
