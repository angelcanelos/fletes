import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Save, X, Plus, Trash2, Loader2, TriangleAlert, Ban, CircleCheck,
  ClipboardList, Route, Percent, NotebookPen, Wallet
} from 'lucide-react';
import { Api } from '../lib/api.js';
import PageLayout from '../components/PageLayout.jsx';
import Panel from '../components/Panel.jsx';
import Campo from '../components/Campo.jsx';
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
  const [retencionActiva, setRetencionActiva] = useState(true);
  const [retencionBackup, setRetencionBackup] = useState(4);
  const [isrActivo, setIsrActivo] = useState(true);
  const [isrBackup, setIsrBackup] = useState(1.25);
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
          iva_rate_pct: f.iva_rate * 100,
          retencion_rate_pct: f.retencion_rate * 100,
          isr_rate_pct: f.isr_rate * 100,
          observaciones: f.observaciones || ''
        });
        setRetencionActiva(f.retencion_rate > 0);
        if (f.retencion_rate > 0) setRetencionBackup(f.retencion_rate * 100);
        setIsrActivo(f.isr_rate > 0);
        if (f.isr_rate > 0) setIsrBackup(f.isr_rate * 100);
      } else {
        // Si hay un fletero pre-seleccionado por URL, usar sus tasas del catálogo
        let retRate = (s.fletes_retencion_rate != null ? s.fletes_retencion_rate : 0.04);
        let isrRate = (s.fletes_isr_rate != null ? s.fletes_isr_rate : 0.0125);
        if (fleteroInicial) {
          const fleteros = parseFleteros(s);
          const fletero = fleteros.find((f) => f.nombre === fleteroInicial);
          if (fletero) {
            retRate = fletero.retencion ? 0.04 : 0;
            isrRate = fletero.isr ? 0.0125 : 0;
          }
        }
        setDatos((d) => ({
          ...d,
          fletero: fleteroInicial,
          iva_rate_pct: (s.fletes_iva_rate != null ? s.fletes_iva_rate : 0.16) * 100,
          retencion_rate_pct: retRate * 100,
          isr_rate_pct: isrRate * 100
        }));
        setRetencionActiva(retRate > 0);
        setRetencionBackup(retRate * 100);
        setIsrActivo(isrRate > 0);
        setIsrBackup(isrRate * 100);
      }
      setCargando(false);
    })();
  }, [id, esEdicion, fleteroInicial]);

  function campo(name, value) {
    setDatos((d) => {
      const nuevo = { ...d, [name]: value };
      // Cuando cambia el fletero, auto-llenar retención e ISR desde el catálogo
      if (name === 'fletero' && !esEdicion) {
        const fleteros = parseFleteros(settings);
        const fletero = fleteros.find((f) => f.nombre === value);
        if (fletero) {
          const retRate = fletero.retencion ? 0.04 : 0;
          const isrRate = fletero.isr ? 0.0125 : 0;
          nuevo.retencion_rate_pct = retRate * 100;
          nuevo.isr_rate_pct = isrRate * 100;
          setRetencionActiva(retRate > 0);
          setRetencionBackup(retRate * 100);
          setIsrActivo(isrRate > 0);
          setIsrBackup(isrRate * 100);
        }
      }
      return nuevo;
    });
  }

  function toggleRetencion() {
    if (retencionActiva) {
      setRetencionBackup(datos.retencion_rate_pct || retencionBackup);
      campo('retencion_rate_pct', 0);
    } else {
      campo('retencion_rate_pct', retencionBackup || 4);
    }
    setRetencionActiva(!retencionActiva);
  }

  function toggleIsr() {
    if (isrActivo) {
      setIsrBackup(datos.isr_rate_pct || isrBackup);
      campo('isr_rate_pct', 0);
    } else {
      campo('isr_rate_pct', isrBackup || 1.25);
    }
    setIsrActivo(!isrActivo);
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
      iva_rate: (parseFloat(datos.iva_rate_pct) || 0) / 100,
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
      subtitle="Llena los datos y revisa la vista previa: así se verá e imprimirá el comprobante."
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
              <Campo label="Estado">
                <select className="form-input" value={datos.estado} onChange={(e) => campo('estado', e.target.value)} onKeyDown={saltarAlSiguiente}>
                  <option value="guardado">Guardado</option>
                  <option value="pagado">Pagado</option>
                </select>
              </Campo>
            </div>
            <p className="mt-2.5 text-xs text-ink-500">
              El fletero se administra en Ajustes → Catálogos.
            </p>
          </Panel>

          <Panel titulo="Viajes (fecha, folio, paraje, grúa y metros)" icon={Route}>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr>
                    {['Fecha', 'Folio', 'Paraje', 'Grúa', 'Metros', ''].map((h) => (
                      <th key={h} className="px-2 py-1 text-left text-xs uppercase text-ink-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.lineas.map((l, i) => {
                    const opcionesParaje = parajes.some((p) => p.nombre === l.paraje) || !l.paraje
                      ? parajes
                      : [...parajes, { nombre: l.paraje }];
                    return (
                    <tr key={i}>
                      <td className="w-[170px] px-2 py-2"><input type="date" className="form-input w-full" value={l.fecha} onChange={(e) => lineaCampo(i, 'fecha', e.target.value)} onKeyDown={saltarAlSiguiente} /></td>
                      <td className="w-[150px] px-2 py-2"><input className="form-input w-full" placeholder="2212 0189" value={l.folio} onChange={(e) => lineaCampo(i, 'folio', e.target.value)} onKeyDown={saltarAlSiguiente} /></td>
                      <td className="min-w-[220px] px-2 py-2">
                        <select className="form-input w-full" value={l.paraje} onChange={(e) => lineaCampo(i, 'paraje', e.target.value)} onKeyDown={saltarAlSiguiente}>
                          <option value="">Selecciona…</option>
                          {opcionesParaje.map((p) => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                        </select>
                      </td>
                      <td className="w-[160px] px-2 py-2">
                        <select className="form-input w-full" value={l.grua} onChange={(e) => lineaCampo(i, 'grua', e.target.value)} onKeyDown={saltarAlSiguiente}>
                          <option value="">—</option>
                          {gruas.map((g) => <option key={g.grua} value={g.grua}>{g.grua}</option>)}
                        </select>
                      </td>
                      <td className="w-[130px] px-2 py-2"><input type="number" step="0.001" className="form-input w-full" placeholder="0" value={l.metros} onChange={(e) => lineaCampo(i, 'metros', e.target.value)} onKeyDown={saltarAlSiguiente} /></td>
                      <td className="w-[56px] px-2 py-2">
                        <BotonQuitar disabled={datos.lineas.length <= 1} onClick={() => quitarLinea(i)} title="Quitar viaje" />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2.5 text-xs text-ink-500">
              El paraje se administra en Ajustes → Catálogos.
            </p>
            <BotonAgregar onClick={agregarLinea}>Agregar viaje</BotonAgregar>
          </Panel>

          <Panel titulo="Precio e impuestos" icon={Percent}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <Campo label="Precio flete $">
                <input type="number" step="0.01" className="form-input" placeholder="0" value={datos.precio_flete} onChange={(e) => campo('precio_flete', e.target.value)} onKeyDown={saltarAlSiguiente} />
              </Campo>
              <Campo label="IVA %">
                <input type="number" step="0.01" className="form-input" value={datos.iva_rate_pct} onChange={(e) => campo('iva_rate_pct', e.target.value)} onKeyDown={saltarAlSiguiente} />
              </Campo>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-ink-800">Retención %</label>
                <input type="number" step="0.01" className="form-input w-full disabled:bg-surface-muted disabled:text-ink-400"
                  disabled={!retencionActiva} value={datos.retencion_rate_pct} onChange={(e) => campo('retencion_rate_pct', e.target.value)} onKeyDown={saltarAlSiguiente} />
                <button type="button" onClick={toggleRetencion}
                  className={`flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                    retencionActiva ? 'bg-danger-bg text-danger hover:bg-[#f6cfc9]' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                  }`}
                >
                  {retencionActiva ? <Ban className="h-3.5 w-3.5" strokeWidth={2.25} /> : <CircleCheck className="h-3.5 w-3.5" strokeWidth={2.25} />}
                  {retencionActiva ? 'Quitar retención' : 'Aplicar retención'}
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-ink-800">ISR %</label>
                <input type="number" step="0.0001" className="form-input w-full disabled:bg-surface-muted disabled:text-ink-400"
                  disabled={!isrActivo} value={datos.isr_rate_pct} onChange={(e) => campo('isr_rate_pct', e.target.value)} onKeyDown={saltarAlSiguiente} />
                <button type="button" onClick={toggleIsr}
                  className={`flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                    isrActivo ? 'bg-danger-bg text-danger hover:bg-[#f6cfc9]' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                  }`}
                >
                  {isrActivo ? <Ban className="h-3.5 w-3.5" strokeWidth={2.25} /> : <CircleCheck className="h-3.5 w-3.5" strokeWidth={2.25} />}
                  {isrActivo ? 'Quitar ISR' : 'Aplicar ISR'}
                </button>
              </div>
            </div>
            <p className="mt-2.5 text-xs text-ink-500">
              Cada viaje usa el precio de su propia grúa (catálogo en Ajustes). Si un flete trae viajes de
              varias grúas, el comprobante calcula el subtotal de metros y el total de cada una por separado.
              Este precio manual solo se usa si un viaje no tiene grúa del catálogo. La retención y el ISR
              son opcionales — algunos fletes no los llevan.
            </p>
          </Panel>

          <Panel titulo="Ajustes (descuentos o cargos adicionales)" icon={Wallet}>
            <p className="mb-3 text-xs text-ink-500">
              Agrega solo los ajustes que apliquen a este flete: por ejemplo un descuento o cualquier cargo
              extra. Un monto negativo se resta, uno positivo se suma; todos afectan el total.
            </p>
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
                        iva_rate: (parseFloat(datos.iva_rate_pct) || 0) / 100,
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
                      ivaRate={(parseFloat(datos.iva_rate_pct) || 0) / 100}
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
