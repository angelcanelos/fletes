import { ToastProvider as HeroUIToastProvider, addToast } from '@heroui/react';

// HeroUI ya trae su propio sistema de toasts (addToast, imperativo, sin
// necesitar contexto propio) — se envuelve en la misma API que ya usaba
// toda la app (useToast().exito/error/info) para no tocar cada pantalla
// que ya llama a esos tres métodos.
export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <HeroUIToastProvider placement="bottom-center" toastOffset={16} regionProps={{ className: 'no-imprimir' }} />
    </>
  );
}

const api = {
  exito: (texto) => addToast({ description: texto, color: 'success', timeout: 3500 }),
  error: (texto) => addToast({ description: texto, color: 'danger', timeout: 5000 }),
  info: (texto) => addToast({ description: texto, color: 'default', timeout: 3500 })
};

export function useToast() {
  return api;
}
