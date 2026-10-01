import { cssTexto, ESTILO_TEXTO_DEFAULT, fuenteCss } from '../modelo.js';
import { formatearValor, cumpleCondicion, interpolar } from '../campos.js';
import { filasTabla } from '../layout.js';

// Tabla enlazada a una lista de datos (géneros, viajes, ajustes, precios
// por grúa). El encabezado y el cuerpo son dos <table> que comparten el
// mismo <colgroup> — igual que el comprobante de fletes original — para
// poder separarlos con un espacio sin que las columnas se descuadren.

function bordeCelda(bordes, fila, esPrimera, esUltima) {
  const b = bordes || {};
  if (!b.modo || b.modo === 'ninguno' || b.modo === 'exterior') return {};
  const linea = `${b.grosor || 1}px solid ${b.color || '#111'}`;
  if (b.modo === 'todas') return { border: linea };
  if (b.modo === 'horizontales') {
    return { borderBottom: linea, borderTop: esPrimera && fila ? linea : undefined };
  }
  if (b.modo === 'inferior') return esUltima ? {} : { borderBottom: linea };
  return {};
}

// Decoración de una celda: "insignia" (borde de color con ✓) o "pastilla"
// (fondo suave redondeado), como etiquetas de estado en un diseño moderno.
function Decoracion({ tipo, valor, c }) {
  if (valor == null || valor === '') return null;
  if (tipo === 'pastilla') {
    return (
      <span style={{ display: 'inline-block', background: c.fondoDecoracion || '#eef1f4', color: c.colorDecoracion || 'inherit', borderRadius: 999, padding: '1px 8px', lineHeight: 1.45, fontSize: '0.9em' }}>
        {valor}
      </span>
    );
  }
  const color = c.colorDecoracion || c.colorInsignia || '#2e9e5b';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: `1.2px solid ${color}`, background: c.fondoDecoracion || undefined, color: c.fondoDecoracion ? color : undefined, borderRadius: c.fondoDecoracion ? 6 : 4, padding: '0 6px', lineHeight: 1.45 }}>
      <span style={{ color, fontWeight: 900 }}>✓</span>{valor}
    </span>
  );
}

function colorSigno(filasCfg, fila) {
  const cfg = filasCfg.colorPorSigno;
  if (!cfg || !cfg.campo || !fila) return undefined;
  const v = parseFloat(fila[cfg.campo]);
  if (Number.isNaN(v) || v === 0) return undefined;
  return v < 0 ? cfg.negativo || '#d92d20' : cfg.positivo || '#15803d';
}

export default function RenderTabla({ el, datos, tipo }) {
  const p = el.props;
  const t = { ...ESTILO_TEXTO_DEFAULT, ...(el.estilo.texto || {}) };
  const enc = p.encabezado || {};
  const filasCfg = p.filas || {};
  const columnas = (p.columnas || []).filter((c) => cumpleCondicion(c.visibleSi, datos));
  const total = columnas.reduce((s, c) => s + (Number(c.ancho) || 1), 0) || 1;
  const filas = filasTabla(el, datos);
  const bordes = p.bordes || {};
  const exterior = bordes.modo === 'exterior' ? `${bordes.grosor || 1}px solid ${bordes.color || '#111'}` : undefined;
  const pad = `0 ${Number(p.relleno ?? 4)}px`;

  const estiloTabla = {
    width: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
    ...cssTexto(t)
  };
  const colgroup = (
    <colgroup>{columnas.map((c, i) => <col key={i} style={{ width: `${((Number(c.ancho) || 1) / total) * 100}%` }} />)}</colgroup>
  );
  const celdaBase = { padding: pad, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', verticalAlign: 'middle' };

  if (!columnas.length) {
    return <div className="doc-tabla-vacia">Tabla sin columnas</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {enc.mostrar && (
        <table style={{ ...estiloTabla, border: exterior }}>
          {colgroup}
          <thead>
            <tr style={{ height: Number(enc.alto) || 24 }}>
              {columnas.map((c, i) => (
                <th
                  key={i}
                  style={{
                    ...celdaBase,
                    ...bordeCelda(bordes, false, true, false),
                    background: enc.fondo || undefined,
                    color: enc.color || undefined,
                    fontWeight: enc.peso || 700,
                    fontSize: enc.tamano ? `${enc.tamano}px` : undefined,
                    letterSpacing: enc.espaciado ? `${enc.espaciado}px` : undefined,
                    textTransform: enc.mayus ? 'uppercase' : 'none',
                    textAlign: c.alinear || 'left',
                    borderBottomWidth: bordes.modo === 'todas' && enc.bordeGrueso ? `${(bordes.grosor || 1) * 1.6}px` : undefined
                  }}
                >
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      )}
      {enc.mostrar && Number(enc.separacion) > 0 && <div style={{ height: Number(enc.separacion) }} />}
      <table style={{ ...estiloTabla, border: exterior }}>
        {colgroup}
        <tbody>
          {filas.map((fila, fi) => {
            const alterna = filasCfg.fondoAlterno && (fi % 2 === (filasCfg.alternarPrimero === false ? 1 : 0));
            const colorFila = colorSigno(filasCfg, fila);
            return (
              <tr key={fi} style={{ height: Number(p.altoFila) || 22, background: alterna ? filasCfg.fondoAlterno : filasCfg.fondo || undefined, color: colorFila }}>
                {columnas.map((c, ci) => {
                  let valor = '';
                  let crudo = null;
                  if (fila) {
                    if (c.campo) {
                      crudo = fila[c.campo];
                      valor = crudo == null || crudo === '' ? '' : formatearValor(crudo, c.formato === 'insignia' ? 'numero3' : c.formato);
                    } else {
                      // Texto fijo, con datos del renglón: «Tarifa {n}», «{precio:monedaPeso} / m³».
                      crudo = interpolar(c.texto || '', datos, tipo, fila);
                      valor = c.formato && c.formato !== 'texto' ? formatearValor(crudo, c.formato) : crudo;
                    }
                  }
                  const vacio = fila && valor === '' && c.vacio;
                  const decoracion = c.decoracion || (c.formato === 'insignia' ? 'insignia' : '');
                  return (
                    <td
                      key={ci}
                      style={{
                        ...celdaBase,
                        ...bordeCelda(bordes, true, fi === 0 && !enc.mostrar, fi === filas.length - 1),
                        textAlign: c.alinear || 'left',
                        textTransform: filasCfg.mayus ? 'uppercase' : 'none',
                        color: vacio ? c.colorVacio || '#98a2b3' : c.color && !(colorFila && c.usarColorSigno !== false) ? c.color : undefined,
                        fontWeight: c.peso || undefined,
                        fontFamily: c.fuente ? fuenteCss(c.fuente) : undefined,
                        fontSize: c.tamano ? `${c.tamano}px` : undefined
                      }}
                    >
                      {vacio ? c.vacio : decoracion ? <Decoracion tipo={decoracion} valor={valor} c={c} /> : valor}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
