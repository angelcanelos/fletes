import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Save, X, Plus, Trash2, Loader2, TriangleAlert,
  ClipboardList, Trees, Wallet, Percent, NotebookPen
} from 'lucide-react';
import { Api } from '../lib/api.js';
import { fechaLargaEs } from '../lib/calc.js';
import PageLayout from '../components/PageLayout.jsx';
import Panel from '../components/Panel.jsx';
import Campo from '../components/Campo.jsx';
import SwitchImpuesto from '../components/SwitchImpuesto.jsx';
import ReciboFormato from '../components/ReciboFormato.jsx';
import { useToast } from '../components/Toast.jsx';
import useZoomAjustado from '../hooks/useZoomAjustado.js';
import usePlantillaEnUso from '../hooks/usePlantillaEnUso.js';
import ReciboDinamico, { anchoRecibo } from '../components/ReciboDinamico.jsx';

const F_ANCHO_NATURAL_PX = 397; // 10.5cm a 96dpi, ancho real de .hoja

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

// Un valor en 0 se muestra vacío (con "0" como placeholder) para no
// obligar a borrar el cero cada vez que se quiere escribir un dato.
function ceroVacio(v) {
  const n = parseFloat(v);
  return (!v && v !== 0) || n === 0 ? '' : v;
}

function generosPorDefecto(settings) {
  try {
    const lista = JSON.parse(settings.generos_default_json || '[]');
    if (Array.isArray(lista) && lista.length) {
      return lista.map((g) => ({ nombre: g.nombre || 'GENERO', metros: '', precio: ceroVacio(g.precio) }));
    }
  } catch { /* ignora settings corruptos */ }
  return [{ nombre: 'PINO', metros: '', precio: '' }];
}

function parseGruas(settings) {
  try {
    const lista = JSON.parse(settings.gruas_json || '[]');
    if (Array.isArray(lista)) return lista.filter((g) => g && g.grua);
  } catch { /* ignora settings corruptos */ }
  return [];
}

function parseDestinos(settings) {
  try {
    const lista = JSON.parse(settings.destinos_json || '[]');
    if (Array.isArray(lista)) return lista.filter((d) => d && d.nombre);
  } catch { /* ignora settings corruptos */ }
  return [];
}

function primerDestino(settings) {
  const lista = parseDestinos(settings);
  return lista[0] ? lista[0].nombre : 'FORESTAL TEZAINS';
}

const datosVacios = {
  productor: '', grua: '', destino: '', fecha: fechaHoy(), estado: 'guardado',
  generos: [],
  ajustes: [],
  iva_rate_pct: 16, isr_rate_pct: 1.25,
  observaciones: ''
};

// Tasas por defecto del catálogo (Ajustes).
function ivaCatalogo(s) {
  return s.iva_rate != null ? Number(s.iva_rate) : 0.16;
}
function isrCatalogo(s) {
  return s.isr_rate != null ? Number(s.isr_rate) : 0.0125;
}

