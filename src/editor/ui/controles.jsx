import { useEffect, useState } from 'react';
import { Button, Input, Popover, PopoverContent, PopoverTrigger, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { HexAlphaColorPicker } from 'react-colorful';
import { ChevronDown } from 'lucide-react';
import { PALETAS_PREDEFINIDAS, coloresDelDocumento } from '../paletas.js';
import { useEditor } from '../store.js';

// Controles compactos del panel de diseño (estilo Figma: etiqueta corta a
// la izquierda dentro del campo, números que se confirman al escribir).

export function Seccion({ titulo, accion, children, abierta = true }) {
  const [open, setOpen] = useState(abierta);
  return (
    <section className="border-b border-default-100 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="flex items-center gap-1 text-[12px] font-semibold text-default-700" onClick={() => setOpen((v) => !v)}>
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? '' : '-rotate-90'}`} />
          {titulo}
        </button>
        {accion}
      </div>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </section>
  );
}

export function Fila({ children, cols = 2 }) {
  return <div className={`grid gap-2 ${cols === 3 ? 'grid-cols-3' : cols === 4 ? 'grid-cols-4' : cols === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>{children}</div>;
}

// Valores predeterminados (como los menús de Figma) para los campos más
// usados; se ofrecen en una lista junto al número, que sigue siendo editable.
export const PRESETS = {
  tamanoFuente: [6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96],
  grosor: [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12],
  radio: [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 999],
  interlineado: [0.9, 1, 1.1, 1.15, 1.2, 1.25, 1.35, 1.5, 1.75, 2],
  espaciado: [-1, -0.5, 0, 0.3, 0.5, 1, 1.5, 2, 3],
  opacidad: [0, 10, 25, 40, 50, 60, 75, 90, 100],
  rotacion: [0, 15, 30, 45, 90, 135, 180, 270],
  sombraBlur: [0, 2, 4, 8, 12, 16, 24, 32, 48],
  margen: [0, 2, 4, 6, 8, 10, 12, 16, 20, 24]
};

// Número con conversión opcional (p. ej. px ↔ mm). `valor` está en la
// unidad interna; `aVista`/`deVista` convierten para mostrar/guardar.
// `presets` (en unidades de la vista) agrega una lista desplegable.
export function Numero({
  etiqueta, valor, onCambio, aVista = (v) => v, deVista = (v) => v, decimales = 1, paso = 1, min, max, sufijo, deshabilitado, mixto, ancho, presets
}) {
  const mostrar = (v) => (v == null || Number.isNaN(v) ? '' : String(Math.round(aVista(v) * 10 ** decimales) / 10 ** decimales));
  const [texto, setTexto] = useState(mixto ? '' : mostrar(valor));
  const [enfocado, setEnfocado] = useState(false);
  useEffect(() => { if (!enfocado) setTexto(mixto ? '' : mostrar(valor)); }, [valor, mixto, enfocado]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmar = (t) => {
    const n = parseFloat(String(t).replace(',', '.'));
    if (Number.isNaN(n)) return;
    let v = n;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    onCambio(deVista(v));
  };

  return (
    <Input
      size="sm"
      variant="flat"
      aria-label={typeof etiqueta === 'string' ? etiqueta : 'valor'}
      value={texto}
      placeholder={mixto ? 'Mixto' : ''}
      isDisabled={deshabilitado}
      onValueChange={(t) => { setTexto(t); confirmar(t); }}
      onFocus={() => setEnfocado(true)}
      onBlur={() => { setEnfocado(false); setTexto(mixto ? '' : mostrar(valor)); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const actual = parseFloat(texto) || 0;
          const nuevo = actual + (e.key === 'ArrowUp' ? 1 : -1) * paso * (e.shiftKey ? 10 : 1);
          const t = String(Math.round(nuevo * 10 ** decimales) / 10 ** decimales);
          setTexto(t);
          confirmar(t);
        }
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      startContent={etiqueta != null ? <span className="min-w-[14px] flex-none select-none whitespace-nowrap text-[11px] text-default-400">{etiqueta}</span> : null}
      endContent={(
        <span className="flex flex-none items-center gap-0.5">
          {sufijo && <span className="select-none text-[10px] text-default-400">{sufijo}</span>}
          {presets && !deshabilitado && (
            <Dropdown placement="bottom-end" classNames={{ content: 'min-w-[88px] p-1' }}>
              <DropdownTrigger>
                <button type="button" aria-label={`Valores de ${typeof etiqueta === 'string' ? etiqueta : 'número'}`} className="-mr-1 flex h-6 w-4 items-center justify-center rounded text-default-400 hover:bg-default-200 hover:text-foreground">
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Valores predeterminados"
                className="max-h-64 overflow-y-auto"
                itemClasses={{ base: 'py-1 rounded-md', title: 'text-[12px]' }}
                onAction={(k) => { const v = Number(k); setTexto(String(v)); onCambio(deVista(v)); }}
              >
                {presets.map((v) => <DropdownItem key={String(v)}>{v === 999 ? 'Máximo (píldora)' : `${v}${sufijo ? ` ${sufijo}` : ''}`}</DropdownItem>)}
              </DropdownMenu>
            </Dropdown>
          )}
        </span>
      )}
      classNames={{ inputWrapper: 'h-8 min-h-8 px-2', input: 'text-[12px]' }}
      style={ancho ? { width: ancho } : undefined}
    />
  );
}

export function Texto({ etiqueta, valor, onCambio, placeholder }) {
  return (
    <Input
      size="sm"
      variant="flat"
      aria-label={etiqueta || placeholder || 'texto'}
      value={valor ?? ''}
      placeholder={placeholder}
      onValueChange={onCambio}
      startContent={etiqueta ? <span className="select-none whitespace-nowrap text-[11px] text-default-400">{etiqueta}</span> : null}
      classNames={{ inputWrapper: 'h-8 min-h-8 px-2', input: 'text-[12px]' }}
    />
  );
}

export function GrupoBotones({ opciones, valor, onCambio, multiple = false }) {
  // Sin tooltips flotantes (se usa el title nativo): al pasar el mouse de un
  // botón a otro, los tooltips animados aparecían y desaparecían (parpadeo).
  return (
    <div className="flex gap-0.5 rounded-lg bg-default-100 p-0.5">
      {opciones.map((o) => {
        const activo = multiple ? Boolean(o.activo) : valor === o.valor;
        const Icon = o.icono;
        return (
          <button
            key={o.valor}
            type="button"
            title={o.titulo}
            aria-label={o.titulo}
            aria-pressed={activo}
            className={`flex h-7 flex-1 items-center justify-center rounded-md text-[12px] ${activo ? 'bg-default-300 text-foreground' : 'text-default-500 hover:bg-default-200 hover:text-foreground'}`}
            onClick={() => onCambio(o.valor)}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : o.texto}
          </button>
        );
      })}
    </div>
  );
}

function esHex(c) {
  return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c || '');
}

// Convierte rgba()/hex corto a #rrggbbaa para el selector.
export function aHex8(color) {
  if (!color) return '#000000';
  if (esHex(color)) {
    let h = color.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    return `#${h}`;
  }
  const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+))?\s*\)/i.exec(color);
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map((v) => Math.round(Number(v)).toString(16).padStart(2, '0'));
    const a = m[4] != null ? Math.round(Number(m[4]) * 255).toString(16).padStart(2, '0') : '';
    return `#${r}${g}${b}${a === 'ff' ? '' : a}`;
  }
  if (color === 'transparent') return '#00000000';
  return '#000000';
}

