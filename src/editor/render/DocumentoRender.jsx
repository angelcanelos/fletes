import { memo, useEffect, useMemo, useRef } from 'react';
import {
  cssRelleno, cssRadio, cssSombra, cssTexto, RECORTES, ESTILO_TEXTO_DEFAULT, PAPELES, pxAMm, hijosDe
} from '../modelo.js';
import { calcularLayout } from '../layout.js';
import { formatearValor, campoInfo, interpolar } from '../campos.js';
import { ICONOS } from '../iconos.js';
import RenderTabla from './RenderTabla.jsx';

// Dibuja un documento del Editor de Formatos. Es el MISMO componente en el
// editor (modo 'editor': sin flujo, cada cosa donde se dibujó), en las
// miniaturas y vistas previas ('miniatura') y al imprimir ('impresion':
// con flujo de datos reales y reglas @page para el papel elegido).
//
// Cada elemento lleva data-el-id: el lienzo del editor lo usa para
// seleccionar, mover y redimensionar sobre el DOM real.

const ALINEAR_V = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

function estiloCaja(el, rect) {
  const e = el.estilo || {};
  const recorte = e.recorte && RECORTES[e.recorte] ? RECORTES[e.recorte].css : undefined;
  const sombra = cssSombra(e.sombra);
  const esSvg = el.tipo === 'poligono' || el.tipo === 'estrella' || el.tipo === 'linea';
  const borde = !esSvg && e.borde && Number(e.borde.grosor) > 0
    ? `${e.borde.grosor}px ${e.borde.tipo || 'solid'} ${e.borde.color || '#000'}`
    : undefined;
  return {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.w,
    height: rect.h,
    transform: el.rotacion ? `rotate(${el.rotacion}deg)` : undefined,
    opacity: el.opacidad != null && el.opacidad !== 1 ? el.opacidad : undefined,
    boxSizing: 'border-box',
    background: esSvg ? undefined : cssRelleno(e.relleno),
    border: borde,
    borderRadius: el.tipo === 'elipse' ? '50%' : cssRadio(e.radio),
    boxShadow: recorte || esSvg ? undefined : sombra,
    filter: [
      (recorte || esSvg) && sombra ? sombraAFiltro(e.sombra) : '',
      e.desenfoque ? `blur(${e.desenfoque}px)` : ''
    ].filter(Boolean).join(' ') || undefined,
    clipPath: recorte,
    padding: Array.isArray(e.padding) ? e.padding.map((v) => `${v || 0}px`).join(' ') : e.padding ? `${e.padding}px` : undefined,
    overflow: (el.tipo === 'contenedor' && e.recortarHijos) || el.tipo === 'imagen' || el.tipo === 'tabla' ? 'hidden' : undefined,
    mixBlendMode: e.mezcla && e.mezcla !== 'normal' ? e.mezcla : undefined
  };
}

function sombraAFiltro(sombras) {
  const lista = (Array.isArray(sombras) ? sombras : [sombras]).filter((s) => s && s.activa !== false && !s.interior);
  return lista.map((s) => `drop-shadow(${s.x || 0}px ${s.y || 0}px ${(s.blur || 0) / 2}px ${s.color || 'rgba(0,0,0,0.25)'})`).join(' ');
}

