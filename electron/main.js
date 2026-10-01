const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// A diferencia de extraccion-app, esta versión no levanta un servidor
// local ni una base SQLite propia: los datos viven en Supabase y el
// espejo/cola offline vive en IndexedDB, dentro del propio navegador que
// usa Electron (Chromium) — así que solo hace falta cargar la página ya
// compilada. Por eso este main.js es mucho más simple.
app.setName('Forestal Tezains');

// Cargar dist/index.html con file:// directo NO funciona: Chromium trata
// cada archivo file:// como un origen "opaco" y bloquea por CORS el
// <script type="module"> que genera Vite, dejando la ventana en blanco.
// La solución de Electron es registrar un esquema propio ("app://") que
// sirve los mismos archivos pero como un origen "estándar" normal, donde
// los módulos ES sí cargan. Debe registrarse ANTES de app.whenReady().
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

const ES_DEV = !app.isPackaged;
let mainWindow = null;

function registrarProtocoloApp() {
  const distDir = path.join(__dirname, '..', 'dist');
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const relativo = decodeURIComponent(pathname === '/' || pathname === '' ? '/index.html' : pathname);
    const archivo = path.join(distDir, relativo);
    return net.fetch(pathToFileURL(archivo).toString());
  });
}

function crearVentanaPrincipal() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0e1a11',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  Menu.setApplicationMenu(null);
  mainWindow.maximize();

  if (ES_DEV) {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadURL('app://index.html');
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  if (!ES_DEV) registrarProtocoloApp();
  crearVentanaPrincipal();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) crearVentanaPrincipal();
});
