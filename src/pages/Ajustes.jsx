import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2, Percent, Trees, Truck, MapPin, UserRound, Mountain,
  Loader2, ChevronRight, Pencil
} from 'lucide-react';
import { Tooltip } from '@heroui/react';
import { Api } from '../lib/api.js';
import PageLayout from '../components/PageLayout.jsx';
import DialogoEditar from '../components/DialogoEditar.jsx';
import CatalogoEditor from '../components/CatalogoEditor.jsx';
import { useToast } from '../components/Toast.jsx';

function parseJson(json, fallback) {
  try {
    const lista = JSON.parse(json || '[]');
    if (Array.isArray(lista) && lista.length) return lista;
  } catch { /* ignora settings corruptos */ }
  return fallback;
}

function pctTexto(v) {
  return (Number(v) || 0).toLocaleString('es-MX', { maximumFractionDigits: 4 });
}

// Datos generales: cómo se muestran, cómo se editan y con qué clave se
// guardan en settings (los porcentajes se guardan como fracción).
const CAMPOS_GENERALES = {
  empresa_nombre: { label: 'Nombre de la empresa', tipo: 'text', clave: 'empresa_nombre' },
  fsc_texto: { label: 'Texto del producto FSC', tipo: 'text', clave: 'fsc_texto', ayuda: 'Se imprime en el recuadro FSC de las extracciones.' },
  iva_rate_pct: { label: 'IVA', tipo: 'pct', clave: 'iva_rate' },
  retencion_rate_pct: { label: 'Retención', tipo: 'pct', clave: 'retencion_rate' },
  isr_rate_pct: { label: 'ISR', tipo: 'pct', clave: 'isr_rate', step: '0.0001' },
  fletes_iva_rate_pct: { label: 'IVA', tipo: 'pct', clave: 'fletes_iva_rate' },
  fletes_retencion_rate_pct: { label: 'Retención', tipo: 'pct', clave: 'fletes_retencion_rate' },
  fletes_isr_rate_pct: { label: 'ISR', tipo: 'pct', clave: 'fletes_isr_rate', step: '0.0001' }
};

const generalVacio = {
  empresa_nombre: '', fsc_texto: '',
  iva_rate_pct: 16, retencion_rate_pct: 4, isr_rate_pct: 1.25,
  fletes_iva_rate_pct: 16, fletes_retencion_rate_pct: 4, fletes_isr_rate_pct: 1.25
};

// Secciones de Ajustes, agrupadas como en la navegación lateral.
const GRUPOS = [
  {
    titulo: 'General',
    secciones: [
      { id: 'empresa', label: 'Empresa', icon: Building2, descripcion: 'Nombre de la empresa y texto FSC que se imprime en las extracciones.' },
      { id: 'impuestos', label: 'Impuestos', icon: Percent, descripcion: 'Porcentajes que se usan en los documentos. En cada grúa o fletero eliges si se aplican o no.' }
    ]
  },
  {
    titulo: 'Catálogos',
    secciones: [
      { id: 'gruas', label: 'Grúas', icon: Truck, descripcion: 'Cada grúa con su productor, su precio de flete y los impuestos que lleva su extracción.' },
      { id: 'fleteros', label: 'Fleteros', icon: UserRound, descripcion: 'Los fleteros y los impuestos que lleva cada uno en su comprobante de flete.' },
      { id: 'generos', label: 'Géneros', icon: Trees, descripcion: 'Géneros de madera y su precio por defecto en las extracciones.' },
      { id: 'parajes', label: 'Parajes', icon: Mountain, descripcion: 'Parajes que se eligen en los viajes de un flete.' },
      { id: 'destinos', label: 'Destinos', icon: MapPin, descripcion: 'Destinos de la madera en las extracciones.' }
    ]
  }
];
const SECCIONES = GRUPOS.flatMap((g) => g.secciones);