// Edición de texto en el lienzo (doble clic). Guarda lo escrito siempre
// que se sale de la edición: al perder el foco, con Esc, o cuando el
// editor la cierra al hacer clic en otra parte (en ese caso React desmonta
// el nodo antes de que llegue el "blur", por eso también se guarda al
// desmontar).
function TextoEditable({ texto, onCommit }) {
  const ref = useRef(null);
  const actual = useRef(texto);
  const guardado = useRef(false);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const guardar = () => {
    if (guardado.current) return;
    guardado.current = true;
    onCommitRef.current(actual.current);
  };

  const pendiente = useRef(null);
  useEffect(() => {
    // React (StrictMode) puede desmontar y volver a montar el efecto de
    // inmediato: el guardado "al desmontar" se difiere un instante y se
    // cancela si el componente sigue vivo.
    if (pendiente.current) { clearTimeout(pendiente.current); pendiente.current = null; }
    const n = ref.current;
    if (n) {
      n.focus();
      const sel = window.getSelection();
      const rango = document.createRange();
      rango.selectNodeContents(n);
      sel.removeAllRanges();
      sel.addRange(rango);
    }
    return () => { pendiente.current = setTimeout(guardar, 0); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="doc-texto-editando"
      style={{ whiteSpace: 'pre-wrap', outline: 'none', cursor: 'text', minWidth: 4 }}
      onPointerDown={(e) => e.stopPropagation()}
      onInput={(e) => { actual.current = e.currentTarget.innerText.replace(/\n$/, ''); }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); e.currentTarget.blur(); }
      }}
      onBlur={guardar}
    >
      {texto}
    </div>
  );
}

function ContenidoTexto({ el, texto, ctx }) {
  const t = { ...ESTILO_TEXTO_DEFAULT, ...(el.estilo.texto || {}) };
  const editando = ctx.editandoTextoId === el.id && el.tipo === 'texto';
  return (
    <div
      style={{
        ...cssTexto(t),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: ALINEAR_V[t.alinearV] || 'center',
        width: '100%',
        height: '100%'
      }}
    >
      {editando
        ? <TextoEditable texto={texto} onCommit={(v) => ctx.onTextoCambio && ctx.onTextoCambio(el.id, v)} />
        : (
          <div style={{ whiteSpace: t.multilinea ? 'pre-wrap' : 'pre', overflow: t.multilinea ? undefined : 'hidden', textOverflow: t.multilinea ? undefined : 'ellipsis', overflowWrap: 'break-word' }}>
            {texto}
          </div>
        )}
    </div>
  );
}

function textoCampo(el, ctx) {
  const p = el.props;
  if (ctx.mostrarNombres) {
    const info = campoInfo(ctx.tipo, p.campo);
    return `${p.prefijo || ''}{${info ? info.etiqueta : p.campo || 'sin campo'}}${p.sufijo || ''}`;
  }
  const v = formatearValor(ctx.datos ? ctx.datos[p.campo] : '', p.formato);
  if (v === '' && p.textoVacio) return interpolar(p.textoVacio, ctx.datos, ctx.tipo);
  return `${interpolar(p.prefijo || '', ctx.datos, ctx.tipo)}${v}${interpolar(p.sufijo || '', ctx.datos, ctx.tipo)}`;
}

