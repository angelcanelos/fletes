import { useState } from 'react';
import { Button, Select, SelectItem, SelectSection, Switch, Slider, Textarea, Tabs, Tab, Chip } from '@heroui/react';
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ArrowUpToLine, ArrowDownToLine, FoldVertical, Bold, Italic, Underline, CaseUpper, Plus, Trash2, Lock, Unlock, Eye, EyeOff,
  Square, Palette, Scan, Link2, Link2Off
} from 'lucide-react';
import { useEditor } from '../store.js';
import {
  pxAMm, mmAPx, PAPELES, RECORTES, FUENTES, NOMBRES_TIPO, ESTILO_TEXTO_DEFAULT, TIPOS_CON_TEXTO, mapaPorId
} from '../modelo.js';
import { CATALOGO, FORMATOS_VALOR, CONDICIONES, campoInfo, tablaInfo } from '../campos.js';
import { ICONOS } from '../iconos.js';
import { PALETAS_PREDEFINIDAS, coloresDelDocumento, mapaReasignacion } from '../paletas.js';
import { Seccion, Fila, Numero, Texto, GrupoBotones, SelectorColor, BotonIcono, PRESETS } from './controles.jsx';
import EditorColumnas from './EditorColumnas.jsx';

const mm = { aVista: pxAMm, deVista: mmAPx, sufijo: 'mm' };

function Sel({ etiqueta, valor, opciones, onCambio, secciones }) {
  return (
    <Select
      size="sm"
      variant="flat"
      aria-label={etiqueta || 'opción'}
      label={undefined}
      placeholder={etiqueta}
      selectedKeys={valor != null && valor !== '' ? [String(valor)] : []}
      onSelectionChange={(k) => { const v = [...k][0]; if (v != null) onCambio(v); }}
      classNames={{ trigger: 'h-8 min-h-8', value: 'text-[12px]' }}
      startContent={etiqueta && valor ? <span className="whitespace-nowrap text-[11px] text-default-400">{etiqueta}</span> : null}
    >
      {secciones
        ? secciones.map((s) => (
          <SelectSection key={s.titulo} title={s.titulo}>
            {s.opciones.map((o) => <SelectItem key={String(o.valor)} textValue={o.texto}>{o.texto}</SelectItem>)}
          </SelectSection>
        ))
        : opciones.map((o) => <SelectItem key={String(o.valor)} textValue={o.texto}><span style={o.estilo}>{o.texto}</span></SelectItem>)}
    </Select>
  );
}

// ---------------- Página (sin selección) ----------------

