const { app, BrowserWindow, Menu, protocol, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// A diferencia de extraccion-app, esta versión no levanta un servidor
// local ni una base SQLite propia: los datos viven en Supabase y el
// espejo/cola offline vive en IndexedDB, dentro del propio navegador que
// usa Electron (Chromium) — así que solo hace falta cargar la página ya
// compilada. Por eso este main.js es mucho más simple.
app.setName('Gestión Extracción y Fletes');

// Electron mete el nombre de la app en el User-Agent de cada petición, y
// las cabeceras HTTP solo admiten caracteres latin-1: con los acentos de
// "Gestión Extracción" fallaba la carga del JS/CSS (ERR_UNEXPECTED) y la
// ventana se quedaba en negro. Se usa un User-Agent sin acentos.
app.userAgentFallback = app.userAgentFallback.replace(/[^ -~]/g, (c) => c.normalize('NFD').replace(/[^ -~]/g, ''));

// La app se llamaba "Forestal Tezains" y Electron guarda sus datos locales
// (el espejo offline en IndexedDB, la cola de cambios por subir y la
// sesión) en una carpeta con el nombre de la app. Se fija la carpeta de
// antes para que, al actualizar, no se pierda nada de eso.
app.setPath('userData', path.join(app.getPath('appData'), 'Forestal Tezains'));

// Solo una instancia de la app a la vez: si ya está abierta y se le da
// doble clic otra vez, la nueva se cierra y se trae al frente la ventana
// que ya existía. Antes se abrían varias que compartían la misma carpeta
// de datos (IndexedDB) y se bloqueaban entre sí, y dejaban de cargar.
// Va después de setPath('userData') porque el candado vive en esa carpeta.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  // Durante la actualización la ventana principal está oculta a propósito
  // detrás del splash: se enfoca el splash en vez de reaparecerla.
  if (splashWindow) { splashWindow.focus(); return; }
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

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
let splashWindow = null;

const TIPOS_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

function registrarProtocoloApp() {
  const distDir = path.join(__dirname, '..', 'dist');
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const relativo = decodeURIComponent(pathname === '/' || pathname === '' ? '/index.html' : pathname);
    const archivo = path.join(distDir, relativo);
    // Se lee el archivo directo en vez de usar net.fetch(file://...): desde
    // que la app se instala en "Gestión Extracción y Fletes" (con acentos),
    // net.fetch fallaba con ERR_UNEXPECTED al pedir el JS/CSS dentro del
    // .asar y la ventana se quedaba en negro.
    try {
      const contenido = fs.readFileSync(archivo);
      const tipo = TIPOS_MIME[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
      return new Response(contenido, { headers: { 'Content-Type': tipo } });
    } catch {
      // Rutas de la app como /extraccion/imprimir/5 no son archivos: las
      // resuelve React Router, así que se sirve index.html (lo mismo que
      // hace el servidor de Vite). Solo un archivo con extensión que de
      // verdad falte (una imagen, un .js) responde 404.
      if (path.extname(relativo)) return new Response('', { status: 404 });
      return new Response(fs.readFileSync(path.join(distDir, 'index.html')), { headers: { 'Content-Type': TIPOS_MIME['.html'] } });
    }
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
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
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

  // Las pantallas de impresión se abren en una ventana aparte (target
  // _blank): se les da tamaño, ícono y fondo claro para que no aparezca
  // una ventanita negra de 800x600 sin estilo.
  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width: 1100,
      height: 900,
      minWidth: 720,
      minHeight: 560,
      backgroundColor: '#f4f5f8',
      icon: path.join(__dirname, 'assets', 'icon.ico'),
      autoHideMenuBar: true
    }
  }));
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ---------------------------------------------------------------------
// Actualizaciones automáticas desde GitHub Releases
// ---------------------------------------------------------------------
// Al abrir la app se revisa en silencio si hay una versión nueva publicada
// en github.com/angelcanelos/fletes. NO se descarga sola: la app solo
// muestra la etiqueta "Actualización disponible" y, cuando la secretaria
// le da clic, se abre el splash (estilo Discord) que busca, descarga e
// instala, y la app se vuelve a abrir ya actualizada.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

let versionDisponible = null;
let actualizando = false;

function avisarDisponible() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('actualizacion:disponible', { version: versionDisponible });
  }
}

function enviarAlSplash(estado) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash:estado', estado);
  }
}

autoUpdater.on('update-available', (info) => {
  versionDisponible = info.version;
  avisarDisponible();
});

autoUpdater.on('download-progress', (p) => {
  enviarAlSplash({ fase: 'descargando', porcentaje: Math.round(p.percent || 0) });
});

autoUpdater.on('update-downloaded', () => {
  enviarAlSplash({ fase: 'instalando' });
  // Un respiro para que se alcance a leer "Instalando…" antes de cerrar.
  // quitAndInstall(silencioso, volver a abrir al terminar).
  setTimeout(() => autoUpdater.quitAndInstall(true, true), 1200);
});

autoUpdater.on('error', (err) => {
  console.error('[actualizaciones]', err);
  if (actualizando) terminarActualizacion('No se pudo actualizar. Revisa tu conexión a internet e inténtalo más tarde.');
});

function buscarEnSilencio() {
  if (ES_DEV || actualizando) return;
  autoUpdater.checkForUpdates().catch((err) => console.error('[actualizaciones]', err));
}

function crearSplash() {
  splashWindow = new BrowserWindow({
    width: 320,
    height: 380,
    frame: false,
    resizable: false,
    movable: true,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#1e1b2e',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload-splash.js')
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow.show());
  splashWindow.on('closed', () => { splashWindow = null; });
  return new Promise((resolve) => splashWindow.webContents.once('did-finish-load', resolve));
}

// Si no hubo nada que instalar (o falló), se muestra el mensaje un
// momento en el splash y se regresa a la app tal como estaba.
function terminarActualizacion(mensaje) {
  enviarAlSplash({ fase: 'mensaje', texto: mensaje });
  setTimeout(() => {
    actualizando = false;
    if (splashWindow) splashWindow.close();
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  }, 2500);
}

ipcMain.handle('actualizacion:estado', () => ({ version: versionDisponible }));
ipcMain.handle('actualizacion:version-actual', () => app.getVersion());

ipcMain.handle('actualizacion:instalar', async () => {
  if (actualizando) return;
  actualizando = true;
  await crearSplash();
  if (mainWindow) mainWindow.hide();
  enviarAlSplash({ fase: 'buscando' });
  try {
    // Se vuelve a buscar en este momento: pudo haber salido otra versión
    // más nueva desde que se abrió la app.
    const resultado = await autoUpdater.checkForUpdates();
    if (!resultado || !resultado.isUpdateAvailable) {
      versionDisponible = null;
      terminarActualizacion('Ya tienes la versión más reciente.');
      return;
    }
    enviarAlSplash({ fase: 'descargando', porcentaje: 0, version: resultado.updateInfo.version });
    await autoUpdater.downloadUpdate();
  } catch (err) {
    console.error('[actualizaciones]', err);
    terminarActualizacion('No se pudo actualizar. Revisa tu conexión a internet e inténtalo más tarde.');
  }
});

app.whenReady().then(() => {
  if (!ES_DEV) registrarProtocoloApp();
  crearVentanaPrincipal();
  // Se busca al abrir y luego cada 4 horas, por si la app se queda
  // abierta todo el día.
  mainWindow.webContents.once('did-finish-load', buscarEnSilencio);
  setInterval(buscarEnSilencio, 4 * 60 * 60 * 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) crearVentanaPrincipal();
});