function SvgForma({ el, rect }) {
  const e = el.estilo || {};
  const relleno = e.relleno || {};
  const borde = e.borde || {};
  const gid = `g_${el.id}`;
  const fill = !relleno.tipo || relleno.tipo === 'ninguno' ? 'none' : relleno.tipo === 'degradado' ? `url(#${gid})` : relleno.color;
  const stroke = Number(borde.grosor) > 0 ? borde.color || '#000' : 'none';
  const dash = borde.tipo === 'dashed' ? `${borde.grosor * 4} ${borde.grosor * 3}` : borde.tipo === 'dotted' ? `${borde.grosor} ${borde.grosor * 2}` : undefined;

  if (el.tipo === 'linea') {
    const flechaFin = el.props.flechaFin;
    const flechaIni = el.props.flechaInicio;
    const g = Number(borde.grosor) || 1;
    const mid = rect.h / 2;
    const m = g * 3;
    return (
      <svg width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
        <line x1={flechaIni ? m : 0} y1={mid} x2={flechaFin ? rect.w - m : rect.w} y2={mid} stroke={borde.color || '#000'} strokeWidth={g} strokeDasharray={dash} strokeLinecap={el.props.extremo || 'butt'} />
        {flechaFin && <polygon points={`${rect.w},${mid} ${rect.w - m * 1.4},${mid - m} ${rect.w - m * 1.4},${mid + m}`} fill={borde.color || '#000'} />}
        {flechaIni && <polygon points={`0,${mid} ${m * 1.4},${mid - m} ${m * 1.4},${mid + m}`} fill={borde.color || '#000'} />}
      </svg>
    );
  }

  let puntos = [];
  if (el.tipo === 'poligono') {
    const n = Math.max(3, Number(el.props.lados) || 3);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      puntos.push([50 + 50 * Math.cos(a), 50 + 50 * Math.sin(a)]);
    }
  } else {
    const n = Math.max(3, Number(el.props.puntas) || 5);
    const ri = Math.min(0.95, Math.max(0.05, Number(el.props.radioInterior) || 0.45));
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      const r = i % 2 === 0 ? 50 : 50 * ri;
      puntos.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
    }
  }
  // Ajusta el polígono para que llene la caja completa (un triángulo
  // regular no ocupa todo el alto de su círculo).
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  puntos = puntos.map(([x, y]) => [((x - x0) / (x1 - x0)) * 100, ((y - y0) / (y1 - y0)) * 100]);

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible', display: 'block' }}>
      {relleno.tipo === 'degradado' && (
        <defs>
          <linearGradient id={gid} gradientTransform={`rotate(${(relleno.angulo ?? 180) - 90} 0.5 0.5)`}>
            <stop offset="0" stopColor={relleno.color || '#fff'} />
            <stop offset="1" stopColor={relleno.color2 || '#000'} />
          </linearGradient>
        </defs>
      )}
      <polygon
        points={puntos.map((p) => p.join(',')).join(' ')}
        fill={fill}
        stroke={stroke}
        strokeWidth={Number(borde.grosor) || 0}
        strokeDasharray={dash}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ImagenEl({ el, ctx }) {
  const p = el.props;
  let src = p.src;
  if (p.campo) src = ctx.datos ? ctx.datos[p.campo] : '';
  else if (p.recursoId) {
    const r = ctx.recursos.find((x) => x.id === p.recursoId);
    src = r ? r.dataUrl : '';
  }
  if (!src) {
    return ctx.modo === 'editor'
      ? <div className="doc-imagen-vacia">Imagen</div>
      : null;
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{ width: '100%', height: '100%', objectFit: p.ajuste || 'contain', display: 'block', pointerEvents: 'none' }}
      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
    />
  );
}

function Elemento({ el, ctx }) {
  const rect = ctx.rects.get(el.id);
  if (!rect || !rect.visible) return null;
  const hijos = el.tipo === 'contenedor' || el.tipo === 'grupo' ? hijosDe(ctx.elementos, el.id) : null;

  let contenido = null;
  switch (el.tipo) {
    case 'texto': {
      // Los textos pueden llevar datos incrustados: «Total ({num_viajes} viajes)».
      const crudo = el.props.texto || '';
      const editando = ctx.editandoTextoId === el.id;
      contenido = <ContenidoTexto el={el} texto={editando || ctx.mostrarNombres ? crudo : interpolar(crudo, ctx.datos, ctx.tipo)} ctx={ctx} />;
      break;
    }
    case 'icono': {
      const def = ICONOS[el.props.icono] || ICONOS.dolar;
      const Icono = def.c;
      contenido = <Icono width="100%" height="100%" color={el.props.color || '#111'} strokeWidth={el.props.trazo ?? 2} style={{ display: 'block' }} />;
      break;
    }
    case 'campo':
      contenido = <ContenidoTexto el={el} texto={textoCampo(el, ctx)} ctx={ctx} />;
      break;
    case 'imagen':
      contenido = <ImagenEl el={el} ctx={ctx} />;
      break;
    case 'tabla':
      contenido = <RenderTabla el={el} datos={ctx.datos} tipo={ctx.tipo} />;
      break;
    case 'linea':
    case 'poligono':
    case 'estrella':
      contenido = <SvgForma el={el} rect={rect} />;
      break;
    default:
      break;
  }

  const clases = ['doc-el', `doc-el--${el.tipo}`];
  if (!el.padreId) clases.push('doc-el--raiz');
  if (el.bloqueado) clases.push('doc-el--bloqueado');

  const estilo = estiloCaja(el, rect);
  // "Ancho automático": con datos reales la caja crece si el texto no cabe
  // (como las cajas de grúa y fecha del formato original).
  if (el.props.anchoAuto && ctx.modo !== 'editor' && (el.tipo === 'campo' || el.tipo === 'texto')) {
    estilo.width = 'max-content';
    estilo.minWidth = rect.w;
  }

  return (
    <div data-el-id={el.id} className={clases.join(' ')} style={estilo}>
      {contenido}
      {hijos && hijos.map((h) => <Elemento key={h.id} el={h} ctx={ctx} />)}
    </div>
  );
}