function Muestra({ color, onClick, titulo, activo }) {
  return (
    <button
      type="button"
      title={titulo || color}
      onClick={onClick}
      className={`editor-ajedrez h-5 w-5 flex-none overflow-hidden rounded border ${activo ? 'border-[#0d99ff] ring-1 ring-[#0d99ff]' : 'border-default-300'}`}
    >
      <span className="block h-full w-full" style={{ background: color }} />
    </button>
  );
}

export function SelectorColor({ valor, onCambio, etiqueta }) {
  const doc = useEditor((s) => s.doc);
  const [hex, setHex] = useState(aHex8(valor));
  useEffect(() => { setHex(aHex8(valor)); }, [valor]);
  const colores = doc ? coloresDelDocumento(doc).slice(0, 24) : [];
  const paletasDoc = doc ? doc.paletas || [] : [];
  const cambiar = (c) => { setHex(c); onCambio(c); };
  const hex6 = hex.length === 9 ? hex.slice(0, 7) : hex;
  const alfa = hex.length === 9 ? Math.round((parseInt(hex.slice(7), 16) / 255) * 100) : 100;

  return (
    <div className="flex items-center gap-2">
      <Popover placement="left-start" offset={12}>
        <PopoverTrigger>
          <button type="button" className="editor-ajedrez h-8 w-8 flex-none overflow-hidden rounded-md border border-default-300" aria-label={`Color ${etiqueta || ''}`}>
            <span className="block h-full w-full" style={{ background: valor || 'transparent' }} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="dark w-[248px] bg-content1 p-3 text-foreground">
          <div className="flex w-full flex-col gap-3">
            <div className="editor-colorful"><HexAlphaColorPicker color={hex} onChange={(c) => cambiar(c)} /></div>
            <div className="flex gap-2">
              <Input size="sm" variant="flat" aria-label="Hex" value={hex6} onValueChange={(t) => { const c = t.startsWith('#') ? t : `#${t}`; setHex(c); if (esHex(c)) onCambio(c.length === 7 && alfa < 100 ? c + Math.round((alfa / 100) * 255).toString(16).padStart(2, '0') : c); }} classNames={{ inputWrapper: 'h-8 min-h-8', input: 'text-[12px] font-mono' }} />
              <Numero etiqueta="%" valor={alfa} decimales={0} min={0} max={100} ancho={80} onCambio={(a) => cambiar(`${hex6}${a >= 100 ? '' : Math.round((a / 100) * 255).toString(16).padStart(2, '0')}`)} />
            </div>
            <div className="flex flex-wrap gap-1">
              <Muestra color="transparent" titulo="Transparente" onClick={() => cambiar('#ffffff00')} />
              {['#000000', '#ffffff'].map((c) => <Muestra key={c} color={c} onClick={() => cambiar(c)} />)}
            </div>
            {colores.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] text-default-500">Colores del documento</p>
                <div className="flex flex-wrap gap-1">{colores.map((c) => <Muestra key={c} color={c} activo={c === (valor || '').toLowerCase()} onClick={() => cambiar(aHex8(c))} />)}</div>
              </div>
            )}
            <div className="max-h-44 overflow-y-auto pr-1">
              {[...paletasDoc, ...PALETAS_PREDEFINIDAS].map((p, i) => (
                <div key={`${p.nombre}-${i}`} className="mb-1.5">
                  <p className="mb-0.5 text-[11px] text-default-500">{p.nombre}</p>
                  <div className="flex flex-wrap gap-1">{p.colores.map((c, j) => <Muestra key={j} color={c} onClick={() => cambiar(aHex8(c))} />)}</div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Input
        size="sm"
        variant="flat"
        aria-label={etiqueta || 'color'}
        value={hex6.replace('#', '').toUpperCase()}
        onValueChange={(t) => { const c = `#${t.replace('#', '')}`; if (esHex(c)) cambiar(c + (hex.length === 9 ? hex.slice(7) : '')); else setHex(c); }}
        endContent={<span className="text-[10px] text-default-400">{alfa}%</span>}
        classNames={{ inputWrapper: 'h-8 min-h-8 px-2', input: 'text-[12px] font-mono' }}
      />
    </div>
  );
}

export function BotonIcono({ titulo, icono: Icon, onPress, activo, deshabilitado, className = '' }) {
  return (
    <Button
      isIconOnly
      size="sm"
      variant={activo ? 'solid' : 'light'}
      color={activo ? 'primary' : 'default'}
      aria-label={titulo}
      title={titulo}
      onPress={onPress}
      isDisabled={deshabilitado}
      className={`h-8 w-8 min-w-8 ${className}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
