import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import AvisoSesion from './components/AvisoSesion.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Login from './pages/Login.jsx';
import Inicio from './pages/Inicio.jsx';
import Dashboard from './pages/Dashboard.jsx';
import FormatoForm from './pages/FormatoForm.jsx';
import Imprimir from './pages/Imprimir.jsx';
import FletesDashboard from './pages/FletesDashboard.jsx';
import FleteForm from './pages/FleteForm.jsx';
import FleteImprimir from './pages/FleteImprimir.jsx';
import Ajustes from './pages/Ajustes.jsx';
import Plantillas from './pages/Plantillas.jsx';
import EditorFormato from './pages/EditorFormato.jsx';
import ImprimirPrueba from './pages/ImprimirPrueba.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';

// El shell (sidebar + contenido) envuelve las pantallas normales de la
// app. Las pantallas de impresión quedan fuera a propósito: son una hoja
// de papel a pantalla completa, no una vista más del dashboard, y así el
// sidebar nunca aparece de fondo en la vista previa de impresión.
function Shell() {
  return (
    <div className="fondo-app flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <AvisoSesion />
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RequireAuth />}>
              <Route element={<Shell />}>
                <Route path="/" element={<Navigate to="/inicio" replace />} />
                <Route path="/inicio" element={<Inicio />} />

                <Route path="/extraccion" element={<Dashboard />} />
                <Route path="/extraccion/nuevo" element={<FormatoForm />} />
                <Route path="/extraccion/:id/editar" element={<FormatoForm />} />

                <Route path="/fletes" element={<FletesDashboard />} />
                <Route path="/fletes/nuevo" element={<FleteForm />} />
                <Route path="/fletes/:id/editar" element={<FleteForm />} />

                <Route path="/formatos" element={<Plantillas />} />

                <Route path="/ajustes" element={<Ajustes />} />
              </Route>

              <Route path="/extraccion/imprimir/:id" element={<Imprimir />} />
              <Route path="/fletes/imprimir/:id" element={<FleteImprimir />} />

              {/* Editor de Formatos: pantalla completa (modo oscuro), sin sidebar */}
              <Route path="/formatos/:id/editor" element={<EditorFormato />} />
              <Route path="/formatos/:id/prueba" element={<ImprimirPrueba />} />
            </Route>
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
