// Las imágenes se guardan dentro del documento (data URL) para que el
// formato funcione igual sin internet y en cualquier computadora. Como
// viajan dentro del diseño, se optimizan al subirlas:
// - se reducen a máx. 1600 px por lado (sobra para imprimir en carta);
// - se prueba WebP y, si la imagen no tiene transparencia, también JPEG,
//   y se queda la versión más ligera;
// - se calcula una huella (hash) para no guardar dos veces la misma imagen.
const MAX_LADO = 1600;
const CALIDAD_FOTO = 0.82;
const CALIDAD_CON_ALFA = 0.9;

export function leerImagen(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo || !/^image\//.test(archivo.type)) {
      reject(new Error('El archivo no es una imagen'));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
    lector.onload = () => {
      const original = String(lector.result);
      // SVG: se deja tal cual (es vectorial y ya pesa poco).
      if (archivo.type === 'image/svg+xml') {
        medir(original)
          .then(async ({ w, h }) => resolve({ dataUrl: original, w, h, nombre: archivo.name, hash: await huella(original) }), reject);
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado'));
      img.onload = async () => {
        const escala = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * escala));
        const h = Math.max(1, Math.round(img.naturalHeight * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const alfa = tieneTransparencia(ctx, w, h);
        const candidatos = [];
        const webp = canvas.toDataURL('image/webp', alfa ? CALIDAD_CON_ALFA : CALIDAD_FOTO);
        if (webp.startsWith('data:image/webp')) candidatos.push(webp);
        if (alfa) candidatos.push(canvas.toDataURL('image/png'));
        else candidatos.push(canvas.toDataURL('image/jpeg', CALIDAD_FOTO));
        // Si la original ya era más ligera y no hubo que reducirla, se respeta.
        if (escala === 1) candidatos.push(original);
        const dataUrl = candidatos.reduce((a, b) => (b.length < a.length ? b : a));
        resolve({ dataUrl, w, h, nombre: archivo.name, hash: await huella(dataUrl) });
      };
      img.src = original;
    };
    lector.readAsDataURL(archivo);
  });
}

// ¿Algún píxel semitransparente? Se revisa una muestra para no recorrer
// imágenes grandes completas.
function tieneTransparencia(ctx, w, h) {
  try {
    const datos = ctx.getImageData(0, 0, w, h).data;
    const paso = Math.max(1, Math.floor((w * h) / 40000)) * 4;
    for (let i = 3; i < datos.length; i += paso) if (datos[i] < 250) return true;
    return false;
  } catch {
    return true;
  }
}

export async function huella(texto) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(buf).slice(0, 12)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

// Tamaño aproximado en KB de un data URL (base64 ≈ 4/3 del binario).
export function pesoKb(dataUrl) {
  return Math.round(((dataUrl || '').length * 0.75) / 1024);
}

function medir(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 200, h: img.naturalHeight || 200 });
    img.onerror = () => resolve({ w: 200, h: 200 });
    img.src = src;
  });
}