export default function FormatoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);
  // Desde el atajo de Inicio llega ?grua=... para empezar con esa grúa puesta.
  const [searchParams] = useSearchParams();
  const gruaInicial = searchParams.get('grua') || '';

  const [settings, setSettings] = useState({});
  const [datos, setDatos] = useState(datosVacios);
  const [fscTexto, setFscTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  // Los porcentajes vienen del catálogo (Ajustes); aquí solo se elige si
  // cada impuesto se aplica a esta extracción.
  const [ivaActivo, setIvaActivo] = useState(true);
  const [isrActivo, setIsrActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();
  // Si hay un diseño del Editor de Formatos en uso, la vista previa lo usa.
  const { plantilla: plantillaEnUso } = usePlantillaEnUso('extraccion');
  const [previewRef, previewZoom] = useZoomAjustado(plantillaEnUso ? anchoRecibo('extraccion', plantillaEnUso) : F_ANCHO_NATURAL_PX);

  useEffect(() => {
    (async () => {
      const s = await Api.obtenerSettings();
      setSettings(s);
      setFscTexto(s.fsc_texto || '');

      if (esEdicion) {
        const f = await Api.obtenerFormato(id);
        const generos = (f.generos && f.generos.length) ? f.generos : generosPorDefecto(s);
        setDatos({
          productor: f.productor, grua: f.grua, destino: f.destino || primerDestino(s), fecha: f.fecha, estado: f.estado || 'guardado',
          generos: generos.map((g) => ({ nombre: g.nombre, metros: ceroVacio(g.metros), precio: ceroVacio(g.precio) })),
          ajustes: (f.ajustes || []).map((a) => ({ etiqueta: a.etiqueta, monto: ceroVacio(a.monto) })),
          iva_rate_pct: (f.iva_rate > 0 ? f.iva_rate : ivaCatalogo(s)) * 100,
          isr_rate_pct: (f.isr_rate > 0 ? f.isr_rate : isrCatalogo(s)) * 100,
          observaciones: f.observaciones || ''
        });
        setFscTexto(f.producto_fsc || s.fsc_texto || '');
        setIvaActivo(f.iva_rate > 0);
        setIsrActivo(f.isr_rate > 0);
      } else {
        const gruaElegida = gruaInicial ? parseGruas(s).find((g) => g.grua === gruaInicial) : null;
        setDatos((d) => ({
          ...d,
          ...(gruaElegida ? { grua: gruaElegida.grua, productor: gruaElegida.productor || '' } : {}),
          generos: generosPorDefecto(s),
          destino: primerDestino(s),
          iva_rate_pct: ivaCatalogo(s) * 100,
          isr_rate_pct: isrCatalogo(s) * 100
        }));
        setIvaActivo(ivaCatalogo(s) > 0);
        setIsrActivo(isrCatalogo(s) > 0);
      }
      setCargando(false);
    })();
  }, [id, esEdicion]);

  function campo(name, value) {
    setDatos((d) => ({ ...d, [name]: value }));
  }

  function seleccionarGrua(nombreGrua) {
    const gruas = parseGruas(settings);
    const encontrada = gruas.find((g) => g.grua === nombreGrua);
    setDatos((d) => ({ ...d, grua: nombreGrua, productor: encontrada ? encontrada.productor : d.productor }));
  }


  function generoCampo(idx, campoNombre, value) {
    setDatos((d) => {
      const generos = d.generos.map((g, i) => (i === idx ? { ...g, [campoNombre]: value } : g));
      return { ...d, generos };
    });
  }

  function agregarGenero() {
    setDatos((d) => ({ ...d, generos: [...d.generos, { nombre: '', metros: '', precio: '' }] }));
  }

  function quitarGenero(idx) {
    setDatos((d) => ({ ...d, generos: d.generos.filter((_, i) => i !== idx) }));
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
    if (!datos.grua.trim() || !datos.productor.trim() || !datos.fecha) {
      setMensaje({ tipo: 'error', texto: 'Falta seleccionar la grúa o falta la fecha.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const payload = {
      productor: datos.productor.trim(),
      grua: datos.grua.trim(),
      destino: (datos.destino || '').trim() || primerDestino(settings),
      fecha: datos.fecha,
      estado: datos.estado,
      producto_fsc: settings.fsc_texto || '',
      generos: datos.generos
        .map((g) => ({ nombre: (g.nombre || '').trim() || 'GENERO', metros: parseFloat(g.metros) || 0, precio: parseFloat(g.precio) || 0 })),
      ajustes: datos.ajustes
        .filter((a) => (a.etiqueta || '').trim())
        .map((a) => ({ etiqueta: a.etiqueta.trim(), monto: parseFloat(a.monto) || 0 })),
      iva_rate: ivaActivo ? (parseFloat(datos.iva_rate_pct) || 0) / 100 : 0,
      isr_rate: isrActivo ? (parseFloat(datos.isr_rate_pct) || 0) / 100 : 0,
      observaciones: (datos.observaciones || '').trim()
    };
    setGuardando(true);
    try {
      const guardado = esEdicion
        ? await Api.actualizarFormato(id, payload)
        : await Api.crearFormato(payload);
      toast.exito(esEdicion ? 'Cambios guardados correctamente.' : 'Extracción guardada correctamente.');
      navigate(`/extraccion/imprimir/${guardado.id}?nuevo=1`);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
      toast.error(err.message || 'No se pudo guardar la extracción.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <PageLayout title={esEdicion ? 'Editar extracción' : 'Nueva extracción'}>
        <div className="flex items-center justify-center gap-2.5 p-10 text-center text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
        </div>
      </PageLayout>
    );
  }

  const gruas = parseGruas(settings);
  // Si el formato (al editar) tiene una grúa que ya no está en la lista de
  // Ajustes, se agrega igual como opción para no perder el dato guardado.
  const opcionesGrua = gruas.some((g) => g.grua === datos.grua) || !datos.grua
    ? gruas
    : [...gruas, { grua: datos.grua, productor: datos.productor }];

  return (
    <PageLayout
      title={esEdicion ? 'Editar extracción' : 'Nueva extracción'}
    >
      {mensaje && (
        <div className={`mb-4 flex items-start gap-2.5 rounded-[10px] px-4 py-3 text-sm ${mensaje.tipo === 'error' ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'}`}>
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2.25} />
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <form onSubmit={guardar}>
          <Panel titulo="Datos generales" icon={ClipboardList}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <Campo label="Grúa">
                <select className="form-input" required value={datos.grua} onChange={(e) => seleccionarGrua(e.target.value)}>
                  <option value="" disabled>Selecciona una grúa…</option>
                  {opcionesGrua.map((g) => <option key={g.grua} value={g.grua}>{g.grua}</option>)}
                </select>
              </Campo>
              <Campo label="Productor">
                <div className="form-input flex items-center bg-surface-muted text-ink-800">
                  {datos.productor || <span className="text-ink-400">Se llena al elegir la grúa</span>}
                </div>
              </Campo>
              <Campo label="Destino">
                <select className="form-input" value={datos.destino} onChange={(e) => campo('destino', e.target.value)}>
                  {parseDestinos(settings).map((d) => <option key={d.nombre} value={d.nombre}>{d.nombre}</option>)}
                </select>
              </Campo>
              <Campo label="Fecha">
                <input type="date" className="form-input" required value={datos.fecha} onChange={(e) => campo('fecha', e.target.value)} />
              </Campo>
            </div>
          </Panel>

          <Panel titulo="Géneros (metros y precio)" icon={Trees}>
            <table className="mt-2 w-full border-collapse">
              <thead>
                <tr>
                  {['Género', 'Metros', 'Precio $', ''].map((h) => (
                    <th key={h} className="px-2 py-1 text-left text-xs uppercase text-ink-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.generos.map((g, i) => (
                  <tr key={i}>
                    <td className="px-2 py-2"><input className="form-input w-full" placeholder="Ej. DOBLE ARRASTRE" value={g.nombre} onChange={(e) => generoCampo(i, 'nombre', e.target.value)} /></td>
                    <td className="px-2 py-2"><input type="number" step="0.001" className="form-input w-full" placeholder="0" value={g.metros} onChange={(e) => generoCampo(i, 'metros', e.target.value)} /></td>
                    <td className="px-2 py-2"><input type="number" step="0.01" className="form-input w-full" placeholder="0" value={g.precio} onChange={(e) => generoCampo(i, 'precio', e.target.value)} /></td>
                    <td className="px-2 py-2">
                      <BotonQuitar disabled={datos.generos.length <= 1} onClick={() => quitarGenero(i)} title="Quitar género" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <BotonAgregar onClick={agregarGenero}>Agregar género</BotonAgregar>
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
                      <td className="px-2 py-2"><input className="form-input w-full" placeholder="Ej. Descuento combustible" value={a.etiqueta} onChange={(e) => ajusteCampo(i, 'etiqueta', e.target.value)} /></td>
                      <td className="px-2 py-2"><input type="number" step="0.01" className="form-input w-full" placeholder="-500 o 200" value={a.monto} onChange={(e) => ajusteCampo(i, 'monto', e.target.value)} /></td>
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

          <Panel titulo="Impuestos" icon={Percent}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              <SwitchImpuesto nombre="IVA" porcentaje={datos.iva_rate_pct} activo={ivaActivo} onCambiar={setIvaActivo} />
              <SwitchImpuesto nombre="ISR" porcentaje={datos.isr_rate_pct} activo={isrActivo} onCambiar={setIsrActivo} />
            </div>
          </Panel>

          <Panel titulo="Observaciones (opcional, uso interno)" icon={NotebookPen}>
            <Campo label="">
              <textarea className="form-input" rows={3} placeholder="Notas internas, no se imprimen"
                value={datos.observaciones} onChange={(e) => campo('observaciones', e.target.value)} />
            </Campo>
          </Panel>

          <div className="mt-5 flex flex-wrap justify-end gap-2.5">
            <button type="button" className="btn-secondary" onClick={() => navigate('/extraccion')}>
              <X className="h-4 w-4" strokeWidth={2.5} /> Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando
                ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                : <Save className="h-4 w-4" strokeWidth={2.5} />}
              {esEdicion ? 'Guardar cambios' : 'Guardar extracción'}
            </button>
          </div>
        </form>

        <div className="lg:sticky lg:top-[90px]">
          <div className="rounded-panel bg-brand-50 p-[18px]">
            <h3 className="m-0 mb-3 text-[15px] text-brand-700">Vista previa</h3>
            <div ref={previewRef} className="flex justify-center rounded-panel bg-surface p-[20px_10px]">
              <div style={{ zoom: previewZoom }}>
                <div className="shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
                  {plantillaEnUso ? (
                    <ReciboDinamico
                      tipo="extraccion"
                      plantilla={plantillaEnUso}
                      modo="miniatura"
                      settings={settings}
                      registro={{
                        productor: datos.productor,
                        grua: datos.grua,
                        fecha: datos.fecha,
                        producto_fsc: fscTexto,
                        destino: datos.destino,
                        generos: datos.generos,
                        ajustes: datos.ajustes,
                        iva_rate: ivaActivo ? (parseFloat(datos.iva_rate_pct) || 0) / 100 : 0,
                        isr_rate: isrActivo ? (parseFloat(datos.isr_rate_pct) || 0) / 100 : 0,
                        observaciones: datos.observaciones
                      }}
                    />
                  ) : (
                    <ReciboFormato
                      productor={datos.productor}
                      grua={datos.grua}
                      fechaTexto={fechaLargaEs(datos.fecha)}
                      productoFsc={fscTexto}
                      etiquetaExtra={datos.destino}
                      generos={datos.generos}
                      ajustes={datos.ajustes}
                      ivaRate={ivaActivo ? (parseFloat(datos.iva_rate_pct) || 0) / 100 : 0}
                      isrRate={isrActivo ? (parseFloat(datos.isr_rate_pct) || 0) / 100 : 0}
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
