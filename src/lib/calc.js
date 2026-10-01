// Cálculo del formato de extracción.
// Géneros y ajustes son listas de largo variable:
//   generos: [{ nombre, metros, precio }, ...]
//   ajustes: [{ etiqueta, monto }, ...]  (monto puede ser negativo = descuento,
//                                          positivo = un cargo extra)

function num(v) {
  v = parseFloat(v);
  return isNaN(v) ? 0 : v;
}

export function calcularFormato(data) {
  const d = data || {};
  const ivaRate = d.iva_rate != null ? num(d.iva_rate) : 0.16;
  const isrRate = d.isr_rate != null ? num(d.isr_rate) : 0.0125;

  const generos = (d.generos || []).map((g) => {
    const metros = num(g.metros);
    const precio = num(g.precio);
    return { nombre: g.nombre, metros, precio, total: metros * precio };
  });
  const ajustes = (d.ajustes || []).map((a) => ({
    etiqueta: a.etiqueta,
    monto: num(a.monto)
  }));

  const totalGeneros = generos.reduce((s, g) => s + g.total, 0);
  const totalAjustes = ajustes.reduce((s, a) => s + a.monto, 0);
  const subtotal = totalGeneros + totalAjustes;
  const iva = subtotal * ivaRate;
  const isr = subtotal * isrRate;
  const totalNeto = subtotal + iva - isr;
  const saldoFavor = totalNeto;

  return {
    generos, ajustes,
    totalGeneros, totalAjustes, subtotal,
    ivaRate, isrRate, iva, isr,
    totalNeto, saldoFavor
  };
}

// Cálculo del flete de madera en rollo.
//   lineas: [{ fecha, folio, paraje, grua, metros }, ...]
//   precios_por_grua: { 'GRUA 1': 290.76, ... } — precio del catálogo de
//     grúas (Ajustes). Si una línea trae una grúa que está en el catálogo,
//     su precio manda; si no (grúa vacía o sin catálogo), se usa
//     precio_flete como valor por defecto. Esto permite un flete con
//     viajes de varias grúas distintas, cada una a su propio precio.
export function calcularFlete(data) {
  const d = data || {};
  const ivaRate = d.iva_rate != null ? num(d.iva_rate) : 0.16;
  const retencionRate = d.retencion_rate != null ? num(d.retencion_rate) : 0.04;
  const isrRate = d.isr_rate != null ? num(d.isr_rate) : 0.0125;
  const precioFleteDefault = num(d.precio_flete);
  const preciosPorGrua = d.precios_por_grua || {};

  const lineas = (d.lineas || []).map((l) => {
    const metros = num(l.metros);
    const grua = (l.grua || '').trim();
    const precio = (grua && preciosPorGrua[grua] != null) ? num(preciosPorGrua[grua]) : precioFleteDefault;
    return { ...l, metros, grua, precio };
  });

  // Agrupa viajes consecutivos de la misma grúa (al mismo precio) para
  // mostrar un subtotal de metros por grúa, como en el comprobante físico
  // cuando un fletero trae viajes de varias grúas en el mismo periodo.
  const grupos = [];
  lineas.forEach((l, i) => {
    const anterior = grupos[grupos.length - 1];
    if (anterior && anterior.grua === l.grua && anterior.precio === l.precio) {
      anterior.metros += l.metros;
      anterior.importe = anterior.metros * anterior.precio;
      anterior.finIndex = i;
    } else {
      grupos.push({ grua: l.grua, precio: l.precio, metros: l.metros, importe: l.metros * l.precio, inicioIndex: i, finIndex: i });
    }
  });

  const ajustes = (d.ajustes || []).map((a) => ({ etiqueta: a.etiqueta, monto: num(a.monto) }));
  const totalAjustes = ajustes.reduce((s, a) => s + a.monto, 0);

  const totalMetros = lineas.reduce((s, l) => s + l.metros, 0);
  const totalFlete = grupos.reduce((s, g) => s + g.importe, 0);
  const subtotal = totalFlete + totalAjustes;
  const iva = subtotal * ivaRate;
  const retencion = subtotal * retencionRate;
  const isr = subtotal * isrRate;
  const total = subtotal + iva - retencion - isr;

  return {
    lineas, grupos, ajustes, totalAjustes, totalMetros, precioFlete: precioFleteDefault, totalFlete, subtotal,
    ivaRate, retencionRate, isrRate, iva, retencion, isr,
    total, saldoFavor: total
  };
}

export function formatoMoneda(v) {
  const n = num(v);
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatoMonedaConSigno(v) {
  const n = num(v);
  const texto = Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : '+'}$${texto}`;
}

export function fechaLargaEs(iso) {
  if (!iso) return '';
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const [y, m, d] = iso.split('-').map(Number);
  return `AL ${d} ${meses[m - 1]} ${y}`;
}

export function fechaCortaEs(iso) {
  if (!iso) return '';
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${meses[m - 1]} ${y}`;
}

export function fechaLegible(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d}/${meses[parseInt(m, 10) - 1]}/${y}`;
}
