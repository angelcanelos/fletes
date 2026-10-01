import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import App from './App.jsx';
import './styles/index.css';
import './styles/formato.css';
import './styles/flete.css';
import './lib/syncEngine.js'; // arranca el motor de sincronización offline al abrir la app

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HeroUIProvider locale="es-MX">
        <App />
      </HeroUIProvider>
    </BrowserRouter>
  </React.StrictMode>
);