function PanelPagina() {
  const doc = useEditor((s) => s.doc);
  const cambiar = useEditor((s) => s.cambiar);
  const p = doc.pagina;
  const imp = p.impresion || {};
  const [nombrePaleta, setNombrePaleta] = useState('');

  const setPagina = (fn, clave) => cambiar((d) => fn(d.pagina), { clave });
  // La página se edita como un elemento más (un "frame"): mismas secciones
  // de relleno, borde, esquinas y sombra.
  const frame = { tipo: 'pagina', estilo: p.estilo || {} };
  const setFrame = (fn, clave) => cambiar((d) => { d.pagina.estilo = d.pagina.estilo || {}; fn(d.pagina.estilo, d.pagina); }, { clave: clave ? `pagina-${clave}` : undefined });
  const presetActual = Object.entries(PAPELES).find(([, v]) => Math.abs(mmAPx(v.ancho) - p.ancho) < 1 && Math.abs(mmAPx(v.alto) - p.alto) < 1);

  const aplicarPaleta = (colores) => {
    const mapa = mapaReasignacion(coloresDelDocumento(doc), colores);
    const r = (c) => (c && mapa[c.toLowerCase()] ? mapa[c.toLowerCase()] : c);
    cambiar((d) => {
      const ep = d.pagina.estilo;
      if (ep && ep.relleno) { ep.relleno.color = r(ep.relleno.color); if (ep.relleno.color2) ep.relleno.color2 = r(ep.relleno.color2); }
      if (ep && ep.borde) ep.borde.color = r(ep.borde.color);
      for (const el of d.elementos) {
        const e = el.estilo;
        if (e.relleno) { e.relleno.color = r(e.relleno.color); if (e.relleno.color2) e.relleno.color2 = r(e.relleno.color2); }
        if (e.borde) e.borde.color = r(e.borde.color);
        if (e.texto) e.texto.color = r(e.texto.color);
        if (el.tipo === 'tabla') {
          const t = el.props;
          if (t.encabezado) { t.encabezado.fondo = r(t.encabezado.fondo); t.encabezado.color = r(t.encabezado.color); }
          if (t.filas) t.filas.fondoAlterno = r(t.filas.fondoAlterno);
          if (t.bordes) t.bordes.color = r(t.bordes.color);
        }
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-default-100 px-3 py-2.5">
        <Chip size="sm" variant="flat" color="secondary" className="h-5 text-[10px]">Frame</Chip>
        <span className="text-[12px] font-medium">Página</span>
      </div>
      <Seccion titulo="Página">
        <Sel
          etiqueta="Tamaño"
          valor={presetActual ? presetActual[0] : 'personalizado'}
          opciones={[...Object.entries(PAPELES).map(([k, v]) => ({ valor: k, texto: `${v.nombre} (${v.ancho}×${v.alto} mm)` })), { valor: 'personalizado', texto: 'Personalizado' }]}
          onCambio={(k) => {
            if (!PAPELES[k]) return;
            setPagina((pg) => { pg.ancho = mmAPx(PAPELES[k].ancho); pg.alto = mmAPx(PAPELES[k].alto); });
            setTimeout(() => window.dispatchEvent(new Event('editor:ajustar')), 30);
          }}
        />
        <Fila>
          <Numero etiqueta="An" valor={p.ancho} {...mm} min={10} onCambio={(v) => setPagina((pg) => { pg.ancho = v; }, 'pag-w')} />
          <Numero etiqueta="Al" valor={p.alto} {...mm} min={10} onCambio={(v) => setPagina((pg) => { pg.alto = v; }, 'pag-h')} />
        </Fila>
        <Switch size="sm" isSelected={Boolean(p.autoAlto)} onValueChange={(v) => setPagina((pg) => { pg.autoAlto = v; })}>
          <span className="text-[12px]">El alto se ajusta a los datos</span>
        </Switch>
        <p className="text-[11px] leading-snug text-default-400">Con datos reales, las tablas crecen y lo de abajo se recorre; el alto de la hoja sigue al contenido.</p>
      </Seccion>

      <SeccionRelleno el={frame} setEstilo={setFrame} />
      <SeccionBorde el={frame} setEstilo={setFrame} />
      <Seccion titulo="Esquinas y recorte">
        <Radios el={frame} setEstilo={setFrame} />
        <Switch size="sm" isSelected={Boolean(frame.estilo.recortar)} onValueChange={(v) => setFrame((e) => { e.recortar = v; })}>
          <span className="text-[12px]">Recortar lo que sale de la página (en el editor)</span>
        </Switch>
      </Seccion>
      <SeccionSombra el={frame} setEstilo={setFrame} />

      <Seccion titulo="Impresión">
        <Sel
          etiqueta="Papel"
          valor={imp.papel || 'carta'}
          opciones={[...Object.entries(PAPELES).map(([k, v]) => ({ valor: k, texto: v.nombre })), { valor: 'igual', texto: 'Igual a la página' }]}
          onCambio={(k) => setPagina((pg) => { pg.impresion = { ...pg.impresion, papel: k }; })}
        />
        {imp.papel !== 'igual' && (
          <>
            <GrupoBotones
              valor={imp.orientacion || 'vertical'}
              onCambio={(v) => setPagina((pg) => { pg.impresion = { ...pg.impresion, orientacion: v }; })}
              opciones={[{ valor: 'vertical', texto: 'Vertical', titulo: 'Vertical' }, { valor: 'horizontal', texto: 'Horizontal', titulo: 'Horizontal' }]}
            />
            <Fila>
              <Numero etiqueta="Margen" valor={imp.margen ?? 6} sufijo="mm" min={0} max={40} onCambio={(v) => setPagina((pg) => { pg.impresion = { ...pg.impresion, margen: v }; }, 'pag-margen')} />
              <Switch size="sm" isSelected={imp.ajustar !== false} onValueChange={(v) => setPagina((pg) => { pg.impresion = { ...pg.impresion, ajustar: v }; })}>
                <span className="text-[12px]">Ajustar a hoja</span>
              </Switch>
            </Fila>
          </>
        )}
      </Seccion>

      <Seccion titulo="Paletas de color">
        <p className="text-[11px] leading-snug text-default-400">Clic en una paleta para recolorear todo el diseño conservando el contraste (del color más oscuro al más claro).</p>
        {[...(doc.paletas || []).map((pl, i) => ({ ...pl, propia: i })), ...PALETAS_PREDEFINIDAS].map((pl, i) => (
          <div key={`${pl.nombre}-${i}`} className="group flex items-center gap-2 rounded-lg p-1 hover:bg-default-100">
            <button type="button" className="flex flex-1 items-center gap-2 text-left" onClick={() => aplicarPaleta(pl.colores)} title="Aplicar al documento">
              <div className="flex overflow-hidden rounded-md border border-default-200">
                {pl.colores.map((c, j) => <span key={j} className="block h-5 w-4" style={{ background: c }} />)}
              </div>
              <span className="truncate text-[12px]">{pl.nombre}</span>
            </button>
            {pl.propia != null && (
              <button type="button" aria-label="Eliminar paleta" className="opacity-0 group-hover:opacity-100" onClick={() => cambiar((d) => { d.paletas.splice(pl.propia, 1); })}>
                <Trash2 className="h-3.5 w-3.5 text-default-400 hover:text-danger" />
              </button>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <Texto placeholder="Nombre de la nueva paleta" valor={nombrePaleta} onCambio={setNombrePaleta} />
          <Button
            size="sm"
            variant="flat"
            isIconOnly
            aria-label="Crear paleta con los colores del documento"
            onPress={() => {
              const colores = coloresDelDocumento(doc).slice(0, 10);
              cambiar((d) => { d.paletas.push({ nombre: nombrePaleta.trim() || `Paleta ${d.paletas.length + 1}`, colores: colores.length ? colores : ['#000000', '#ffffff'] }); });
              setNombrePaleta('');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-default-400">La nueva paleta toma los colores que usa el diseño; luego puedes aplicarla a otros formatos.</p>
      </Seccion>
    </>
  );
}

// ---------------- Elementos seleccionados ----------------

export default function PanelDiseno({ tipo }) {
  const doc = useEditor((s) => s.doc);
  const seleccion = useEditor((s) => s.seleccion);
  const porId = mapaPorId(doc.elementos);
  const sel = seleccion.map((id) => porId.get(id)).filter(Boolean);

  return (
    <aside className="editor-panel flex w-[272px] flex-none flex-col border-l border-default-100 bg-content1">
      <Tabs aria-label="Panel" size="sm" variant="underlined" classNames={{ base: 'px-2 pt-1', tabList: 'gap-3', panel: 'p-0 min-h-0 flex-1 overflow-y-auto editor-scroll' }}>
        <Tab key="diseno" title="Diseño">
          {sel.length ? <PanelElementos sel={sel} tipo={tipo} /> : <PanelPagina />}
        </Tab>
        <Tab key="ayuda" title="Atajos">
          <Atajos />
        </Tab>
      </Tabs>
    </aside>
  );
}

function PanelElementos({ sel, tipo }) {
  const actualizar = useEditor((s) => s.actualizar);
  const alinear = useEditor((s) => s.alinear);
  const distribuir = useEditor((s) => s.distribuir);
  const ids = sel.map((e) => e.id);
  const el = sel[0];
  const unico = sel.length === 1 ? el : null;
  const todos = (fn) => sel.every(fn);
  const set = (fn, clave) => actualizar(ids, fn, clave ? { clave: `${clave}-${ids.join()}` } : undefined);
  const setEstilo = (fn, clave) => set((e) => { e.estilo = e.estilo || {}; fn(e.estilo, e); }, clave);
  const mixto = (k) => sel.some((e) => e[k] !== el[k]);
  const conTexto = todos((e) => TIPOS_CON_TEXTO.has(e.tipo));
  const conRelleno = todos((e) => !['linea', 'grupo'].includes(e.tipo));
  const conBorde = todos((e) => e.tipo !== 'grupo');
  const conRecorte = todos((e) => ['contenedor', 'rect', 'texto', 'campo', 'imagen', 'icono'].includes(e.tipo));
  const conRadio = todos((e) => ['contenedor', 'rect', 'texto', 'campo', 'imagen', 'tabla', 'icono'].includes(e.tipo));

  return (
    <div className="pb-24">
      <div className="flex items-center gap-2 border-b border-default-100 px-3 py-2.5">
        <Chip size="sm" variant="flat" color="primary" className="h-5 text-[10px]">{sel.length > 1 ? `${sel.length} elementos` : NOMBRES_TIPO[el.tipo]}</Chip>
        {unico ? (
          <input
            className="min-w-0 flex-1 rounded bg-transparent px-1 text-[12px] font-medium outline-none hover:bg-default-100 focus:bg-default-100"
            value={unico.nombre}
            aria-label="Nombre del elemento"
            onChange={(e) => set((x) => { x.nombre = e.target.value; }, 'nombre')}
          />
        ) : <span className="flex-1" />}
        <BotonIcono titulo={el.bloqueado ? 'Desbloquear' : 'Bloquear'} icono={el.bloqueado ? Lock : Unlock} onPress={() => set((x) => { x.bloqueado = !el.bloqueado; })} />
        <BotonIcono titulo={el.oculto ? 'Mostrar' : 'Ocultar'} icono={el.oculto ? EyeOff : Eye} onPress={() => set((x) => { x.oculto = !el.oculto; })} />
      </div>

      <Seccion titulo="Alinear">
        <GrupoBotones
          onCambio={alinear}
          opciones={[
            { valor: 'izq', titulo: 'Alinear a la izquierda', icono: AlignStartVertical },
            { valor: 'centroH', titulo: 'Centrar horizontalmente', icono: AlignCenterVertical },
            { valor: 'der', titulo: 'Alinear a la derecha', icono: AlignEndVertical },
            { valor: 'arriba', titulo: 'Alinear arriba', icono: AlignStartHorizontal },
            { valor: 'centroV', titulo: 'Centrar verticalmente', icono: AlignCenterHorizontal },
            { valor: 'abajo', titulo: 'Alinear abajo', icono: AlignEndHorizontal }
          ]}
        />
        {sel.length >= 3 && (
          <GrupoBotones
            onCambio={distribuir}
            opciones={[
              { valor: 'h', titulo: 'Distribuir horizontalmente', icono: AlignHorizontalDistributeCenter },
              { valor: 'v', titulo: 'Distribuir verticalmente', icono: AlignVerticalDistributeCenter }
            ]}
          />
        )}
      </Seccion>

      <Seccion titulo="Posición y tamaño">
        <Fila>
          <Numero etiqueta="X" valor={el.x} mixto={mixto('x')} {...mm} onCambio={(v) => set((x) => { x.x = v; }, 'x')} />
          <Numero etiqueta="Y" valor={el.y} mixto={mixto('y')} {...mm} onCambio={(v) => set((x) => { x.y = v; }, 'y')} />
          <Numero etiqueta="An" valor={el.w} mixto={mixto('w')} {...mm} min={0.3} onCambio={(v) => set((x) => { x.w = v; }, 'w')} />
          <Numero etiqueta="Al" valor={el.h} mixto={mixto('h')} {...mm} min={0.3} onCambio={(v) => set((x) => { x.h = v; }, 'h')} />
          <Numero etiqueta="↻" valor={el.rotacion || 0} mixto={mixto('rotacion')} sufijo="°" presets={PRESETS.rotacion} onCambio={(v) => set((x) => { x.rotacion = v; }, 'rot')} />
          <Numero etiqueta="Opac." valor={(el.opacidad ?? 1) * 100} decimales={0} min={0} max={100} sufijo="%" presets={PRESETS.opacidad} onCambio={(v) => set((x) => { x.opacidad = v / 100; }, 'opac')} />
        </Fila>
        {todos((e) => e.tipo === 'contenedor' || e.tipo === 'grupo') && (
          <Switch size="sm" isSelected={Boolean(el.props.autoAlto) || el.tipo === 'grupo'} isDisabled={el.tipo === 'grupo'} onValueChange={(v) => set((x) => { x.props.autoAlto = v; })}>
            <span className="text-[12px]">Crecer con su contenido</span>
          </Switch>
        )}
        {todos((e) => e.tipo === 'contenedor') && (
          <Switch size="sm" isSelected={Boolean(el.estilo.recortarHijos)} onValueChange={(v) => setEstilo((e) => { e.recortarHijos = v; })}>
            <span className="text-[12px]">Recortar contenido</span>
          </Switch>
        )}
      </Seccion>

      {unico && unico.tipo === 'texto' && (
        <Seccion titulo="Contenido">
          <Textarea
            size="sm"
            variant="flat"
            aria-label="Texto"
            minRows={2}
            value={unico.props.texto || ''}
            onValueChange={(t) => set((x) => { x.props.texto = t; }, 'texto')}
            classNames={{ input: 'text-[12px]' }}
          />
          <Sel
            etiqueta="Insertar dato"
            valor=""
            secciones={opcionesCampos(tipo).map((sec) => ({ ...sec, opciones: sec.opciones.filter((o) => !(campoInfo(tipo, o.valor) || {}).soloCondicion) }))}
            onCambio={(v) => set((x) => { x.props.texto = `${x.props.texto || ''}{${v}}`; })}
          />
          <p className="text-[11px] leading-snug text-default-400">
            Los datos van entre llaves y se llenan solos: <code className="text-violet-300">{'Pago de IVA ({iva_pct}%)'}</code>. Para cambiar el formato: <code className="text-violet-300">{'{total:monedaPeso}'}</code>.
          </p>
        </Seccion>
      )}
      {unico && unico.tipo === 'icono' && <SeccionIcono el={unico} set={set} />}

      {unico && unico.tipo === 'campo' && <SeccionCampo el={unico} tipo={tipo} set={set} />}
      {unico && unico.tipo === 'imagen' && <SeccionImagen el={unico} set={set} />}
      {unico && unico.tipo === 'tabla' && <SeccionTabla el={unico} tipo={tipo} set={set} />}
      {unico && (unico.tipo === 'poligono' || unico.tipo === 'estrella' || unico.tipo === 'linea') && <SeccionForma el={unico} set={set} />}

      {conTexto && <SeccionTipografia el={el} setEstilo={setEstilo} />}

      {(conRecorte || conRadio) && (
        <Seccion titulo="Forma">
          {conRecorte && (
            <Sel etiqueta="Recorte" valor={el.estilo.recorte || 'ninguno'} opciones={Object.entries(RECORTES).map(([k, v]) => ({ valor: k, texto: v.nombre }))} onCambio={(k) => setEstilo((e) => { e.recorte = k === 'ninguno' ? undefined : k; })} />
          )}
          {conRadio && <Radios el={el} setEstilo={setEstilo} />}
          {todos((e) => ['texto', 'campo', 'imagen', 'contenedor', 'icono'].includes(e.tipo)) && (
            <Fila>
              <Numero etiqueta="↕ Margen" valor={Array.isArray(el.estilo.padding) ? el.estilo.padding[0] : el.estilo.padding || 0} min={0} {...mm} presets={PRESETS.margen} onCambio={(v) => setEstilo((e) => { const h = Array.isArray(e.padding) ? e.padding[1] : e.padding || 0; e.padding = [v, h]; }, 'paddingV')} />
              <Numero etiqueta="↔ Margen" valor={Array.isArray(el.estilo.padding) ? el.estilo.padding[1] : el.estilo.padding || 0} min={0} {...mm} presets={PRESETS.margen} onCambio={(v) => setEstilo((e) => { const vv = Array.isArray(e.padding) ? e.padding[0] : e.padding || 0; e.padding = [vv, v]; }, 'paddingH')} />
            </Fila>
          )}
        </Seccion>
      )}

      {conRelleno && <SeccionRelleno el={el} setEstilo={setEstilo} />}
      {conBorde && <SeccionBorde el={el} setEstilo={setEstilo} />}
      <SeccionSombra el={el} setEstilo={setEstilo} />
      <SeccionCondicion el={el} tipo={tipo} set={set} />
    </div>
  );
}

function Radios({ el, setEstilo }) {
  const r = el.estilo.radio;
  const porEsquina = Array.isArray(r);
  const valores = porEsquina ? r : [r || 0, r || 0, r || 0, r || 0];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {porEsquina
          ? <span className="flex-1 text-[11px] text-default-400">Radio por esquina</span>
          : <div className="flex-1"><Numero etiqueta="Radio" valor={r || 0} min={0} decimales={1} sufijo="px" presets={PRESETS.radio} onCambio={(v) => setEstilo((e) => { e.radio = v; }, 'radio')} /></div>}
        <BotonIcono titulo={porEsquina ? 'Radio uniforme' : 'Radio por esquina'} icono={porEsquina ? Square : Scan} onPress={() => setEstilo((e) => { e.radio = porEsquina ? valores[0] : [...valores]; })} />
      </div>
      {porEsquina && (
        <Fila cols={4}>
          {['↖', '↗', '↘', '↙'].map((t, i) => (
            <Numero key={t} etiqueta={t} valor={valores[i]} min={0} decimales={0} onCambio={(v) => setEstilo((e) => { const n = [...valores]; n[i] = v; e.radio = n; }, `radio${i}`)} />
          ))}
        </Fila>
      )}
    </div>
  );
}

function SeccionRelleno({ el, setEstilo }) {
  const rel = el.estilo.relleno || { tipo: 'ninguno' };
  return (
    <Seccion
      titulo="Relleno"
      accion={rel.tipo === 'ninguno'
        ? <BotonIcono titulo="Agregar relleno" icono={Plus} onPress={() => setEstilo((e) => { e.relleno = { tipo: 'solido', color: '#d9d9d9' }; })} />
        : <BotonIcono titulo="Quitar relleno" icono={Trash2} onPress={() => setEstilo((e) => { e.relleno = { tipo: 'ninguno' }; })} />}
    >
      {rel.tipo !== 'ninguno' && (
        <>
          <GrupoBotones
            valor={rel.tipo}
            onCambio={(t) => setEstilo((e) => { e.relleno = { ...rel, tipo: t, color2: rel.color2 || '#000000', angulo: rel.angulo ?? 180 }; })}
            opciones={[{ valor: 'solido', texto: 'Sólido', titulo: 'Color sólido' }, { valor: 'degradado', texto: 'Degradado', titulo: 'Degradado lineal' }]}
          />
          <SelectorColor valor={rel.color} onCambio={(c) => setEstilo((e) => { e.relleno = { ...(e.relleno || rel), color: c }; }, 'relleno1')} />
          {rel.tipo === 'degradado' && (
            <>
              <SelectorColor valor={rel.color2} onCambio={(c) => setEstilo((e) => { e.relleno = { ...(e.relleno || rel), color2: c }; }, 'relleno2')} />
              <Slider size="sm" aria-label="Ángulo" label={<span className="text-[11px]">Ángulo</span>} minValue={0} maxValue={360} step={1} value={rel.angulo ?? 180} onChange={(v) => setEstilo((e) => { e.relleno = { ...(e.relleno || rel), angulo: v }; }, 'angulo')} />
            </>
          )}
        </>
      )}
    </Seccion>
  );
}

function SeccionBorde({ el, setEstilo }) {
  const b = el.estilo.borde;
  const activo = b && Number(b.grosor) > 0;
  return (
    <Seccion
      titulo={el.tipo === 'linea' ? 'Trazo' : 'Borde'}
      accion={activo
        ? el.tipo !== 'linea' && <BotonIcono titulo="Quitar borde" icono={Trash2} onPress={() => setEstilo((e) => { e.borde = null; })} />
        : <BotonIcono titulo="Agregar borde" icono={Plus} onPress={() => setEstilo((e) => { e.borde = { color: '#111111', grosor: 1, tipo: 'solid' }; })} />}
    >
      {activo && (
        <>
          <SelectorColor valor={b.color} onCambio={(c) => setEstilo((e) => { e.borde = { ...(e.borde || b), color: c }; }, 'borde-color')} />
          <Fila>
            <Numero etiqueta="Grosor" valor={b.grosor} min={0} decimales={1} paso={0.5} sufijo="px" presets={PRESETS.grosor} onCambio={(v) => setEstilo((e) => { e.borde = { ...(e.borde || b), grosor: v }; }, 'borde-g')} />
            <GrupoBotones
              valor={b.tipo || 'solid'}
              onCambio={(t) => setEstilo((e) => { e.borde = { ...(e.borde || b), tipo: t }; })}
              opciones={[{ valor: 'solid', texto: '—', titulo: 'Continuo' }, { valor: 'dashed', texto: '- -', titulo: 'Guiones' }, { valor: 'dotted', texto: '···', titulo: 'Puntos' }]}
            />
          </Fila>
        </>
      )}
    </Seccion>
  );
}

function SeccionSombra({ el, setEstilo }) {
  const lista = Array.isArray(el.estilo.sombra) ? el.estilo.sombra : el.estilo.sombra ? [el.estilo.sombra] : [];
  const setLista = (fn, clave) => setEstilo((e) => { const l = Array.isArray(e.sombra) ? e.sombra.map((x) => ({ ...x })) : e.sombra ? [{ ...e.sombra }] : []; fn(l); e.sombra = l; }, clave);
  return (
    <Seccion
      titulo="Sombras"
      accion={<BotonIcono titulo="Agregar sombra" icono={Plus} onPress={() => setLista((l) => l.push({ x: 0, y: 4, blur: 12, spread: 0, color: '#00000040', interior: false }))} />}
    >
      {lista.map((s, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg bg-default-50 p-2">
          <div className="flex items-center justify-between">
            <GrupoBotones
              valor={s.interior ? 'in' : 'out'}
              onCambio={(v) => setLista((l) => { l[i].interior = v === 'in'; })}
              opciones={[{ valor: 'out', texto: 'Exterior', titulo: 'Sombra exterior' }, { valor: 'in', texto: 'Interior', titulo: 'Sombra interior' }]}
            />
            <BotonIcono titulo="Quitar sombra" icono={Trash2} onPress={() => setLista((l) => l.splice(i, 1))} />
          </div>
          <Fila cols={4}>
            <Numero etiqueta="X" valor={s.x} decimales={0} onCambio={(v) => setLista((l) => { l[i].x = v; }, `sx${i}`)} />
            <Numero etiqueta="Y" valor={s.y} decimales={0} onCambio={(v) => setLista((l) => { l[i].y = v; }, `sy${i}`)} />
            <Numero etiqueta="B" valor={s.blur} decimales={0} min={0} presets={PRESETS.sombraBlur} onCambio={(v) => setLista((l) => { l[i].blur = v; }, `sb${i}`)} />
            <Numero etiqueta="E" valor={s.spread} decimales={0} onCambio={(v) => setLista((l) => { l[i].spread = v; }, `ss${i}`)} />
          </Fila>
          <SelectorColor valor={s.color} onCambio={(c) => setLista((l) => { l[i].color = c; }, `sc${i}`)} />
        </div>
      ))}
      {!lista.length && <p className="text-[11px] text-default-400">Sin sombras.</p>}
      {el.tipo !== 'pagina' && <Numero etiqueta="Desenfoque" valor={el.estilo.desenfoque || 0} min={0} decimales={1} sufijo="px" onCambio={(v) => setEstilo((e) => { e.desenfoque = v; }, 'blur')} />}
    </Seccion>
  );
}

function SeccionTipografia({ el, setEstilo }) {
  const t = { ...ESTILO_TEXTO_DEFAULT, ...(el.estilo.texto || {}) };
  const setT = (fn, clave) => setEstilo((e) => { e.texto = { ...ESTILO_TEXTO_DEFAULT, ...(e.texto || {}) }; fn(e.texto); }, clave);
  return (
    <Seccion titulo="Tipografía">
      <Sel etiqueta="Fuente" valor={t.fuente} opciones={FUENTES.map((f) => ({ valor: f.nombre, texto: f.nombre, estilo: { fontFamily: f.css, fontSize: 14 } }))} onCambio={(v) => setT((x) => { x.fuente = v; })} />
      <Fila>
        <Sel
          etiqueta="Peso"
          valor={String(t.peso)}
          opciones={[[300, 'Ligera'], [400, 'Normal'], [500, 'Media'], [600, 'Semi negrita'], [700, 'Negrita'], [800, 'Extra negrita'], [900, 'Black']].map(([v, n]) => ({ valor: String(v), texto: n }))}
          onCambio={(v) => setT((x) => { x.peso = Number(v); })}
        />
        <Numero etiqueta="Tam" valor={t.tamano} min={4} max={200} decimales={1} paso={0.5} sufijo="px" presets={PRESETS.tamanoFuente} onCambio={(v) => setT((x) => { x.tamano = v; }, 'tam')} />
        <Numero etiqueta="Línea" valor={t.interlineado} min={0.5} max={4} decimales={2} paso={0.05} presets={PRESETS.interlineado} onCambio={(v) => setT((x) => { x.interlineado = v; }, 'interl')} />
        <Numero etiqueta="Esp." valor={t.espaciado} decimales={1} paso={0.1} sufijo="px" presets={PRESETS.espaciado} onCambio={(v) => setT((x) => { x.espaciado = v; }, 'esp')} />
      </Fila>
      <SelectorColor valor={t.color} onCambio={(c) => setT((x) => { x.color = c; }, 'color-texto')} />
      {el.tipo !== 'tabla' && (
        <Fila>
          <GrupoBotones
            valor={t.alinear}
            onCambio={(v) => setT((x) => { x.alinear = v; })}
            opciones={[
              { valor: 'left', titulo: 'Izquierda', icono: AlignLeft },
              { valor: 'center', titulo: 'Centro', icono: AlignCenter },
              { valor: 'right', titulo: 'Derecha', icono: AlignRight },
              { valor: 'justify', titulo: 'Justificado', icono: AlignJustify }
            ]}
          />
          <GrupoBotones
            valor={t.alinearV}
            onCambio={(v) => setT((x) => { x.alinearV = v; })}
            opciones={[
              { valor: 'top', titulo: 'Arriba', icono: ArrowUpToLine },
              { valor: 'center', titulo: 'En medio', icono: FoldVertical },
              { valor: 'bottom', titulo: 'Abajo', icono: ArrowDownToLine }
            ]}
          />
        </Fila>
      )}
      <GrupoBotones
        multiple
        onCambio={(k) => setT((x) => {
          if (k === 'b') x.peso = x.peso >= 700 ? 400 : 700;
          if (k === 'i') x.cursiva = !x.cursiva;
          if (k === 'u') x.subrayado = !x.subrayado;
          if (k === 'aa') x.mayus = !x.mayus;
          if (k === 'ml') x.multilinea = !x.multilinea;
        })}
        opciones={[
          { valor: 'b', titulo: 'Negrita', icono: Bold, activo: t.peso >= 700 },
          { valor: 'i', titulo: 'Cursiva', icono: Italic, activo: t.cursiva },
          { valor: 'u', titulo: 'Subrayado', icono: Underline, activo: t.subrayado },
          { valor: 'aa', titulo: 'Mayúsculas', icono: CaseUpper, activo: t.mayus },
          ...(el.tipo !== 'tabla' ? [{ valor: 'ml', titulo: t.multilinea ? 'Varias líneas (clic: una sola línea)' : 'Una línea (clic: varias líneas)', texto: t.multilinea ? '¶' : '—', activo: t.multilinea }] : [])
        ]}
      />
    </Seccion>
  );
}

function opcionesCampos(tipo, incluirListas = false) {
  const cat = CATALOGO[tipo];
  const grupos = {};
  for (const c of cat.campos) {
    (grupos[c.grupo] = grupos[c.grupo] || []).push({ valor: c.clave, texto: c.etiqueta });
  }
  const secciones = Object.entries(grupos).map(([titulo, opciones]) => ({ titulo, opciones }));
  if (incluirListas) secciones.push({ titulo: 'Listas', opciones: cat.tablas.map((t) => ({ valor: t.clave, texto: t.etiqueta })) });
  return secciones;
}

function SeccionCampo({ el, tipo, set }) {
  const p = el.props;
  const info = campoInfo(tipo, p.campo);
  return (
    <Seccion titulo="Dato enlazado">
      <Sel
        etiqueta="Campo"
        valor={p.campo}
        secciones={opcionesCampos(tipo).map((s) => ({ ...s, opciones: s.opciones.filter((o) => !(campoInfo(tipo, o.valor) || {}).soloCondicion) }))}
        onCambio={(v) => set((x) => {
          x.props.campo = v;
          const c = campoInfo(tipo, v);
          if (c) { x.props.formato = c.formato || 'texto'; if (!x.nombre || x.nombre === (info && info.etiqueta) || x.nombre === 'Campo') x.nombre = c.etiqueta; }
        })}
      />
      <Sel etiqueta="Formato" valor={p.formato} opciones={Object.entries(FORMATOS_VALOR).filter(([k]) => k !== 'insignia').map(([k, v]) => ({ valor: k, texto: v }))} onCambio={(v) => set((x) => { x.props.formato = v; })} />
      <Fila>
        <Texto etiqueta="Antes" valor={p.prefijo} onCambio={(v) => set((x) => { x.props.prefijo = v; }, 'prefijo')} />
        <Texto etiqueta="Después" valor={p.sufijo} onCambio={(v) => set((x) => { x.props.sufijo = v; }, 'sufijo')} />
      </Fila>
      <Texto etiqueta="Si está vacío" valor={p.textoVacio} placeholder="(nada)" onCambio={(v) => set((x) => { x.props.textoVacio = v; }, 'vacio')} />
      <Switch size="sm" isSelected={Boolean(p.anchoAuto)} onValueChange={(v) => set((x) => { x.props.anchoAuto = v; })}>
        <span className="text-[12px]">Ancho automático (crece si el dato no cabe)</span>
      </Switch>
    </Seccion>
  );
}

function SeccionImagen({ el, set }) {
  const doc = useEditor((s) => s.doc);
  const p = el.props;
  const origen = p.campo ? 'logo' : p.recursoId ? 'recurso' : 'vacio';
  return (
    <Seccion titulo="Imagen">
      <Sel
        etiqueta="Origen"
        valor={origen === 'recurso' ? `r:${p.recursoId}` : origen}
        opciones={[
          { valor: 'logo', texto: 'Logo de la empresa' },
          ...(doc.recursos || []).map((r) => ({ valor: `r:${r.id}`, texto: r.nombre || 'Imagen' })),
          { valor: 'vacio', texto: 'Sin imagen' }
        ]}
        onCambio={(v) => set((x) => {
          if (v === 'logo') { x.props.campo = 'logo'; x.props.recursoId = null; } else if (v.startsWith('r:')) { x.props.campo = null; x.props.recursoId = v.slice(2); } else { x.props.campo = null; x.props.recursoId = null; }
        })}
      />
      <GrupoBotones
        valor={p.ajuste || 'contain'}
        onCambio={(v) => set((x) => { x.props.ajuste = v; })}
        opciones={[{ valor: 'contain', texto: 'Ajustar', titulo: 'Se ve completa' }, { valor: 'cover', texto: 'Llenar', titulo: 'Cubre la caja (recorta)' }, { valor: 'fill', texto: 'Estirar', titulo: 'Estira a la caja' }]}
      />
      <p className="text-[11px] text-default-400">Sube imágenes en la pestaña «Recursos» o arrástralas al lienzo.</p>
    </Seccion>
  );
}

function SeccionIcono({ el, set }) {
  const p = el.props;
  return (
    <Seccion titulo="Ícono">
      <div className="grid grid-cols-8 gap-1">
        {Object.entries(ICONOS).map(([k, v]) => {
          const I = v.c;
          return (
            <button
              key={k}
              type="button"
              title={v.nombre}
              aria-label={v.nombre}
              aria-pressed={p.icono === k}
              onClick={() => set((x) => { x.props.icono = k; x.nombre = v.nombre; })}
              className={`flex h-7 items-center justify-center rounded-md ${p.icono === k ? 'bg-primary text-primary-foreground' : 'text-default-500 hover:bg-default-100 hover:text-foreground'}`}
            >
              <I className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <SelectorColor valor={p.color} onCambio={(c) => set((x) => { x.props.color = c; }, 'icono-color')} />
      <Numero etiqueta="Trazo" valor={p.trazo ?? 2} min={0.5} max={4} decimales={2} paso={0.25} presets={[1, 1.5, 2, 2.5, 3]} onCambio={(v) => set((x) => { x.props.trazo = v; }, 'icono-trazo')} />
    </Seccion>
  );
}

function SeccionForma({ el, set }) {
  const p = el.props;
  if (el.tipo === 'linea') {
    return (
      <Seccion titulo="Línea">
        <GrupoBotones
          multiple
          onCambio={(k) => set((x) => { if (k === 'ini') x.props.flechaInicio = !p.flechaInicio; if (k === 'fin') x.props.flechaFin = !p.flechaFin; })}
          opciones={[{ valor: 'ini', texto: '◀ Flecha inicio', titulo: 'Flecha al inicio', activo: p.flechaInicio }, { valor: 'fin', texto: 'Flecha fin ▶', titulo: 'Flecha al final', activo: p.flechaFin }]}
        />
        <GrupoBotones
          valor={p.extremo || 'butt'}
          onCambio={(v) => set((x) => { x.props.extremo = v; })}
          opciones={[{ valor: 'butt', texto: 'Recto', titulo: 'Extremo recto' }, { valor: 'round', texto: 'Redondo', titulo: 'Extremo redondo' }, { valor: 'square', texto: 'Cuadrado', titulo: 'Extremo cuadrado' }]}
        />
      </Seccion>
    );
  }
  return (
    <Seccion titulo={el.tipo === 'estrella' ? 'Estrella' : 'Polígono'}>
      {el.tipo === 'poligono'
        ? <Slider size="sm" aria-label="Lados" label={<span className="text-[11px]">Lados</span>} minValue={3} maxValue={12} step={1} value={p.lados || 3} onChange={(v) => set((x) => { x.props.lados = v; }, 'lados')} />
        : (
          <>
            <Slider size="sm" aria-label="Puntas" label={<span className="text-[11px]">Puntas</span>} minValue={3} maxValue={16} step={1} value={p.puntas || 5} onChange={(v) => set((x) => { x.props.puntas = v; }, 'puntas')} />
            <Slider size="sm" aria-label="Radio interior" label={<span className="text-[11px]">Radio interior</span>} minValue={0.1} maxValue={0.9} step={0.01} value={p.radioInterior || 0.45} onChange={(v) => set((x) => { x.props.radioInterior = v; }, 'radioInt')} />
          </>
        )}
    </Seccion>
  );
}

function SeccionTabla({ el, tipo, set }) {
  const p = el.props;
  const enc = p.encabezado || {};
  const filas = p.filas || {};
  const bordes = p.bordes || {};
  const setP = (fn, clave) => set((x) => fn(x.props), clave);
  return (
    <>
      <Seccion titulo="Tabla">
        <Sel
          etiqueta="Datos"
          valor={p.fuente}
          opciones={CATALOGO[tipo].tablas.map((t) => ({ valor: t.clave, texto: t.etiqueta }))}
          onCambio={(v) => setP((x) => {
            if (x.fuente === v) return;
            x.fuente = v;
            const t = CATALOGO[tipo].tablas.find((z) => z.clave === v);
            if (t) x.columnas = t.columnas.map((c) => ({ ...c }));
          })}
        />
        <GrupoBotones
          valor={p.crecer || 'flujo'}
          onCambio={(v) => setP((x) => { x.crecer = v; })}
          opciones={[{ valor: 'flujo', texto: 'Crece con los datos', titulo: 'La tabla crece y recorre lo de abajo' }, { valor: 'fijo', texto: 'Alto fijo', titulo: 'Siempre ocupa el alto dibujado' }]}
        />
        <Fila>
          <Numero etiqueta="Alto fila" valor={p.altoFila} min={8} {...mm} onCambio={(v) => setP((x) => { x.altoFila = v; }, 'altoFila')} />
          <Numero etiqueta="Mín. filas" valor={p.filasMinimas || 0} min={0} max={60} decimales={0} onCambio={(v) => setP((x) => { x.filasMinimas = v; }, 'minFilas')} />
          <Numero etiqueta="Relleno" valor={p.relleno ?? 4} min={0} decimales={1} sufijo="px" onCambio={(v) => setP((x) => { x.relleno = v; }, 'relleno')} />
        </Fila>
      </Seccion>
      <Seccion titulo="Columnas">
        <EditorColumnas el={el} tipo={tipo} setP={setP} />
      </Seccion>
      <Seccion titulo="Encabezado">
        <Switch size="sm" isSelected={Boolean(enc.mostrar)} onValueChange={(v) => setP((x) => { x.encabezado = { ...enc, mostrar: v }; })}><span className="text-[12px]">Mostrar encabezado</span></Switch>
        {enc.mostrar && (
          <>
            <Fila>
              <Numero etiqueta="Alto" valor={enc.alto} min={8} {...mm} onCambio={(v) => setP((x) => { x.encabezado = { ...x.encabezado, alto: v }; }, 'encAlto')} />
              <Numero etiqueta="Separar" valor={enc.separacion || 0} min={0} {...mm} onCambio={(v) => setP((x) => { x.encabezado = { ...x.encabezado, separacion: v }; }, 'encSep')} />
              <Numero etiqueta="Tam" valor={enc.tamano || 11} min={4} decimales={1} sufijo="px" presets={PRESETS.tamanoFuente} onCambio={(v) => setP((x) => { x.encabezado = { ...x.encabezado, tamano: v }; }, 'encTam')} />
              <Sel etiqueta="Peso" valor={String(enc.peso || 700)} opciones={[400, 500, 600, 700, 800, 900].map((v) => ({ valor: String(v), texto: String(v) }))} onCambio={(v) => setP((x) => { x.encabezado = { ...x.encabezado, peso: Number(v) }; })} />
              <Numero etiqueta="Esp." valor={enc.espaciado || 0} decimales={1} paso={0.1} sufijo="px" presets={PRESETS.espaciado} onCambio={(v) => setP((x) => { x.encabezado = { ...x.encabezado, espaciado: v }; }, 'encEsp')} />
            </Fila>
            <p className="text-[11px] text-default-400">Fondo</p>
            <SelectorColor valor={enc.fondo} onCambio={(c) => setP((x) => { x.encabezado = { ...x.encabezado, fondo: c }; }, 'encFondo')} />
            <p className="text-[11px] text-default-400">Texto</p>
            <SelectorColor valor={enc.color} onCambio={(c) => setP((x) => { x.encabezado = { ...x.encabezado, color: c }; }, 'encColor')} />
            <Switch size="sm" isSelected={Boolean(enc.mayus)} onValueChange={(v) => setP((x) => { x.encabezado = { ...x.encabezado, mayus: v }; })}><span className="text-[12px]">Mayúsculas</span></Switch>
          </>
        )}
      </Seccion>
      <Seccion titulo="Filas">
        <p className="text-[11px] text-default-400">Fondo</p>
        <SelectorColor valor={filas.fondo === 'transparent' ? '#ffffff00' : filas.fondo} onCambio={(c) => setP((x) => { x.filas = { ...x.filas, fondo: c }; }, 'filaFondo')} />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-default-400">Filas alternas (cebra)</p>
          <Switch size="sm" isSelected={Boolean(filas.fondoAlterno)} onValueChange={(v) => setP((x) => { x.filas = { ...x.filas, fondoAlterno: v ? '#aed4ee38' : '' }; })} />
        </div>
        {filas.fondoAlterno && (
          <>
            <SelectorColor valor={filas.fondoAlterno} onCambio={(c) => setP((x) => { x.filas = { ...x.filas, fondoAlterno: c }; }, 'filaAlt')} />
            <GrupoBotones
              valor={filas.alternarPrimero === false ? 'no' : 'si'}
              onCambio={(v) => setP((x) => { x.filas = { ...x.filas, alternarPrimero: v === 'si' }; })}
              opciones={[{ valor: 'si', texto: 'Desde la 1ª', titulo: 'La primera fila lleva el color alterno' }, { valor: 'no', texto: 'Desde la 2ª', titulo: 'La segunda fila lleva el color alterno' }]}
            />
          </>
        )}
        <Switch size="sm" isSelected={Boolean(filas.mayus)} onValueChange={(v) => setP((x) => { x.filas = { ...x.filas, mayus: v }; })}><span className="text-[12px]">Mayúsculas</span></Switch>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-default-400">Color según signo (rojo −, verde +)</p>
          <Switch
            size="sm"
            isSelected={Boolean(filas.colorPorSigno)}
            onValueChange={(v) => setP((x) => {
              const numericos = Object.keys((tablaInfo(tipo, x.fuente) || {}).camposFila || {});
              x.filas = { ...x.filas, colorPorSigno: v ? { campo: numericos.includes('monto') ? 'monto' : numericos[0], negativo: '#d92d20', positivo: '#15803d' } : null };
            })}
          />
        </div>
        {filas.colorPorSigno && (
          <>
            <Sel
              etiqueta="Según"
              valor={filas.colorPorSigno.campo}
              opciones={Object.entries((tablaInfo(tipo, p.fuente) || {}).camposFila || {}).map(([k, v]) => ({ valor: k, texto: v }))}
              onCambio={(v) => setP((x) => { x.filas = { ...x.filas, colorPorSigno: { ...x.filas.colorPorSigno, campo: v } }; })}
            />
            <p className="text-[11px] text-default-400">Negativo</p>
            <SelectorColor valor={filas.colorPorSigno.negativo} onCambio={(c) => setP((x) => { x.filas = { ...x.filas, colorPorSigno: { ...x.filas.colorPorSigno, negativo: c } }; }, 'signoNeg')} />
            <p className="text-[11px] text-default-400">Positivo</p>
            <SelectorColor valor={filas.colorPorSigno.positivo} onCambio={(c) => setP((x) => { x.filas = { ...x.filas, colorPorSigno: { ...x.filas.colorPorSigno, positivo: c } }; }, 'signoPos')} />
          </>
        )}
      </Seccion>
      <Seccion titulo="Líneas de la tabla">
        <Sel
          etiqueta="Líneas"
          valor={bordes.modo || 'ninguno'}
          opciones={[{ valor: 'ninguno', texto: 'Sin líneas' }, { valor: 'todas', texto: 'Cuadrícula completa' }, { valor: 'horizontales', texto: 'Solo horizontales' }, { valor: 'inferior', texto: 'Separador entre filas' }, { valor: 'exterior', texto: 'Solo contorno' }]}
          onCambio={(v) => setP((x) => { x.bordes = { ...x.bordes, modo: v }; })}
        />
        {bordes.modo && bordes.modo !== 'ninguno' && (
          <>
            <SelectorColor valor={bordes.color} onCambio={(c) => setP((x) => { x.bordes = { ...x.bordes, color: c }; }, 'bordeTabla')} />
            <Numero etiqueta="Grosor" valor={bordes.grosor || 1} min={0.5} decimales={1} paso={0.5} sufijo="px" presets={PRESETS.grosor} onCambio={(v) => setP((x) => { x.bordes = { ...x.bordes, grosor: v }; }, 'bordeTablaG')} />
            {bordes.modo === 'todas' && enc.mostrar && (
              <Switch size="sm" isSelected={Boolean(enc.bordeGrueso)} onValueChange={(v) => setP((x) => { x.encabezado = { ...x.encabezado, bordeGrueso: v }; })}><span className="text-[12px]">Línea gruesa bajo el encabezado</span></Switch>
            )}
          </>
        )}
      </Seccion>
    </>
  );
}

function SeccionCondicion({ el, tipo, set }) {
  const c = el.visibleSi;
  return (
    <Seccion
      titulo="Mostrar solo si…"
      abierta={Boolean(c)}
      accion={c
        ? <BotonIcono titulo="Mostrar siempre" icono={Link2Off} onPress={() => set((x) => { x.visibleSi = null; })} />
        : <BotonIcono titulo="Agregar condición" icono={Link2} onPress={() => set((x) => { x.visibleSi = { campo: CATALOGO[tipo].campos.find((z) => /isr/.test(z.clave))?.clave || 'folio', cond: 'noCero' }; x.colapsar = true; })} />}
    >
      {c ? (
        <>
          <Sel etiqueta="Dato" valor={c.campo} secciones={opcionesCampos(tipo, true)} onCambio={(v) => set((x) => { x.visibleSi = { ...x.visibleSi, campo: v }; })} />
          <Sel etiqueta="Condición" valor={c.cond || 'noVacio'} opciones={Object.entries(CONDICIONES).map(([k, v]) => ({ valor: k, texto: v }))} onCambio={(v) => set((x) => { x.visibleSi = { ...x.visibleSi, cond: v }; })} />
          <Switch size="sm" isSelected={Boolean(el.colapsar)} onValueChange={(v) => set((x) => { x.colapsar = v; })}>
            <span className="text-[12px]">Al ocultarse, subir lo de abajo</span>
          </Switch>
        </>
      ) : (
        <p className="text-[11px] leading-snug text-default-400">Siempre visible. Útil para renglones como ISR o retención, que solo aparecen cuando aplican.</p>
      )}
    </Seccion>
  );
}

function Atajos() {
  const filas = [
    ['V', 'Mover / seleccionar'], ['H o Espacio', 'Mano (desplazar)'], ['F', 'Contenedor'], ['R', 'Rectángulo'], ['O', 'Elipse'], ['L', 'Línea'],
    ['P', 'Polígono'], ['T', 'Texto'], ['I', 'Imagen'], ['Ctrl + rueda', 'Zoom'], ['Shift + 1', 'Ajustar a pantalla'], ['Shift + 0', 'Zoom 100%'],
    ['Ctrl + Z / Ctrl + Shift + Z', 'Deshacer / rehacer'], ['Ctrl + C / V / D', 'Copiar / pegar / duplicar'], ['Supr', 'Eliminar'],
    ['Ctrl + G / Ctrl + Shift + G', 'Agrupar / desagrupar'], ['Ctrl + ] / [', 'Subir / bajar capa'], ['Flechas (+Shift)', 'Mover 1 px (10 px)'],
    ['Doble clic', 'Entrar al grupo / editar texto'], ['Ctrl + clic', 'Seleccionar dentro de un grupo'], ['Shift al redimensionar', 'Mantener proporción'], ['Ctrl + S', 'Guardar']
  ];
  return (
    <div className="flex flex-col gap-1 p-3">
      {filas.map(([k, d]) => (
        <div key={k} className="flex items-center justify-between gap-2 border-b border-default-100 py-1.5 text-[12px]">
          <span className="text-default-500">{d}</span>
          <kbd className="whitespace-nowrap rounded bg-default-100 px-1.5 py-0.5 font-mono text-[10px]">{k}</kbd>
        </div>
      ))}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-default-50 p-2 text-[11px] text-default-500">
        <Palette className="mt-0.5 h-3.5 w-3.5 flex-none" />
        Sin nada seleccionado, este panel muestra el tamaño de página, la impresión y las paletas de color.
      </div>
    </div>
  );
}
