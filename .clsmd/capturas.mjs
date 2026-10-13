// Capturas del README con marco de ventana (estilo Safari/macOS sobre fondo
// degradado) y datos personales difuminados.
//
// Uso (con `npm run dev -- --port 5181` corriendo):
//   CLSMD_USER=... CLSMD_PASS=... node .clsmd/capturas.mjs
//
// Playwright se toma de la skill clsmd para no agregarlo al proyecto; se
// puede cambiar con CLSMD_PLAYWRIGHT=<ruta a node_modules/playwright>.
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CLSMD_PLAYWRIGHT
  || path.join(homedir(), '.claude/skills/clsmd/scripts/node_modules/playwright'));

const BASE = process.env.CLSMD_URL || 'http://localhost:5181';
const SALIDA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs/screenshots');
const CRUDAS = path.join(tmpdir(), 'clsmd-crudas');
const VIEWPORT = { width: 1440, height: 900 };
const ESCALA = 1.5;
const TITULO = 'Gestión Extracción y Fletes';

const PANTALLAS = [
  { nombre: 'inicio', ruta: '/inicio' },
  { nombre: 'extraccion', ruta: '/extraccion' },
  { nombre: 'extraccion-nueva', ruta: '/extraccion/nuevo' },
  { nombre: 'fletes', ruta: '/fletes' },
  { nombre: 'flete-nuevo', ruta: '/fletes/nuevo' },
  { nombre: 'formatos', ruta: '/formatos' },
  { nombre: 'ajustes', ruta: '/ajustes' }
];

// Corre dentro de la página: difumina correo, montos, nombres de los
// catálogos (productores y fleteros) y las iniciales de los avatares.
async function difuminar() {
  const { Api } = await import('/src/lib/api.js');
  const s = await Api.obtenerSettings();
  const lista = (k) => { try { return JSON.parse(s[k] || '[]'); } catch { return []; } };
  const nombres = [
    ...lista('gruas_json').map((g) => g.productor),
    ...lista('fleteros_json').map((f) => f.nombre)
  ].filter((n) => n && n.length > 3).map((n) => n.toUpperCase());
  const prefijos = nombres.map((n) => n.split(/\s+/).slice(0, 2).join(' ')).filter((p) => p.length >= 6);

  const sensible = (t) => {
    t = (t || '').trim();
    if (!t) return false;
    if (/@/.test(t)) return true;
    if (/\$\s?[\d,]+\.\d\d/.test(t)) return true;
    if (/^[A-ZÑ]{2}$/.test(t)) return true;
    const u = t.toUpperCase();
    return prefijos.some((p) => u.startsWith(p) || u.includes(' ' + p));
  };

  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('[data-clsmd-blur]')) continue;
    const hojas = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hojas && sensible(el.textContent)) {
      el.style.filter = 'blur(6px)';
      el.setAttribute('data-clsmd-blur', '');
    }
  }
  for (const input of document.querySelectorAll('input, select')) {
    const v = input.tagName === 'SELECT' ? input.selectedOptions[0]?.textContent : input.value;
    if (sensible(v)) input.style.filter = 'blur(6px)';
  }
}

function marco(png) {
  const img = `data:image/png;base64,${readFileSync(png).toString('base64')}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{background:#1d1446}
  .lienzo{width:${VIEWPORT.width + 128}px;padding:56px 64px 72px;font-family:-apple-system,"Segoe UI",system-ui,sans-serif;
    background:
      radial-gradient(1200px 700px at 0% 0%, #5b3fd6 0%, transparent 60%),
      radial-gradient(1000px 800px at 100% 100%, #c13fae 0%, transparent 55%),
      radial-gradient(900px 600px at 100% 0%, #2e4fd8 0%, transparent 60%),
      linear-gradient(135deg,#1d1446 0%,#2b1a6b 50%,#3a1460 100%)}
  .ventana{border-radius:12px;overflow:hidden;background:#1e1e20;
    box-shadow:0 0 0 1px rgba(255,255,255,.12),0 30px 80px rgba(8,4,30,.55),0 8px 24px rgba(8,4,30,.35)}
  .barra{height:52px;display:flex;align-items:center;gap:14px;padding:0 18px;background:#2a2a2d;border-bottom:1px solid #3a3a3d;position:relative}
  .luces{display:flex;gap:8px}.luces i{width:12px;height:12px;border-radius:50%;display:block}
  .r{background:#ff5f57}.a{background:#febc2e}.v{background:#28c840}
  .ico{width:18px;height:14px;border:1.6px solid #9a9aa0;border-radius:3px;margin-left:10px;position:relative}
  .ico:after{content:"";position:absolute;left:5px;top:0;bottom:0;border-left:1.6px solid #9a9aa0}
  .flecha{color:#9a9aa0;font-size:20px;margin-left:6px}
  .url{position:absolute;left:50%;transform:translateX(-50%);width:420px;height:30px;border-radius:8px;background:#3b3b3f;
    color:#e6e6ea;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px}
  .url img{width:16px;height:16px;border-radius:4px}
  .der{margin-left:auto;display:flex;gap:18px;color:#9a9aa0;font-size:18px}
  .contenido img{display:block;width:${VIEWPORT.width}px;height:${VIEWPORT.height}px}
  </style></head><body><div class="lienzo"><div class="ventana">
    <div class="barra"><div class="luces"><i class="r"></i><i class="a"></i><i class="v"></i></div>
      <span class="ico"></span><span class="flecha">‹</span>
      <div class="url"><img src="${BASE}/images/logo-tezains.png">${TITULO}</div>
      <div class="der"><span>⇪</span><span>+</span></div></div>
    <div class="contenido"><img src="${img}"></div>
  </div></div></body></html>`;
}

mkdirSync(SALIDA, { recursive: true });
mkdirSync(CRUDAS, { recursive: true });
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: ESCALA, locale: 'es-MX' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', process.env.CLSMD_USER || '');
  await page.fill('input[type=password]', process.env.CLSMD_PASS || '');
  await page.click('button[type=submit]');
  await page.waitForURL('**/inicio', { timeout: 30000 });

  for (const p of PANTALLAS) {
    await page.goto(BASE + p.ruta, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1', { state: 'visible', timeout: 20000 });
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
    await page.waitForTimeout(1500);
    await page.mouse.move(0, VIEWPORT.height - 1);
    await page.evaluate(difuminar);
    const cruda = path.join(CRUDAS, `${p.nombre}.png`);
    await page.screenshot({ path: cruda });

    const lienzo = await browser.newPage({ deviceScaleFactor: ESCALA, viewport: { width: VIEWPORT.width + 128, height: VIEWPORT.height + 200 } });
    await lienzo.setContent(marco(cruda), { waitUntil: 'load' });
    await lienzo.locator('.lienzo').screenshot({ path: path.join(SALIDA, `${p.nombre}.png`) });
    await lienzo.close();
    console.log('ok', p.nombre);
  }
} finally {
  await browser.close();
  rmSync(CRUDAS, { recursive: true, force: true });
}
