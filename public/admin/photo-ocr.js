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

export async function recognizeProductPhoto(file, onProgress = () => {}, dependencies = {}) {
  validateOcrPhoto(file);
  const engine = dependencies.engine || await loadOcrEngine();
  const worker = await engine.createWorker(['spa', 'eng'], 1, {
    logger: info => {
      const progress = Number(info?.progress);
      if (Number.isFinite(progress)) onProgress(info.status || 'Leyendo imagen', Math.min(100, Math.max(0, Math.round(progress * 100))));
    },
  });
  try {
    const output = await worker.recognize(file);
    return { text: String(output?.data?.text || '').slice(0, 30000), confidence: Number(output?.data?.confidence) || 0 };
  } finally {
    await worker.terminate();
  }
}
