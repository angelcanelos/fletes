import { useNavigate } from 'react-router-dom';
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react';
import { MoreVertical, SquarePen, Trash2 } from 'lucide-react';

// Menú de "3 puntitos" de cada fila de los dashboards: Editar y Eliminar
// quedan aquí para que en la fila solo se vea lo de uso diario
// (pendiente/facturado e imprimir).
export default function MenuAcciones({ urlEditar, onEliminar, eliminando, nombre }) {
  const navigate = useNavigate();
  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          isIconOnly size="sm" radius="full" variant="light"
          className="h-9 w-9 min-w-9 text-ink-600 hover:bg-surface-muted"
          isDisabled={eliminando}
          aria-label={`Más opciones de ${nombre}`} title="Más opciones"
        >
          <MoreVertical className="h-4 w-4" strokeWidth={2} />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={`Opciones de ${nombre}`}
        onAction={(k) => {
          if (k === 'editar') navigate(urlEditar);
          if (k === 'eliminar') onEliminar();
        }}
      >
        <DropdownItem key="editar" startContent={<SquarePen className="h-4 w-4" />}>Editar</DropdownItem>
        <DropdownItem key="eliminar" className="text-danger" color="danger" startContent={<Trash2 className="h-4 w-4" />}>Eliminar</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
