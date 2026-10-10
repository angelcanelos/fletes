const { contextBridge, ipcRenderer } = require('electron');

// Puente mínimo entre la página (React) y el proceso principal para las
// actualizaciones. Solo existe dentro de la app de escritorio: en el
// navegador window.actualizaciones queda undefined y la etiqueta no sale.
contextBridge.exposeInMainWorld('actualizaciones', {
  estado: () => ipcRenderer.invoke('actualizacion:estado'),
  versionActual: () => ipcRenderer.invoke('actualizacion:version-actual'),
  instalar: () => ipcRenderer.invoke('actualizacion:instalar'),
  alDisponible: (cb) => {
    const handler = (_e, datos) => cb(datos);
    ipcRenderer.on('actualizacion:disponible', handler);
    return () => ipcRenderer.removeListener('actualizacion:disponible', handler);
  }
});
