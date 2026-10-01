import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Save, X, Plus, Trash2, Loader2, TriangleAlert,
  ClipboardList, Route, Percent, NotebookPen, Wallet
} from 'lucide-react';
import { Api } from '../lib/api.js';
import PageLayout from '../components/PageLayout.jsx';
import Panel from '../components/Panel.jsx';
import Campo from '../components/Campo.jsx';
import SwitchImpuesto from '../components/SwitchImpuesto.jsx';
import ReciboFlete from '../components/ReciboFlete.jsx';
import { useToast } from '../components/Toast.jsx';
import useZoomAjustado from '../hooks/useZoomAjustado.js';
import usePlantillaEnUso from '../hooks/usePlantillaEnUso.js';
import ReciboDinamico, { anchoRecibo } from '../components/ReciboDinamico.jsx';

const FT_ANCHO_NATURAL_PX = 719; // 19cm a 96dpi, ancho real de .ft-hoja

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function ceroVacio(v) {
  const n = parseFloat(v);
  return (!v && v !== 0) || n === 0 ? '' : v;
}

function parseGruas(settings) {
  try {
    const lista = JSON.parse(settings.gruas_json || '[]');
    if (Array.isArray(lista)) return lista.filter((g) => g && g.grua);
  } catch { /* ignora settings corruptos */ }
  return [];
}

function parseFleteros(settings) {
  try {
    const lista = JSON.parse(settings.fleteros_json || '[]');
    if (Array.isArray(lista)) return lista.filter((f) => f && f.nombre);
  } catch { /* ignora settings corruptos */ }
  return [];
}

function parseParajes(settings) {
  try {
    const lista = JSON.parse(settings.parajes_json || '[]');
    if (Array.isArray(lista)) return lista.filter((p) => p && p.nombre);
  } catch { /* ignora settings corruptos */ }
  return [];
}

const lineaVacia = { fecha: fechaHoy(), folio: '', paraje: '', grua: '', metros: '' };

const datosVacios = {
  fletero: '', fecha: fechaHoy(), estado: 'guardado',
  lineas: [{ ...lineaVacia }],
  precio_flete: '',
  ajustes: [],
  iva_rate_pct: 16, retencion_rate_pct: 4, isr_rate_pct: 1.25,
  observaciones: ''
};

// Tasas por defecto de Fletes en el catálogo (Ajustes).
function tasasCatalogo(s) {
  const tasa = (v, defecto) => (v != null ? Number(v) : defecto);
  return {
    iva: tasa(s.fletes_iva_rate, 0.16),
    retencion: tasa(s.fletes_retencion_rate, 0.04),
    isr: tasa(s.fletes_isr_rate, 0.0125)
  };
}

