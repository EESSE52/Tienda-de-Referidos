// Conversión local y determinista. No consulta Drive ni concede permisos de acceso.
// Solo transforma URLs oficiales con un ID de archivo de Google Drive verificable.
const ID = /^[a-zA-Z0-9_-]{20,100}$/;
const MAX = 2048;
export function normalizeGoogleDriveImageUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.length > MAX) throw new Error('La URL de imagen supera el límite permitido.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Introduce una URL HTTPS válida.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port)
    throw new Error('La imagen debe tener una URL HTTPS sin credenciales.');
  const host = url.hostname.toLowerCase();
  let fileId = '';
  if (host === 'drive.google.com') {
    const match = url.pathname.match(/^\/file\/d\/([^/]+)\/(?:view|edit|preview)?\/?$/);
    if (match) fileId = match[1];
    else if (url.pathname === '/open' || url.pathname === '/uc')
      fileId = url.searchParams.get('id') || '';
    else throw new Error('Enlace de Google Drive no reconocido. Copia el enlace para compartir el archivo.');
  } else if (host === 'lh3.googleusercontent.com') {
    const match = url.pathname.match(/^\/d\/([a-zA-Z0-9_-]+)(?:=w\d+)?$/);
    if (!match) throw new Error('Enlace de imagen de Google no reconocido.');
    fileId = match[1];
  } else if (host === 'drive.usercontent.google.com') {
    if (url.pathname !== '/download') throw new Error('Enlace de Drive no reconocido.');
    fileId = url.searchParams.get('id') || '';
  } else {
    return raw; // Se mantienen otras imágenes HTTPS autorizadas.
  }
  if (!ID.test(fileId)) throw new Error('El enlace de Google Drive no contiene un identificador de archivo válido.');
  return 'https://lh3.googleusercontent.com/d/' + fileId + '=w1200';
}

export function isGoogleDriveImageLink(value) {
  try {
    const host = new URL(String(value)).hostname.toLowerCase();
    return ['drive.google.com', 'lh3.googleusercontent.com', 'drive.usercontent.google.com'].includes(host);
  } catch { return false; }
}
