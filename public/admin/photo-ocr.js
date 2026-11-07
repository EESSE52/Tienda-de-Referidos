/** OCR en navegador: nunca envía la fotografía al servidor de D'MonkeySport. 
 * Motor y modelos de idioma descargados de CDN al iniciar.
 */
const CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let loader = null;

export function validateOcrPhoto(file) {
  if (!file) throw new Error('Selecciona una fotografía del producto.');
  const types = new Set(['image/jpeg','image/png','image/webp']);
  if (!types.has(file.type)) throw new Error('Utiliza una imagen JPG, PNG o WEBP.');
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > 10 * 1024 * 1024) {
    throw new Error('La fotografía debe pesar como máximo 10 MB.');
  }
  return true;
}

export async function loadOcrEngine(doc = document) {
  if (typeof globalThis.Tesseract?.createWorker === 'function') return globalThis.Tesseract;
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = doc.createElement('script');
      script.src = CDN;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (typeof globalThis.Tesseract?.createWorker === 'function') resolve(globalThis.Tesseract);
        else reject(new Error('No se pudo iniciar el motor OCR.'));
      };
      script.onerror = () => reject(new Error('No fue posible cargar el motor OCR. Comprueba la conexión a Internet y permite cdn.jsdelivr.net.'));
      doc.head.appendChild(script);
    }).catch(error => {
      loader = null;
      throw error;
    });
  }
  return loader;
}

/** Mejora opcional de contraste, escala y rotación (Canvas local del navegador). */
export async function prepareOcrImage(file, options = {}, dependencies = {}) {
  const rotation = Number(options.rotation || 0);
  const enhancement = options.enhance !== false;
  if (!enhancement && !rotation) return file;
  const createBitmap = dependencies.createImageBitmap || globalThis.createImageBitmap;
  const makeCanvas = dependencies.createCanvas || (() => document.createElement('canvas'));
  if (typeof createBitmap !== 'function') return file;
  const bitmap = await createBitmap(file, { imageOrientation: 'from-image' });
  try {
    const baseScale = enhancement ? 2 : 1;
    const scale = Math.min(baseScale, 2800 / Math.max(bitmap.width, bitmap.height));
    const sourceWidth = Math.max(1, Math.round(bitmap.width * scale));
    const sourceHeight = Math.max(1, Math.round(bitmap.height * scale));
    const sideways = Math.abs(rotation % 180) === 90;
    const canvas = makeCanvas();
    canvas.width = sideways ? sourceHeight : sourceWidth;
    canvas.height = sideways ? sourceWidth : sourceHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
    if (enhancement) {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const values = new Uint8Array(256);
      const histogram = new Uint32Array(256);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const gray = Math.round(.299 * pixels.data[i] + .587 * pixels.data[i + 1] + .114 * pixels.data[i + 2]);
        histogram[gray]++;
      }
      const total = canvas.width * canvas.height;
      let low = 0, high = 255, sum = 0;
      for (; low < 255; low++) { sum += histogram[low]; if (sum >= total * .01) break; }
      sum = 0;
      for (; high > low; high--) { sum += histogram[high]; if (sum >= total * .01) break; }
      const range = Math.max(25, high - low);
      for (let n = 0; n < 256; n++) values[n] = Math.max(0, Math.min(255, Math.round((n - low) * 255 / range)));
      for (let i = 0; i < pixels.data.length; i += 4) {
        const gray = Math.round(.299 * pixels.data[i] + .587 * pixels.data[i + 1] + .114 * pixels.data[i + 2]);
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = values[gray];
      }
      ctx.putImageData(pixels, 0, 0);
    }
    return canvas;
  } finally {
    bitmap.close?.();
  }
}

export async function recognizeProductPhoto(file, onProgress = () => {}, dependencies = {}, options = {}) {
  validateOcrPhoto(file);
  const engine = dependencies.engine || await loadOcrEngine();
  const worker = await engine.createWorker(['spa', 'eng'], 1, {
    logger: info => {
      const progress = Number(info?.progress);
      if (Number.isFinite(progress)) onProgress(info.status || 'Leyendo imagen', Math.min(100, Math.max(0, Math.round(progress * 100))));
    },
  });
  try {
    const enhanced = await prepareOcrImage(file, options, dependencies);
    const first = await worker.recognize(enhanced);
    const text = String(first?.data?.text || '');
    let chosen = first;
    let method = enhanced === file ? 'original' : 'contraste';
    const confidence = Number(first?.data?.confidence) || 0;
    // Segunda lectura solo para imágenes de baja confianza: evita duplicar tiempo siempre.
    if (enhanced !== file && confidence < 65 && options.retry !== false) {
      onProgress('Revisando lectura con imagen original', 0);
      const original = await worker.recognize(file);
      if ((Number(original?.data?.confidence) || 0) > confidence && String(original?.data?.text || '').trim()) {
        chosen = original;
        method = 'original';
      }
    }
    return { text: String(chosen?.data?.text || '').slice(0, 30000), confidence: Number(chosen?.data?.confidence) || 0, method };
  } finally {
    await worker.terminate();
  }
}
