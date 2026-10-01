import { useState } from 'react';
import { Button, Select, SelectItem } from '@heroui/react';
import { ChevronUp, ChevronDown, Trash2, Plus, AlignLeft, AlignCenter, AlignRight, ChevronRight } from 'lucide-react';
import { tablaInfo, FORMATOS_VALOR } from '../campos.js';
import { Numero, Texto, GrupoBotones, BotonIcono, SelectorColor, PRESETS } from './controles.jsx';
import { FUENTES } from '../modelo.js';

// Editor de las columnas de una tabla enlazada: qué dato muestra cada una,
// su título, ancho relativo, alineación y formato.
export default function EditorColumnas({ el, tipo, setP }) {
  const info = tablaInfo(tipo, el.props.fuente);
  const camposFila = info ? info.camposFila : {};
  const columnas = el.props.columnas || [];
  const [abierta, setAbierta] = useState(null);
  const total = columnas.reduce((s, c) => s + (Number(c.ancho) || 1), 0) || 1;

  const cambiarCol = (i, fn, clave) => setP((p) => { p.columnas = p.columnas.map((c, j) => (j === i ? { ...c } : c)); fn(p.columnas[i]); }, clave ? `col${i}-${clave}` : undefined);
  const mover = (i, d) => setP((p) => {
    const cols = [...p.columnas];
    const j = i + d;
    if (j < 0 || j >= cols.length) return;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    p.columnas = cols;
  });

  return (
    <div className="flex flex-col gap-1.5">
      {columnas.map((c, i) => (
        <div key={i} className="rounded-lg bg-default-50">
          <div className="flex items-center gap-1 px-1.5 py-1">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left" onClick={() => setAbierta(abierta === i ? null : i)}>
              <ChevronRight className={`h-3 w-3 flex-none transition-transform ${abierta === i ? 'rotate-90' : ''}`} />
              <span className="truncate text-[12px]">{c.titulo || (c.campo ? camposFila[c.campo] || c.campo : `“${c.texto || ''}”`)}</span>
              <span className="ml-auto flex-none text-[10px] text-default-400">{Math.round(((Number(c.ancho) || 1) / total) * 100)}%</span>
            </button>
            <button type="button" aria-label="Subir columna" className="text-default-400 hover:text-foreground disabled:opacity-30" disabled={i === 0} onClick={() => mover(i, -1)}><ChevronUp className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Bajar columna" className="text-default-400 hover:text-foreground disabled:opacity-30" disabled={i === columnas.length - 1} onClick={() => mover(i, 1)}><ChevronDown className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Quitar columna" className="text-default-400 hover:text-danger" onClick={() => setP((p) => { p.columnas = p.columnas.filter((_, j) => j !== i); })}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          {abierta === i && (
            <div className="flex flex-col gap-2 px-2 pb-2">
              <Select
                size="sm"
                variant="flat"
                aria-label="Dato de la columna"
                selectedKeys={[c.campo || '__texto']}
                onSelectionChange={(k) => {
                  const v = [...k][0];
                  if (!v) return;
                  cambiarCol(i, (col) => {
                    if (v === '__texto') { col.campo = ''; col.texto = col.texto || 'Texto'; } else { col.campo = v; if (!col.titulo) col.titulo = camposFila[v] || v; }
                  });
                }}
                classNames={{ trigger: 'h-8 min-h-8', value: 'text-[12px]' }}
              >
                {[...Object.entries(camposFila).map(([k, v]) => <SelectItem key={k} textValue={v}>{v}</SelectItem>), <SelectItem key="__texto" textValue="Texto fijo">Texto fijo (igual en cada fila)</SelectItem>]}
              </Select>
              {!c.campo && (
                <>
                  <Texto etiqueta="Texto" valor={c.texto} onCambio={(v) => cambiarCol(i, (col) => { col.texto = v; }, 'texto')} />
                  <p className="text-[10.5px] leading-snug text-default-400">
                    Puede llevar datos del renglón: <code className="text-violet-300">{'Tarifa {n}'}</code>, <code className="text-violet-300">{'{precio:monedaPeso} / m³'}</code>
                  </p>
                </>
              )}
              <Texto etiqueta="Título" valor={c.titulo} onCambio={(v) => cambiarCol(i, (col) => { col.titulo = v; }, 'titulo')} />
              <div className="grid grid-cols-2 gap-2">
                <Numero etiqueta="Ancho" valor={Number(c.ancho) || 1} min={1} decimales={0} onCambio={(v) => cambiarCol(i, (col) => { col.ancho = v; }, 'ancho')} />
                <GrupoBotones
                  valor={c.alinear || 'left'}
                  onCambio={(v) => cambiarCol(i, (col) => { col.alinear = v; })}
                  opciones={[{ valor: 'left', titulo: 'Izquierda', icono: AlignLeft }, { valor: 'center', titulo: 'Centro', icono: AlignCenter }, { valor: 'right', titulo: 'Derecha', icono: AlignRight }]}
                />
              </div>
              <Select
                size="sm"
                variant="flat"
                aria-label="Formato"
                selectedKeys={[c.formato || 'texto']}
                onSelectionChange={(k) => { const v = [...k][0]; if (v) cambiarCol(i, (col) => { col.formato = v; }); }}
                classNames={{ trigger: 'h-8 min-h-8', value: 'text-[12px]' }}
              >
                {Object.entries(FORMATOS_VALOR).filter(([k]) => k !== 'insignia').map(([k, v]) => <SelectItem key={k} textValue={v}>{v}</SelectItem>)}
              </Select>
              <Select
                size="sm"
                variant="flat"
                aria-label="Decoración"
                selectedKeys={[c.decoracion || (c.formato === 'insignia' ? 'insignia' : 'ninguna')]}
                onSelectionChange={(k) => { const v = [...k][0]; if (v) cambiarCol(i, (col) => { col.decoracion = v === 'ninguna' ? '' : v; }); }}
                classNames={{ trigger: 'h-8 min-h-8', value: 'text-[12px]' }}
                startContent={<span className="whitespace-nowrap text-[11px] text-default-400">Estilo</span>}
              >
                <SelectItem key="ninguna" textValue="Texto normal">Texto normal</SelectItem>
                <SelectItem key="pastilla" textValue="Pastilla">Pastilla (fondo redondeado)</SelectItem>
                <SelectItem key="insignia" textValue="Insignia ✓">Insignia ✓ (borde de color)</SelectItem>
              </Select>
              {(c.decoracion || c.formato === 'insignia') && (
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="mb-1 text-[10.5px] text-default-400">Color</p><SelectorColor valor={c.colorDecoracion || (c.decoracion === 'pastilla' ? '#344054' : '#2e9e5b')} onCambio={(v) => cambiarCol(i, (col) => { col.colorDecoracion = v; }, 'colDec')} /></div>
                  <div><p className="mb-1 text-[10.5px] text-default-400">Fondo</p><SelectorColor valor={c.fondoDecoracion || (c.decoracion === 'pastilla' ? '#eef1f4' : '#ffffff00')} onCambio={(v) => cambiarCol(i, (col) => { col.fondoDecoracion = v; }, 'fonDec')} /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Select
                  size="sm"
                  variant="flat"
                  aria-label="Fuente de la columna"
                  selectedKeys={[c.fuente || '__heredar']}
                  onSelectionChange={(k) => { const v = [...k][0]; if (v) cambiarCol(i, (col) => { col.fuente = v === '__heredar' ? '' : v; }); }}
                  classNames={{ trigger: 'h-8 min-h-8', value: 'text-[12px]' }}
                >
                  {[<SelectItem key="__heredar" textValue="Fuente de la tabla">Fuente de la tabla</SelectItem>, ...FUENTES.map((f) => <SelectItem key={f.nombre} textValue={f.nombre}><span style={{ fontFamily: f.css }}>{f.nombre}</span></SelectItem>)]}
                </Select>
                <Numero etiqueta="Tam" valor={c.tamano || 0} min={0} decimales={1} sufijo="px" presets={PRESETS.tamanoFuente} onCambio={(v) => cambiarCol(i, (col) => { col.tamano = v || undefined; }, 'tam')} />
                <Select
                  size="sm"
                  variant="flat"
                  aria-label="Peso"
                  selectedKeys={[String(c.peso || '')]}
                  onSelectionChange={(k) => { const v = [...k][0]; cambiarCol(i, (col) => { col.peso = v ? Number(v) || undefined : undefined; }); }}
                  classNames={{ trigger: 'h-8 min-h-8', value: 'text-[12px]' }}
                  placeholder="Peso"
                >
                  {[['', 'Peso de la tabla'], ['400', 'Normal'], ['500', 'Media'], ['600', 'Semi negrita'], ['700', 'Negrita'], ['800', 'Extra negrita']].map(([k, v]) => <SelectItem key={k} textValue={v}>{v}</SelectItem>)}
                </Select>
                <Texto etiqueta="Si vacío" valor={c.vacio} placeholder="(nada)" onCambio={(v) => cambiarCol(i, (col) => { col.vacio = v; }, 'vacio')} />
              </div>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[10.5px] text-default-400">Color del texto</p>
                {c.color && <button type="button" className="text-[10.5px] text-default-400 underline" onClick={() => cambiarCol(i, (col) => { col.color = ''; })}>Quitar</button>}
              </div>
              <SelectorColor valor={c.color || '#111111'} onCambio={(v) => cambiarCol(i, (col) => { col.color = v; }, 'color')} />
              {c.visibleSi && (
                <div className="flex items-center justify-between rounded bg-default-100 px-2 py-1 text-[11px] text-default-500">
                  Solo cuando hay varias grúas
                  <BotonIcono titulo="Mostrar siempre" icono={Trash2} onPress={() => cambiarCol(i, (col) => { col.visibleSi = null; })} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="flat"
        startContent={<Plus className="h-3.5 w-3.5" />}
        onPress={() => {
          const primero = Object.keys(camposFila)[0] || '';
          setP((p) => { p.columnas = [...(p.columnas || []), { campo: primero, titulo: camposFila[primero] || 'Columna', ancho: 20, alinear: 'left', formato: 'texto' }]; });
          setAbierta(columnas.length);
        }}
      >
        Agregar columna
      </Button>
    </div>
  );
}
