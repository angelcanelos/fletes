const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splash', {
  alCambiarEstado: (cb) => ipcRenderer.on('splash:estado', (_e, estado) => cb(estado))
});