export default function Ajustes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seccionUrl = searchParams.get('seccion');
  const activa = SECCIONES.some((s) => s.id === seccionUrl) ? seccionUrl : 'empresa';

  const [general, setGeneral] = useState(generalVacio);
  const [catalogos, setCatalogos] = useState(null);
  // { [seccion]: { total } } que reporta cada catálogo.
  const [estados, setEstados] = useState({});
  const [cargando, setCargando] = useState(true);
  // Dato general que se está editando en la ventana (clave de general).
  const [editandoGeneral, setEditandoGeneral] = useState(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const s = await Api.obtenerSettings();
      const isrExtraccion = s.isr_rate != null ? parseFloat(s.isr_rate) : 0.0125;
      setGeneral({
        empresa_nombre: s.empresa_nombre || '',
        fsc_texto: s.fsc_texto || '',
        iva_rate_pct: parseFloat(s.iva_rate ?? 0.16) * 100,
        retencion_rate_pct: parseFloat(s.retencion_rate ?? 0.04) * 100,
        isr_rate_pct: isrExtraccion * 100,
        fletes_iva_rate_pct: parseFloat(s.fletes_iva_rate ?? 0.16) * 100,
        fletes_retencion_rate_pct: parseFloat(s.fletes_retencion_rate ?? 0.04) * 100,
        fletes_isr_rate_pct: parseFloat(s.fletes_isr_rate ?? 0.0125) * 100
      });
      setCatalogos({
        generos: parseJson(s.generos_default_json, [{ nombre: 'PINO', precio: 280 }]),
        // Las grúas guardadas antes de tener los switches de impuestos se
        // muestran como se comportaban: sin retención y con el ISR general.
        gruas: parseJson(s.gruas_json, [{ grua: '', productor: '', precio_flete: 0 }])
          .map((g) => ({ retencion: false, isr: isrExtraccion > 0, ...g })),
        destinos: parseJson(s.destinos_json, [{ nombre: 'FORESTAL TEZAINS' }]),
        fleteros: parseJson(s.fleteros_json, [{ nombre: '' }]),
        parajes: parseJson(s.parajes_json, [{ nombre: 'RANCHO QUEMADO' }])
      });
      setCargando(false);
    })();
  }, []);

  function irA(id) {
    setSearchParams(id === 'empresa' ? {} : { seccion: id }, { replace: true });
  }

  function estadoDe(id) {
    return (estado) => setEstados((e) => (e[id] && e[id].total === estado.total ? e : { ...e, [id]: estado }));
  }

  // Guarda un solo dato general en cuanto se confirma la ventana.
  async function guardarGeneral(key, valor) {
    const def = CAMPOS_GENERALES[key];
    let guardar;
    let mostrar;
    if (def.tipo === 'pct') {
      const n = parseFloat(valor);
      if (Number.isNaN(n) || n < 0) throw new Error('Escribe un porcentaje válido.');
      guardar = n / 100;
      mostrar = n;
    } else {
      guardar = String(valor || '').trim();
      mostrar = guardar;
    }
    await Api.actualizarSettings({ [def.clave]: guardar });
    setGeneral((d) => ({ ...d, [key]: mostrar }));
    toast.exito('Cambio guardado.');
  }

  // Renglón de un dato general: se ve como texto y se edita con un clic.
  const filaGeneral = (key) => {
    const def = CAMPOS_GENERALES[key];
    const v = general[key];
    return (
      <FilaDato
        key={key}
        label={def.label}
        valor={def.tipo === 'pct' ? `${pctTexto(v)} %` : (v || 'Sin definir')}
        vacio={def.tipo !== 'pct' && !v}
        onEditar={() => setEditandoGeneral(key)}
      />
    );
  };

  if (cargando) {
    return (
      <PageLayout title="Ajustes">
        <div className="flex items-center justify-center gap-2.5 p-10 text-center text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} /> Cargando…
        </div>
      </PageLayout>
    );
  }

  const seccion = SECCIONES.find((s) => s.id === activa);
  const defEditando = editandoGeneral ? CAMPOS_GENERALES[editandoGeneral] : null;

  // Los catálogos se quedan montados (solo se ocultan) para no perder lo
  // que se estaba editando al cambiar de sección.
  const catalogo = (id, props) => (
    <div hidden={activa !== id}>
      <CatalogoEditor {...props} onEstado={estadoDe(id)} />
    </div>
  );

  return (
    <PageLayout title="Ajustes" subtitle="Datos de la empresa, impuestos y los catálogos que usan los formularios.">
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
        {/* Navegación: lista lateral en escritorio, pestañas desplazables en pantallas chicas. */}
        <nav aria-label="Secciones de ajustes" className="lg:sticky lg:top-6 lg:self-start">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:block lg:space-y-6 lg:overflow-visible lg:px-0">
            {GRUPOS.map((grupo) => (
              <div key={grupo.titulo} className="flex gap-1.5 lg:block">
                <div className="mb-1.5 hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400 lg:block">{grupo.titulo}</div>
                <ul className="m-0 flex list-none gap-1.5 p-0 lg:block lg:space-y-0.5">
                  {grupo.secciones.map((s) => {
                    const Icon = s.icon;
                    const sel = s.id === activa;
                    const est = estados[s.id];
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => irA(s.id)}
                          aria-current={sel ? 'page' : undefined}
                          className={`group flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left text-[14px] transition-colors ${
                            sel
                              ? 'bg-surface-card font-semibold text-brand-700 shadow-card ring-1 ring-surface-border'
                              : 'text-ink-600 hover:bg-surface-card/70 hover:text-ink-900'
                          }`}
                        >
                          <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg transition-colors ${
                            sel ? 'bg-brand-500 text-white' : 'bg-surface-muted text-ink-500 group-hover:text-ink-700'
                          }`}>
                            <Icon className="h-[15px] w-[15px]" strokeWidth={2.25} />
                          </span>
                          <span className="flex-1">{s.label}</span>
                          {est && (
                            <span className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${sel ? 'bg-brand-50 text-brand-700' : 'text-ink-400'}`}>
                              {est.total}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <section className="min-w-0">
          <header className="mb-5">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-400">
              {GRUPOS.find((g) => g.secciones.includes(seccion)).titulo}
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span className="text-ink-600">{seccion.label}</span>
            </div>
            <h2 className="m-0 text-[1.375rem] font-semibold tracking-[-0.01em] text-ink-900">{seccion.label}</h2>
            <p className="mt-1 max-w-[62ch] text-[14px] text-ink-500">{seccion.descripcion}</p>
          </header>

          {activa === 'empresa' && (
            <Tarjeta>
              {filaGeneral('empresa_nombre')}
              {filaGeneral('fsc_texto')}
            </Tarjeta>
          )}

          {activa === 'impuestos' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Tarjeta titulo="Extracción" icon={Trees} nota="Se activan o no por grúa, en el catálogo de Grúas.">
                {filaGeneral('iva_rate_pct')}
                {filaGeneral('retencion_rate_pct')}
                {filaGeneral('isr_rate_pct')}
              </Tarjeta>
              <Tarjeta titulo="Fletes" icon={Truck} nota="Se activan o no por fletero, en el catálogo de Fleteros.">
                {filaGeneral('fletes_iva_rate_pct')}
                {filaGeneral('fletes_retencion_rate_pct')}
                {filaGeneral('fletes_isr_rate_pct')}
              </Tarjeta>
            </div>
          )}

          <DialogoEditar
            abierto={!!editandoGeneral}
            titulo={defEditando ? `Editar ${defEditando.tipo === 'pct' ? `${defEditando.label} %` : defEditando.label.toLowerCase()}` : ''}
            subtitulo={defEditando?.tipo === 'pct'
              ? `Porcentaje para ${editandoGeneral.startsWith('fletes_') ? 'los fletes' : 'las extracciones'}. Los documentos ya guardados no cambian.`
              : defEditando?.ayuda}
            campos={defEditando ? [{ key: 'valor', label: defEditando.label, tipo: defEditando.tipo, step: defEditando.step }] : []}
            valores={{ valor: editandoGeneral ? general[editandoGeneral] : '' }}
            onCerrar={() => setEditandoGeneral(null)}
            onGuardar={(d) => guardarGeneral(editandoGeneral, d.valor)}
          />

          {catalogo('gruas', {
            titulo: 'Grúas',
            singular: 'grúa',
            settingsKey: 'gruas_json',
            valorInicial: catalogos.gruas,
            filaVacia: { grua: '', productor: '', precio_flete: 0, retencion: false, isr: true },
            campos: [
              { key: 'grua', label: 'Grúa', tipo: 'text', placeholder: 'Ej. GRUA 11' },
              { key: 'productor', label: 'Productor', tipo: 'text', placeholder: 'Ej. JUAN PEREZ' },
              { key: 'precio_flete', label: 'Precio flete', tipo: 'number', prefijo: '$' },
              { key: 'retencion', label: `Retención ${pctTexto(general.retencion_rate_pct)}%`, tipo: 'switch' },
              { key: 'isr', label: `ISR ${pctTexto(general.isr_rate_pct)}%`, tipo: 'switch' }
            ]
          })}

          {catalogo('fleteros', {
            titulo: 'Fleteros',
            singular: 'fletero',
            settingsKey: 'fleteros_json',
            valorInicial: catalogos.fleteros,
            filaVacia: { nombre: '', retencion: true, isr: false },
            campos: [
              { key: 'nombre', label: 'Fletero', tipo: 'text', placeholder: 'Ej. JUAN PEREZ' },
              { key: 'retencion', label: `Retención ${pctTexto(general.fletes_retencion_rate_pct)}%`, tipo: 'switch' },
              { key: 'isr', label: `ISR ${pctTexto(general.fletes_isr_rate_pct)}%`, tipo: 'switch' }
            ]
          })}

          {catalogo('generos', {
            titulo: 'Géneros',
            singular: 'género',
            settingsKey: 'generos_default_json',
            valorInicial: catalogos.generos,
            filaVacia: { nombre: '', precio: 0 },
            campos: [
              { key: 'nombre', label: 'Género', tipo: 'text', placeholder: 'Ej. DOBLE ARRASTRE' },
              { key: 'precio', label: 'Precio por defecto', tipo: 'number', prefijo: '$' }
            ]
          })}

          {catalogo('parajes', {
            titulo: 'Parajes',
            singular: 'paraje',
            settingsKey: 'parajes_json',
            valorInicial: catalogos.parajes,
            filaVacia: { nombre: '' },
            campos: [{ key: 'nombre', label: 'Paraje', tipo: 'text', placeholder: 'Ej. RANCHO QUEMADO' }]
          })}

          {catalogo('destinos', {
            titulo: 'Destinos',
            singular: 'destino',
            settingsKey: 'destinos_json',
            valorInicial: catalogos.destinos,
            filaVacia: { nombre: '' },
            campos: [{ key: 'nombre', label: 'Destino', tipo: 'text', placeholder: 'Ej. FORESTAL TEZAINS' }]
          })}
        </section>
      </div>
    </PageLayout>
  );
}

function Tarjeta({ titulo, icon: Icon, nota, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card">
      {titulo && (
        <div className="flex items-center gap-2.5 border-b border-surface-border px-5 py-4">
          {Icon && (
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </span>
          )}
          <div>
            <div className="text-[15px] font-semibold text-ink-900">{titulo}</div>
            {nota && <div className="text-[12px] text-ink-500">{nota}</div>}
          </div>
        </div>
      )}
      <div className="divide-y divide-surface-border">{children}</div>
    </div>
  );
}

function FilaDato({ label, valor, vacio, onEditar }) {
  return (
    <div className="flex items-center gap-4 px-5 py-2">
      <span className="w-[42%] flex-none text-[14px] text-ink-500">{label}</span>
      <Tooltip content={`Editar ${label.toLowerCase()}`} delay={300} closeDelay={0} placement="top">
        <button
          type="button"
          onClick={onEditar}
          className="group/celda -mx-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left outline-none ring-brand-200 transition-colors hover:bg-brand-50 hover:ring-1 focus-visible:bg-brand-50 focus-visible:ring-2"
        >
          <span className={`min-w-0 truncate text-[14px] ${vacio ? 'italic text-ink-400' : 'font-semibold text-ink-900'}`}>{valor}</span>
          <Pencil className="h-3.5 w-3.5 flex-none text-brand-600 opacity-0 transition-opacity group-hover/celda:opacity-100 group-focus-visible/celda:opacity-100" strokeWidth={2.25} />
        </button>
      </Tooltip>
    </div>
  );
}