// Tamaño del papel y escala para imprimir.
export function medidasImpresion(pagina, altoPx) {
  const imp = pagina.impresion || {};
  const anchoMm = pxAMm(pagina.ancho);
  const altoMm = pxAMm(altoPx);
  if (!imp.papel || imp.papel === 'igual') return { ancho: anchoMm, alto: altoMm, margen: 0, escala: 1 };
  const papel = PAPELES[imp.papel] || PAPELES.carta;
  const horizontal = imp.orientacion === 'horizontal';
  const ancho = horizontal ? papel.alto : papel.ancho;
  const alto = horizontal ? papel.ancho : papel.alto;
  const margen = Number(imp.margen ?? 6);
  const escala = imp.ajustar
    ? Math.min((ancho - margen * 2) / anchoMm, (alto - margen * 2) / altoMm)
    : 1;
  return { ancho, alto, margen, escala: Math.max(0.1, escala) };
}

function DocumentoRender({
  doc, datos, tipo, modo = 'impresion', mostrarNombres = false, editandoTextoId = null, onTextoCambio, className = '', paginaRef
}) {
  const flujo = modo !== 'editor';
  const { rects, altoPagina } = useMemo(() => calcularLayout(doc, datos, { flujo }), [doc, datos, flujo]);
  const raiz = hijosDe(doc.elementos, null);
  const ctx = {
    rects, datos, tipo, modo, mostrarNombres, editandoTextoId, onTextoCambio,
    elementos: doc.elementos, recursos: doc.recursos || []
  };
  const imp = modo === 'impresion' ? medidasImpresion(doc.pagina, altoPagina) : null;
  const estiloPagina = doc.pagina.estilo || {};

  return (
    <>
      {imp && (
        <style>{`@media print{
  @page{ size: ${imp.ancho}mm ${imp.alto}mm; margin: ${imp.margen}mm; }
  html, body{ background:#fff !important; }
  .doc-hoja-imp{ zoom: ${imp.escala}; box-shadow:none !important; margin:0 auto !important; }
  .doc-hoja-imp, .doc-hoja-imp *{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`}</style>
      )}
      <div
        ref={paginaRef}
        data-doc-pagina=""
        className={`doc-hoja ${imp ? 'doc-hoja-imp' : ''} ${className}`}
        style={{
          position: 'relative',
          width: doc.pagina.ancho,
          height: altoPagina,
          // La página es como un Frame de Figma: relleno, borde, esquinas y sombra.
          background: cssRelleno(estiloPagina.relleno) || doc.pagina.fondo || '#fff',
          border: estiloPagina.borde && Number(estiloPagina.borde.grosor) > 0 ? `${estiloPagina.borde.grosor}px ${estiloPagina.borde.tipo || 'solid'} ${estiloPagina.borde.color || '#000'}` : undefined,
          borderRadius: cssRadio(estiloPagina.radio),
          boxShadow: cssSombra(estiloPagina.sombra),
          overflow: modo === 'editor' && !estiloPagina.recortar ? 'visible' : 'hidden',
          color: '#111',
          fontFamily: 'Arial, Helvetica, sans-serif',
          boxSizing: 'border-box'
        }}
      >
        {raiz.map((el) => <Elemento key={el.id} el={el} ctx={ctx} />)}
      </div>
    </>
  );
}

export default memo(DocumentoRender);
