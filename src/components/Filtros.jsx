import { Input, DatePicker, Select, SelectItem } from '@heroui/react';
import { parseDate } from '@internationalized/date';
import { Search } from 'lucide-react';

// Controles de HeroUI para las barras de filtros de los dashboards, con la
// misma apariencia: píldora gris clara que se vuelve blanca con anillo
// índigo al enfocarse. Todos trabajan con strings simples ('' = sin
// filtro) para no cambiar cómo se guardan los filtros.

const envoltura =
  'h-14 bg-surface-muted shadow-none data-[hover=true]:bg-ink-100 ' +
  'group-data-[focus=true]:bg-white group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-brand-100 ' +
  'group-data-[open=true]:bg-white group-data-[open=true]:ring-4 group-data-[open=true]:ring-brand-100';

const etiqueta = 'text-[12px] font-medium text-ink-500';

const opcion =
  'rounded-full px-3 py-2 text-ink-700 outline-none data-[focus-visible=true]:outline-0 ' +
  'data-[hover=true]:bg-surface-muted data-[hover=true]:text-ink-900 ' +
  'data-[selectable=true]:focus:bg-surface-muted data-[selectable=true]:focus:text-ink-900 ' +
  'data-[selected=true]:bg-brand-50 data-[selected=true]:font-medium data-[selected=true]:text-brand-700';

export function FiltroBuscar({ value, onChange, placeholder }) {
  return (
    <Input
      aria-label="Buscar"
      radius="full"
      placeholder={placeholder}
      value={value}
      onValueChange={onChange}
      isClearable
      onClear={() => onChange('')}
      startContent={<Search className="h-[18px] w-[18px] flex-none text-ink-500" strokeWidth={2} />}
      className="min-w-[240px] flex-1"
      classNames={{ inputWrapper: `${envoltura} px-4`, input: 'text-[14px] placeholder:text-ink-400' }}
    />
  );
}

// value/onChange en formato 'AAAA-MM-DD' (o '' sin fecha).
export function FiltroFecha({ label, value, onChange }) {
  return (
    <DatePicker
      label={label}
      radius="full"
      value={value ? parseDate(value) : null}
      onChange={(fecha) => onChange(fecha ? fecha.toString() : '')}
      showMonthAndYearPickers
      className="w-[180px]"
      classNames={{ inputWrapper: `${envoltura} px-4`, label: etiqueta }}
      calendarProps={{ classNames: { base: 'rounded-3xl' } }}
    />
  );
}

// opciones: [{ valor, texto }]. La opción "todos" equivale a ''.
export function FiltroSelect({ label, value, onChange, textoTodos, opciones, className = 'w-[190px]' }) {
  const TODOS = '__todos__';
  return (
    <Select
      label={label}
      radius="full"
      disallowEmptySelection
      selectedKeys={[value || TODOS]}
      onSelectionChange={(keys) => {
        const clave = Array.from(keys)[0];
        onChange(clave === TODOS || clave === undefined ? '' : String(clave));
      }}
      className={className}
      classNames={{ trigger: `${envoltura} px-4`, label: etiqueta, value: 'text-[14px] text-ink-900' }}
      popoverProps={{ classNames: { content: 'rounded-3xl p-1.5' } }}
    >
      {[{ valor: TODOS, texto: textoTodos }, ...opciones].map((o) => (
        <SelectItem key={o.valor} classNames={{ base: opcion }}>{o.texto}</SelectItem>
      ))}
    </Select>
  );
}
