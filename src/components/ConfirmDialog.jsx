import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { TriangleAlert } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialogo, setDialogo] = useState(null);
  const resolverRef = useRef(null);

  const confirmar = useCallback((opciones) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogo({
        titulo: opciones.titulo || '¿Confirmar acción?',
        texto: opciones.texto || '',
        textoConfirmar: opciones.textoConfirmar || 'Confirmar',
        textoCancelar: opciones.textoCancelar || 'Cancelar',
        peligro: opciones.peligro !== false
      });
    });
  }, []);

  function cerrar(resultado) {
    setDialogo(null);
    if (resolverRef.current) {
      resolverRef.current(resultado);
      resolverRef.current = null;
    }
  }

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Modal isOpen={!!dialogo} onOpenChange={(abierto) => { if (!abierto) cerrar(false); }} placement="center" backdrop="opaque">
        <ModalContent>
          {dialogo && (
            <>
              <ModalHeader className="flex items-start gap-3.5 pb-0">
                <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${dialogo.peligro ? 'bg-danger-bg' : 'bg-brand-50'}`}>
                  <TriangleAlert className={`h-6 w-6 ${dialogo.peligro ? 'text-danger' : 'text-brand-600'}`} strokeWidth={2.25} />
                </div>
                <div className="flex-1 pt-1 text-left">
                  <h2 className="m-0 text-[16px] font-bold text-ink-900">{dialogo.titulo}</h2>
                </div>
              </ModalHeader>
              <ModalBody>
                {dialogo.texto && <p className="text-sm leading-relaxed text-ink-500">{dialogo.texto}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" autoFocus onPress={() => cerrar(false)}>
                  {dialogo.textoCancelar}
                </Button>
                <Button color={dialogo.peligro ? 'danger' : 'primary'} onPress={() => cerrar(true)}>
                  {dialogo.textoConfirmar}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