export default function FleteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const esEdicion = Boolean(id);
  const fleteroInicial = searchParams.get('fletero') || '';

  const [settings, setSettings] = useState({});
  const [datos, setDatos] = useState(datosVacios);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  // Los porcentajes vienen del catálogo (Ajustes); aquí solo se elige si
  // cada impuesto se aplica a este flete.
  const [ivaActivo, setIvaActivo] = useState(true);
  const [retencionActiva, setRetencionActiva] = useState(true);
  const [isrActivo, setIsrActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();
  // Si hay un diseño del Editor de Formatos en uso, la vista previa lo usa.
  const { plantilla: plantillaEnUso } = usePlantillaEnUso('flete');
  const [previewRef, previewZoom] = useZoomAjustado(plantillaEnUso ? anchoRecibo('flete', plantillaEnUso) : FT_ANCHO_NATURAL_PX);

  useEffect(() => {
    (async () => {
      const s = await Api.obtenerSettings();
      setSettings(s);

      if (esEdicion) {
        const f = await Api.obtenerFlete(id);
        setDatos({
          fletero: f.fletero, fecha: f.fecha, estado: f.estado || 'guardado',
          lineas: (f.lineas && f.lineas.length)
            ? f.lineas.map((l) => ({ ...l, metros: ceroVacio(l.metros) }))
            : [{ ...lineaVacia }],
          precio_flete: ceroVacio(f.precio_flete),
          ajustes: (f.ajustes || []).map((a) => ({ etiqueta: a.etiqueta, monto: ceroVacio(a.monto) })),
          iva_rate_pct: (f.iva_rate > 0 ? f.iva_rate : tasasCatalogo(s).iva) * 100,
          retencion_rate_pct: (f.retencion_rate > 0 ? f.retencion_rate : tasasCatalogo(s).retencion) * 100,
          isr_rate_pct: (f.isr_rate > 0 ? f.isr_rate : tasasCatalogo(s).isr) * 100,
          observaciones: f.observaciones || ''
        });
        setIvaActivo(f.iva_rate > 0);
        setRetencionActiva(f.retencion_rate > 0);
        setIsrActivo(f.isr_rate > 0);
      } else {
        const tasas = tasasCatalogo(s);
        setDatos((d) => ({
          ...d,
          fletero: fleteroInicial,
          iva_rate_pct: tasas.iva * 100,
          retencion_rate_pct: tasas.retencion * 100,
          isr_rate_pct: tasas.isr * 100
        }));
        setIvaActivo(tasas.iva > 0);
        // Si hay un fletero pre-seleccionado por URL, el catálogo dice si
        // lleva retención e ISR.
        const fletero = parseFleteros(s).find((f) => f.nombre === fleteroInicial);
        setRetencionActiva(fletero ? Boolean(fletero.retencion) : tasas.retencion > 0);
        setIsrActivo(fletero ? Boolean(fletero.isr) : tasas.isr > 0);
      }
      setCargando(false);
    })();
  }, [id, esEdicion, fleteroInicial]);

  function campo(name, value) {
    setDatos((d) => {
      const nuevo = { ...d, [name]: value };
      // Cuando cambia el fletero, el catálogo dice si lleva retención e ISR
      if (name === 'fletero' && !esEdicion) {
        const fletero = parseFleteros(settings).find((f) => f.nombre === value);
        if (fletero) {
          setRetencionActiva(Boolean(fletero.retencion));
          setIsrActivo(Boolean(fletero.isr));
        }
      }
      return nuevo;
    });
  }


  function saltarAlSiguiente(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.target.form || e.target.closest('form');
      if (!form) return;
      const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
      const idx = inputs.indexOf(e.target);
      if (idx >= 0 && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    }
  }

  function lineaCampo(idx, key, value) {
    setDatos((d) => {
      const lineas = d.lineas.map((l, i) => (i === idx ? { ...l, [key]: value } : l));
      let precioFlete = d.precio_flete;
      // Si aún no se ha puesto un precio de flete a mano, se sugiere el de
      // la grúa elegida en la primera línea.
      if (key === 'grua' && idx === 0 && !precioFlete) {
        const gruas = parseGruas(settings);
        const encontrada = gruas.find((g) => g.grua === value);
        if (encontrada && encontrada.precio_flete) precioFlete = encontrada.precio_flete;
      }
      return { ...d, lineas, precio_flete: precioFlete };
    });
  }

  function agregarLinea() {
    setDatos((d) => ({ ...d, lineas: [...d.lineas, { ...lineaVacia, grua: d.lineas[0]?.grua || '' }] }));
  }

  function quitarLinea(idx) {
    setDatos((d) => ({ ...d, lineas: d.lineas.filter((_, i) => i !== idx) }));
  }

  function ajusteCampo(idx, campoNombre, value) {
    setDatos((d) => {
      const ajustes = d.ajustes.map((a, i) => (i === idx ? { ...a, [campoNombre]: value } : a));
      return { ...d, ajustes };
    });
  }

  function agregarAjuste() {
    setDatos((d) => ({ ...d, ajustes: [...d.ajustes, { etiqueta: '', monto: '' }] }));
  }

  function quitarAjuste(idx) {
    setDatos((d) => ({ ...d, ajustes: d.ajustes.filter((_, i) => i !== idx) }));
  }

  async function guardar(e) {
    e.preventDefault();
    if (!datos.fletero.trim() || !datos.fecha) {
      setMensaje({ tipo: 'error', texto: 'Falta seleccionar el fletero o falta la fecha.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const payload = {
      fletero: datos.fletero.trim(),
      fecha: datos.fecha,
      estado: datos.estado,
      lineas: datos.lineas
        .filter((l) => (l.grua || '').trim() || (l.folio || '').trim() || (l.paraje || '').trim() || parseFloat(l.metros))
        .map((l) => ({ fecha: l.fecha, folio: (l.folio || '').trim(), paraje: (l.paraje || '').trim(), grua: (l.grua || '').trim(), metros: parseFloat(l.metros) || 0 })),
      precio_flete: parseFloat(datos.precio_flete) || 0,
      ajustes: datos.ajustes
        .filter((a) => (a.etiqueta || '').trim())
        .map((a) => ({ etiqueta: a.etiqueta.trim(), monto: parseFloat(a.monto) || 0 })),
      iva_rate: ivaActivo ? (parseFloat(datos.iva_rate_pct) || 0) / 100 : 0,
      retencion_rate: retencionActiva ? (parseFloat(datos.retencion_rate_pct) || 0) / 100 : 0,
      isr_rate: isrActivo ? (parseFloat(datos.isr_rate_pct) || 0) / 100 : 0,
      observaciones: (datos.observaciones || '').trim()
    };
    setGuardando(true);
    try {
      const guardado = esEdicion
        ? await Api.actualizarFlete(id, payload)
        : await Api.crearFlete(payload);
      toast.exito(esEdicion ? 'Cambios guardados correctamente.' : 'Flete guardado correctamente.');
      navigate(`/fletes/imprimir/${guardado.id}?nuevo=1`);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
      toast.error(err.message || 'No se pudo guardar el flete.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <PageLayout title={esEdicion ? 'Editar flete' : 'Nuevo flete'} ancho="completo">
        <div className="flex items-center justify-center gap-2.5 p-10 text-center text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
        </div>
      </PageLayout>
    );
  }

  const fleteros = parseFleteros(settings);
  const opcionesFletero = fleteros.some((f) => f.nombre === datos.fletero) || !datos.fletero
    ? fleteros
    : [...fleteros, { nombre: datos.fletero }];
  const gruas = parseGruas(settings);
  const parajes = parseParajes(settings);

  return (
    <PageLayout
      title={esEdicion ? 'Editar flete' : 'Nuevo flete'}
      ancho="completo"
    >
      {mensaje && (
        <div className={`mb-4 flex items-start gap-2.5 rounded-[10px] px-4 py-3 text-sm ${mensaje.tipo === 'error' ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'}`}>
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2.25} />
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <form onSubmit={guardar} className="min-w-0">
          <Panel titulo="Datos generales" icon={ClipboardList}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <Campo label="Fletero">
                <select className="form-input" required value={datos.fletero} onChange={(e) => campo('fletero', e.target.value)} onKeyDown={saltarAlSiguiente}>
                  <option value="" disabled>Selecciona un fletero…</option>
                  {opcionesFletero.map((f) => <option key={f.nombre} value={f.nombre}>{f.nombre}</option>)}
                </select>
              </Campo>
              <Campo label="Fecha del documento">
                <input type="date" className="form-input" required value={datos.fecha} onChange={(e) => campo('fecha', e.target.value)} onKeyDown={saltarAlSiguiente} />
              </Campo>
            </div>
          </Panel>

          <Panel titulo="Viajes (fecha, folio, paraje, grúa y metros)" icon={Route}>
            {/* Cada viaje es una fila que se acomoda sola: en pantallas anchas
                cabe completa y en las angostas grúa y metros bajan a una
                segunda línea, así los metros siempre se ven sin desplazarse. */}
            <div className="mt-1 flex flex-col gap-2.5">
              {datos.lineas.map((l, i) => {
                const opcionesParaje = parajes.some((p) => p.nombre === l.paraje) || !l.paraje
                  ? parajes
                  : [...parajes, { nombre: l.paraje }];
                return (
                  <div key={i} className="flex flex-wrap items-end gap-2 rounded-2xl border border-surface-border bg-surface-muted/40 p-3">
                    <CampoViaje label="Fecha" className="w-[140px]">
                      <input type="date" className="form-input w-full px-2.5" value={l.fecha} onChange={(e) => lineaCampo(i, 'fecha', e.target.value)} onKeyDown={saltarAlSiguiente} />
                    </CampoViaje>
                    <CampoViaje label="Folio" className="w-[110px]">
                      <input className="form-input w-full px-2.5" placeholder="2212 0189" value={l.folio} onChange={(e) => lineaCampo(i, 'folio', e.target.value)} onKeyDown={saltarAlSiguiente} />
                    </CampoViaje>
                    <CampoViaje label="Paraje" className="min-w-[180px] flex-1">
                      <select className="form-input w-full truncate px-2.5" value={l.paraje} onChange={(e) => lineaCampo(i, 'paraje', e.target.value)} onKeyDown={saltarAlSiguiente}>
                        <option value="">Selecciona…</option>
                        {opcionesParaje.map((p) => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                      </select>
                    </CampoViaje>
                    <CampoViaje label="Grúa" className="w-[120px]">
                      <select className="form-input w-full px-2.5" value={l.grua} onChange={(e) => lineaCampo(i, 'grua', e.target.value)} onKeyDown={saltarAlSiguiente}>
                        <option value="">—</option>
                        {gruas.map((g) => <option key={g.grua} value={g.grua}>{g.grua}</option>)}
                      </select>
                    </CampoViaje>
                    <CampoViaje label="Metros" className="w-[100px]">
                      <input type="number" step="0.001" className="form-input w-full px-2.5" placeholder="0" value={l.metros} onChange={(e) => lineaCampo(i, 'metros', e.target.value)} onKeyDown={saltarAlSiguiente} />
                    </CampoViaje>
                    <BotonQuitar disabled={datos.lineas.length <= 1} onClick={() => quitarLinea(i)} title="Quitar viaje" />
                  </div>
                );
              })}
            </div>
            <BotonAgregar onClick={agregarLinea}>Agregar viaje</BotonAgregar>
          </Panel>

          <Panel titulo="Precio e impuestos" icon={Percent}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <Campo label="Precio flete $">
                <input type="number" step="0.01" className="form-input" placeholder="0" value={datos.precio_flete} onChange={(e) => campo('precio_flete', e.target.value)} onKeyDown={saltarAlSiguiente} />
              </Campo>
            </div>
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <SwitchImpuesto nombre="IVA" porcentaje={datos.iva_rate_pct} activo={ivaActivo} onCambiar={setIvaActivo} />
              <SwitchImpuesto nombre="Retención" porcentaje={datos.retencion_rate_pct} activo={retencionActiva} onCambiar={setRetencionActiva} />
              <SwitchImpuesto nombre="ISR" porcentaje={datos.isr_rate_pct} activo={isrActivo} onCambiar={setIsrActivo} />
            </div>
          </Panel>

          <Panel titulo="Ajustes (descuentos o cargos adicionales)" icon={Wallet}>
            {datos.ajustes.length > 0 && (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Concepto', 'Monto $', ''].map((h) => (
                      <th key={h} className="px-2 py-1 text-left text-xs uppercase text-ink-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.ajustes.map((a, i) => (
                    <tr key={i}>
                      <td className="px-2 py-2"><input className="form-input w-full" placeholder="Ej. Descuento por adelanto" value={a.etiqueta} onChange={(e) => ajusteCampo(i, 'etiqueta', e.target.value)} onKeyDown={saltarAlSiguiente} /></td>
                      <td className="px-2 py-2"><input type="number" step="0.01" className="form-input w-full" placeholder="-500 o 200" value={a.monto} onChange={(e) => ajusteCampo(i, 'monto', e.target.value)} onKeyDown={saltarAlSiguiente} /></td>
                      <td className="px-2 py-2">
                        <BotonQuitar onClick={() => quitarAjuste(i)} title="Quitar ajuste" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <BotonAgregar onClick={agregarAjuste}>Agregar ajuste</BotonAgregar>
          </Panel>

          <Panel titulo="Observaciones (opcional, uso interno)" icon={NotebookPen}>
            <Campo label="">
              <textarea className="form-input" rows={3} placeholder="Notas internas, no se imprimen en el comprobante"
                value={datos.observaciones} onChange={(e) => campo('observaciones', e.target.value)} onKeyDown={saltarAlSiguiente} />
            </Campo>
          </Panel>

          <div className="mt-5 flex flex-wrap justify-end gap-2.5">
            <button type="button" className="btn-secondary" onClick={() => navigate('/fletes')}>
              <X className="h-4 w-4" strokeWidth={2.5} /> Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando
                ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                : <Save className="h-4 w-4" strokeWidth={2.5} />}
              {esEdicion ? 'Guardar cambios' : 'Guardar flete'}
            </button>
          </div>
        </form>

        <div className="min-w-0 lg:sticky lg:top-[90px]">
          <div className="rounded-panel bg-brand-50 p-[18px]">
            <h3 className="m-0 mb-3 text-[15px] text-brand-700">Vista previa</h3>
            <div ref={previewRef} className="flex justify-center rounded-panel bg-surface p-[20px_10px]">
              <div style={{ zoom: previewZoom }}>
                <div className="shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
                  {plantillaEnUso ? (
                    <ReciboDinamico
                      tipo="flete"
                      plantilla={plantillaEnUso}
                      modo="miniatura"
                      settings={settings}
                      gruas={gruas}
                      registro={{
                        fletero: datos.fletero,
                        fecha: datos.fecha,
                        lineas: datos.lineas,
                        precio_flete: datos.precio_flete,
                        ajustes: datos.ajustes,
                        iva_rate: ivaActivo ? (parseFloat(datos.iva_rate_pct) || 0) / 100 : 0,
                        retencion_rate: retencionActiva ? (parseFloat(datos.retencion_rate_pct) || 0) / 100 : 0,
                        isr_rate: isrActivo ? (parseFloat(datos.isr_rate_pct) || 0) / 100 : 0,
                        observaciones: datos.observaciones
                      }}
                    />
                  ) : (
                    <ReciboFlete
                      fletero={datos.fletero}
                      fecha={datos.fecha}
                      lineas={datos.lineas}
                      precioFlete={datos.precio_flete}
                      ajustes={datos.ajustes}
                      ivaRate={ivaActivo ? (parseFloat(datos.iva_rate_pct) || 0) / 100 : 0}
                      retencionRate={retencionActiva ? (parseFloat(datos.retencion_rate_pct) || 0) / 100 : 0}
                      isrRate={isrActivo ? (parseFloat(datos.isr_rate_pct) || 0) / 100 : 0}
                      gruasCatalog={gruas}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function CampoViaje({ label, className, children }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function BotonQuitar({ onClick, disabled, title }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-bg text-danger transition-colors hover:bg-[#f6cfc9] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" strokeWidth={2.25} />
    </button>
  );
}

function BotonAgregar({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 flex items-center gap-2 rounded-full bg-brand-50 px-5 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100"
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} /> {children}
    </button>
  );
}
