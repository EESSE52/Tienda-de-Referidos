import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateProductPayload } from '../src/lib/admin-validacion.js';
import { addPriceHistoryEntry, buildPublicationSnapshot } from '../src/lib/admin-publicacion.js';
import { extractAffiliateProductData } from '../src/lib/link-extractor.js';

const HOST = '127.0.0.1';
const PORT = 4322;
const LISTAS_FILE = fileURLToPath(new URL('../data/listas.json', import.meta.url));
const PRODUCTS_FILE = fileURLToPath(new URL('../data/productos.json', import.meta.url));
const BACKUPS_DIR = fileURLToPath(new URL('../data/backups', import.meta.url));

const sessions = new Map();

function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'lista';
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (!key) continue;
    cookies[key] = decodeURIComponent(rest.join('='));
  }
  return cookies;
}

function setCookie(res, name, value) {
  res.setHeader(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
  );
}

function ensureSession(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = parseCookies(cookieHeader);
  let sessionId = cookies.admin_session;

  if (!sessionId) {
    sessionId = randomUUID();
  }

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      csrfToken: randomUUID(),
    });
  }

  const session = sessions.get(sessionId);
  setCookie(res, 'admin_session', sessionId);
  return session;
}

async function readJsonFile(filePath, fallback = []) {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, value, label = 'data') {
  await mkdir(BACKUPS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `${BACKUPS_DIR}/${label}-${timestamp}.json`;
  await writeFile(backupFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return backupFile;
}

async function readLists() {
  return readJsonFile(LISTAS_FILE, []);
}

async function writeLists(listas) {
  return writeJsonFile(LISTAS_FILE, listas, 'listas');
}

async function readProducts() {
  return readJsonFile(PRODUCTS_FILE, []);
}

async function writeProducts(productos) {
  return writeJsonFile(PRODUCTS_FILE, productos, 'productos');
}

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function htmlResponse(res, content) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(content);
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('JSON inválido');
  }
}

function normalisePayload(payload) {
  const nombre = String(payload.nombre || '').trim();
  const slug = String(payload.slug || slugify(nombre)).trim();
  const descripcion = String(payload.descripcion || '').trim();
  const unidadBase = String(payload.unidad_base || 'g').trim() || 'g';
  const ordenDefecto = payload.orden_defecto || { campo: 'precio_por_gramo', direccion: 'menor' };
  const campos = Array.isArray(payload.campos) ? payload.campos : [];
  const metricas = Array.isArray(payload.metricas) ? payload.metricas : [];

  return {
    id: slugify(slug || nombre || 'lista'),
    slug: slugify(slug || nombre || 'lista'),
    nombre,
    descripcion,
    unidad_base: unidadBase,
    orden_defecto: {
      campo: String(ordenDefecto.campo || 'precio_por_gramo'),
      direccion: String(ordenDefecto.direccion || 'menor'),
    },
    campos,
    metricas,
  };
}

function parseCurrencyNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value).trim();
  if (!text) return null;
  const clean = text.replace(/[$\.\s]/g, '').replace(',', '.');
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function currencyToNumber(value) {
  const parsed = parseCurrencyNumber(value);
  return parsed === null ? 0 : parsed;
}

function normaliseProductPayload(payload, existing = null) {
  const listaId = String(payload.lista_id || existing?.lista_id || '').trim();
  const nombre = String(payload.nombre || existing?.nombre || '').trim();
  const marca = String(payload.marca || existing?.marca || '').trim();
  const idPublicacion = String(payload.id_publicacion || existing?.id_publicacion || '').trim();
  const enlaceReferido = String(payload.enlace_referido || existing?.enlace_referido || payload.url_publicacion || '').trim();
  const urlPublicacion = String(payload.url_publicacion || existing?.url_publicacion || payload.enlace_referido || '').trim();
  const precio = currencyToNumber(payload.precio ?? existing?.precio ?? 0);
  const vendedor = String(payload.vendedor || existing?.vendedor || '').trim();
  const activo = payload.activo === undefined ? (existing ? existing.activo : true) : Boolean(payload.activo);
  const notas = String(payload.notas || existing?.notas || '').trim();
  const atributos = payload.atributos && typeof payload.atributos === 'object' ? payload.atributos : (existing?.atributos || {});

  const finalId = String(payload.id || existing?.id || `${slugify(nombre || 'producto')}-${Date.now()}`).trim();

  return {
    id: finalId,
    lista_id: listaId,
    nombre,
    marca,
    id_publicacion: idPublicacion || existing?.id_publicacion || '',
    enlace_referido: enlaceReferido,
    url_publicacion: urlPublicacion,
    precio,
    fecha_precio: payload.fecha_precio || existing?.fecha_precio || new Date().toISOString().slice(0, 10),
    vendedor: vendedor || marca || 'Sin vendedor',
    activo,
    imagen: String(payload.imagen || existing?.imagen || '').trim(),
    notas,
    atributos,
    historial_precios: Array.isArray(payload.historial_precios) ? payload.historial_precios : (Array.isArray(existing?.historial_precios) ? existing.historial_precios : [{ fecha: new Date().toISOString().slice(0, 10), precio }]),
    creado: existing?.creado || new Date().toISOString(),
    actualizado: new Date().toISOString(),
  };
}

async function parseLinkSuggestion(rawText) {
  const source = String(rawText || '').trim();
  if (!source) {
    return { error: 'Pega una URL o un texto con el producto.', ok: false };
  }

  const matchUrl = source.match(/https?:\/\/[^\s]+/i);
  const url = matchUrl ? matchUrl[0] : '';
  const titleFromUrl = url ? decodeURIComponent(url.split('/').filter(Boolean).slice(-1)[0] || '') : '';
  const idPublicacion = (url.match(/(ML[A-Z0-9]+)/i) || [])[1] || '';

  let extracted = {};
  if (url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TiendaReferidosBot/1.0; +https://example.com/bot)',
          'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
        },
      });

      if (response.ok) {
        const html = await response.text();
        extracted = extractAffiliateProductData(html, url);
      }
    } catch (error) {
      extracted = {};
    }
  }

  const priceMatch = source.match(/\$?\s?(\d{1,3}(?:[\.\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  const precio = priceMatch ? parseCurrencyNumber(priceMatch[1]) : null;
  const nombreBase = (source.match(/[A-Za-zÁÉÍÓÚáéíóúÑñ0-9][A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s\-]{4,80}/) || [])[0] || extracted.name || titleFromUrl || 'Producto';
  const nombre = nombreBase.replace(/\s+/g, ' ').trim();
  const marca = (source.match(/(?:marca|brand)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]+)/i) || [])[1] || extracted.brand || 'Sin marca';
  const vendedor = (source.match(/(?:vendedor|seller)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]+)/i) || [])[1] || extracted.seller || marca;

  const attrs = {};
  const gramosMatch = source.match(/(\d{1,4})(?:\s|\.|,)?(?:g|gr|gramos|grams)\b/i);
  const proteinaMatch = source.match(/(?:proteina|protein)(?:\s+(?:total|total de))?\s*(\d{1,4})(?:\s|\.|,)?(?:g|gr|gramos|grams)\b/i);
  const porcionesMatch = source.match(/(\d{1,4})\s*(?:porciones|servings|dosis|scoops|raciones)\b/i);
  const saborMatch = source.match(/(?:sabor|flavor|sabores)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]+)/i);

  if (gramosMatch) attrs.gramos_total = Number(String(gramosMatch[1]).replace(/\./g, '').replace(',', '.'));
  if (proteinaMatch) attrs.proteina_total = Number(String(proteinaMatch[1]).replace(/\./g, '').replace(',', '.'));
  if (porcionesMatch) attrs.porciones = Number(String(porcionesMatch[1]).replace(/\./g, '').replace(',', '.'));
  if (saborMatch) attrs.sabor = saborMatch[1].trim();

  if (!Object.keys(attrs).length && extracted && typeof extracted === 'object') {
    if (extracted.gramos_total) attrs.gramos_total = extracted.gramos_total;
    if (extracted.proteina_total) attrs.proteina_total = extracted.proteina_total;
    if (extracted.porciones) attrs.porciones = extracted.porciones;
    if (extracted.sabor) attrs.sabor = extracted.sabor;
  }

  return {
    ok: true,
    id_publicacion: idPublicacion,
    nombre: nombre.replace(/\b(?:ml|mercado libre|mercadolibre)\b/gi, '').trim() || 'Producto',
    marca: marca.trim(),
    vendedor: vendedor.trim(),
    precio: Number(extracted.price ?? precio ?? 0),
    enlace_referido: url || '',
    url_publicacion: url || '',
    imagen: extracted.image || '',
    notas: source.slice(0, 240),
    atributos: attrs,
  };
}

const adminPage = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Administrador local</title>
    <style>
      :root {
        --bg: #071521;
        --panel: #0f1d2b;
        --panel-alt: #122535;
        --border: rgba(148, 163, 184, 0.2);
        --text: #e5eef7;
        --muted: #8ea3b7;
        --primary: #38bdf8;
        --danger: #ef4444;
        --success: #22c55e;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      .wrap {
        max-width: 1200px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      h1 { margin: 0 0 8px; }
      .sub {
        color: var(--muted);
        margin-bottom: 24px;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 16px;
        margin: 0 0 24px;
      }
      .stat-card {
        background: rgba(56, 189, 248, 0.08);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px 18px;
      }
      .stat-label {
        display: block;
        color: var(--muted);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .stat-value {
        display: block;
        margin-top: 8px;
        font-size: clamp(1.3rem, 2vw, 2rem);
        font-weight: 700;
      }
      .grid {
        display: grid;
        grid-template-columns: 1.1fr 1.6fr;
        gap: 24px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 18px;
      }
      .panel h2 {
        margin: 0 0 16px;
        font-size: 1.1rem;
      }
      .field, label {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 14px;
      }
      label span {
        font-size: 0.9rem;
        color: var(--muted);
      }
      input, textarea, select, button {
        border-radius: 8px;
        border: 1px solid var(--border);
        background: var(--panel-alt);
        color: var(--text);
        padding: 10px 12px;
        font-size: 1rem;
      }
      textarea { min-height: 110px; resize: vertical; }
      .actions {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }
      button {
        cursor: pointer;
        font-weight: 600;
      }
      .btn-primary { background: var(--primary); color: #04141e; border-color: var(--primary); }
      .btn-danger { background: var(--danger); border-color: var(--danger); }
      .btn-secondary { background: transparent; }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border-bottom: 1px solid var(--border);
        padding: 12px 10px;
        text-align: left;
        vertical-align: top;
      }
      th { color: var(--muted); font-weight: 600; }
      .pill {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(56, 189, 248, 0.15);
        color: var(--primary);
        font-size: 0.75rem;
      }
      .muted { color: var(--muted); }
      .status {
        min-height: 24px;
        margin-top: 12px;
        font-size: 0.92rem;
      }
      .status.error { color: #fca5a5; }
      .status.success { color: #86efac; }
      .summary-box {
        background: rgba(56, 189, 248, 0.08);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        margin-top: 16px;
      }
      .summary-box strong { display: block; margin-bottom: 8px; }
      .history-list {
        list-style: none;
        padding: 0;
        margin: 6px 0 0;
      }
      .history-list li {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid var(--border);
        padding: 8px 0;
      }
      @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Administrador local</h1>
      <div class="sub">Crear, editar y borrar listas sin afectar el sitio público ni la compilación del proyecto.</div>

      <div class="stats" id="admin-stats">
        <div class="stat-card">
          <span class="stat-label">Listas</span>
          <span class="stat-value" id="stat-listas">0</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Referidos</span>
          <span class="stat-value" id="stat-productos">0</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Backups</span>
          <span class="stat-value" id="stat-backups">0</span>
        </div>
      </div>

      <div class="grid">
        <section class="panel">
          <h2 id="form-title">Nueva lista</h2>
          <form id="lista-form">
            <input type="hidden" id="lista-id" name="id" />
            <input type="hidden" id="csrf-token" name="_csrf" />

            <label>
              <span>Nombre</span>
              <input name="nombre" placeholder="Proteína" required />
            </label>

            <label>
              <span>Slug</span>
              <input name="slug" placeholder="proteina" required />
            </label>

            <label>
              <span>Descripción</span>
              <textarea name="descripcion" placeholder="Comparador de ..."></textarea>
            </label>

            <label>
              <span>Unidad base</span>
              <input name="unidad_base" value="g" />
            </label>

            <label>
              <span>Campos JSON</span>
              <textarea name="campos" placeholder='[{"clave":"gramos_total","etiqueta":"Cantidad total","tipo":"numero","unidad":"g","mejor":"mayor","en_tabla":true,"filtrable":true,"requerido":true}]'></textarea>
            </label>

            <label>
              <span>Métricas JSON</span>
              <textarea name="metricas" placeholder='[{"clave":"precio_por_gramo","etiqueta":"Precio por gramo","formula":{"tipo":"precio_dividido_por","campo":"gramos_total"},"mejor":"menor","decimales":2}]'></textarea>
            </label>

            <div class="actions">
              <button class="btn-primary" type="submit">Guardar</button>
              <button id="reset-form" class="btn-secondary" type="button">Cancelar</button>
            </div>
            <div id="status" class="status" aria-live="polite"></div>
          </form>
        </section>

        <section class="panel">
          <h2>Listas actuales</h2>
          <div style="display:flex; gap:12px; margin-bottom:12px;">
            <input id="lista-search" type="search" placeholder="Buscar lista" style="flex:1;" />
          </div>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Slug</th>
                <th>Campos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="lista-table-body"></tbody>
          </table>
        </section>
      </div>

      <div class="grid" style="margin-top: 28px;">
        <section class="panel">
          <h2>Vista previa de publicación</h2>
          <div id="publication-summary" class="summary-box">
            <strong>Cargando snapshot...</strong>
            <div class="muted">Se preparará un resumen antes de publicar.</div>
          </div>
          <div style="margin-top: 12px;">
            <button id="refresh-preview-button" class="btn-secondary" type="button">Actualizar vista previa</button>
          </div>
        </section>

        <section class="panel">
          <h2 id="producto-form-title">Nuevo referid</h2>
          <form id="producto-form">
            <input type="hidden" id="producto-id" name="id" />
            <input type="hidden" id="producto-csrf" name="_csrf" />

            <label>
              <span>Lista</span>
              <select id="producto-lista-id" name="lista_id" required></select>
            </label>

            <label>
              <span>Nombre</span>
              <input name="nombre" placeholder="Proteína Whey 900 g" required />
            </label>

            <label>
              <span>Marca</span>
              <input name="marca" placeholder="BioForce" />
            </label>

            <label>
              <span>Precio</span>
              <input name="precio" placeholder="32990" />
            </label>

            <label>
              <span>Enlace / URL</span>
              <input name="enlace_referido" placeholder="https://..." />
            </label>

            <label>
              <span>ID publicación</span>
              <input name="id_publicacion" placeholder="MLC123456" />
            </label>

            <label>
              <span>Vendedor</span>
              <input name="vendedor" placeholder="BioForce" />
            </label>

            <label>
              <span>Texto extra / enlace pegado</span>
              <textarea id="producto-source" placeholder="Pega aquí el enlace o el texto del producto para sugerir datos."></textarea>
            </label>

            <label>
              <span>Atributos JSON</span>
              <textarea name="atributos" placeholder='{"gramos_total":900,"proteina_total":720,"porciones":30,"tipo":"Whey"}'></textarea>
            </label>

            <label>
              <span>Imagen</span>
              <input id="producto-imagen" name="imagen" placeholder="https://.../imagen.jpg" />
            </label>

            <label>
              <span>Notas</span>
              <textarea name="notas" placeholder="Observaciones del producto..."></textarea>
            </label>

            <div class="actions">
              <button class="btn-primary" type="submit">Guardar referid</button>
              <button id="fill-demo-product-button" class="btn-secondary" type="button">Rellenar ejemplo</button>
              <button id="parse-product-button" class="btn-secondary" type="button">Leer enlace</button>
              <button id="reset-product-form" class="btn-secondary" type="button">Cancelar</button>
            </div>
            <div id="producto-status" class="status" aria-live="polite"></div>
          </form>
        </section>

        <section class="panel">
          <h2>Referidos actuales</h2>
          <div style="display:flex; gap:12px; margin-bottom:12px;">
            <select id="producto-filter" style="min-width: 180px;"></select>
            <input id="producto-search" type="search" placeholder="Buscar referid" style="flex:1;" />
          </div>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Lista</th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="producto-table-body"></tbody>
          </table>
        </section>
      </div>

      <div class="grid" style="margin-top: 28px;">
        <section class="panel">
          <h2>Copias de seguridad</h2>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
            <div class="muted">Estado local del proyecto</div>
            <button id="backup-create-button" type="button" class="btn-secondary">Crear copia</button>
          </div>
          <div id="backup-list" class="muted">Cargando copias de seguridad...</div>
        </section>
      </div>
    </div>

    <script>
      const form = document.getElementById('lista-form');
      const tbody = document.getElementById('lista-table-body');
      const statusBox = document.getElementById('status');
      const csrfInput = document.getElementById('csrf-token');
      const formTitle = document.getElementById('form-title');
      const resetButton = document.getElementById('reset-form');

      const productForm = document.getElementById('producto-form');
      const productTableBody = document.getElementById('producto-table-body');
      const productStatusBox = document.getElementById('producto-status');
      const productCsrfInput = document.getElementById('producto-csrf');
      const productFormTitle = document.getElementById('producto-form-title');
      const productListSelect = document.getElementById('producto-lista-id');
      const productParseButton = document.getElementById('parse-product-button');
      const productResetButton = document.getElementById('reset-product-form');
      const fillDemoProductButton = document.getElementById('fill-demo-product-button');
      const publicationSummary = document.getElementById('publication-summary');
      const refreshPreviewButton = document.getElementById('refresh-preview-button');
      const backupList = document.getElementById('backup-list');
      const backupCreateButton = document.getElementById('backup-create-button');
      const listaSearchInput = document.getElementById('lista-search');
      const productoFilterSelect = document.getElementById('producto-filter');
      const productoSearchInput = document.getElementById('producto-search');

      function setStatus(message, isError = false) {
        statusBox.textContent = message || '';
        statusBox.className = 'status' + (isError ? ' error' : ' success');
      }

      function setProductStatus(message, isError = false) {
        productStatusBox.textContent = message || '';
        productStatusBox.className = 'status' + (isError ? ' error' : ' success');
      }

      function resetForm() {
        form.reset();
        document.getElementById('lista-id').value = '';
        formTitle.textContent = 'Nueva lista';
      }

      async function ensureSession() {
        const response = await fetch('/admin/session', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('No se pudo inicializar la sesión del administrador.');
        }
        const data = await response.json();
        csrfInput.value = data.csrfToken;
        productCsrfInput.value = data.csrfToken;
      }

      function parseJsonField(value, fieldName) {
        const text = (value || '').trim();
        if (!text) return [];
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          throw new Error(fieldName + ' debe ser un array JSON.');
        }
        return parsed;
      }

      function parseJsonObjectField(value, fieldName) {
        const text = (value || '').trim();
        if (!text) return {};
        const parsed = JSON.parse(text);
        if (parsed !== null && typeof parsed !== 'object') {
          throw new Error(fieldName + ' debe ser un objeto JSON.');
        }
        return parsed || {};
      }

      function updateStats({ listas = [], productos = [], backups = [] } = {}) {
        document.getElementById('stat-listas').textContent = String(listas.length || 0);
        document.getElementById('stat-productos').textContent = String(productos.length || 0);
        document.getElementById('stat-backups').textContent = String(backups.length || 0);
      }

      function getListaNameById(listaId, listas = []) {
        if (!listaId) return 'Sin lista';
        const match = listas.find((lista) => lista.id === listaId || lista.slug === listaId);
        return match ? (match.nombre || match.slug || 'Lista') : listaId;
      }

      function formatMoney(value) {
        const amount = Number(value || 0);
        return '$' + (Number.isFinite(amount) ? amount.toLocaleString('es-CL') : '0');
      }

      function getFilteredLists(allLists) {
        const query = (listaSearchInput.value || '').trim().toLowerCase();
        return allLists.filter((lista) => {
          if (!query) return true;
          const hayStack = [lista.nombre, lista.slug, lista.descripcion].join(' ').toLowerCase();
          return hayStack.includes(query);
        });
      }

      function getFilteredProducts(allProducts, allLists) {
        const selectedList = productoFilterSelect.value;
        const query = (productoSearchInput.value || '').trim().toLowerCase();
        return allProducts.filter((producto) => {
          const matchesList = !selectedList || producto.lista_id === selectedList;
          const productText = [producto.nombre, producto.marca, getListaNameById(producto.lista_id, allLists)].join(' ').toLowerCase();
          const matchesQuery = !query || productText.includes(query);
          return matchesList && matchesQuery;
        });
      }

      function renderRows(listas) {
        const filtered = getFilteredLists(listas);
        if (!filtered.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="muted">No hay listas que coincidan con la búsqueda.</td></tr>';
          return;
        }

        tbody.innerHTML = filtered.map(function (lista) {
          const campos = Array.isArray(lista.campos) ? lista.campos.length : 0;
          const metricas = Array.isArray(lista.metricas) ? lista.metricas.length : 0;
          return '<tr>' +
            '<td><strong>' + (lista.nombre || '').replace(/</g, '&lt;') + '</strong><div class="muted">' + (lista.descripcion || 'Sin descripción').replace(/</g, '&lt;') + '</div></td>' +
            '<td><span class="pill">' + (lista.slug || '').replace(/</g, '&lt;') + '</span></td>' +
            '<td>' + campos + ' campos / ' + metricas + ' métricas</td>' +
            '<td>' +
              '<button type="button" data-action="edit" data-id="' + lista.id + '">Editar</button>' +
              '<button type="button" data-action="delete" data-id="' + lista.id + '" class="btn-danger">Borrar</button>' +
            '</td>' +
          '</tr>';
        }).join('');
      }

      function renderProductRows(productos, listas = []) {
        const filtered = getFilteredProducts(productos, listas);
        if (!filtered.length) {
          productTableBody.innerHTML = '<tr><td colspan="4" class="muted">No hay referidos que coincidan con el filtro.</td></tr>';
          return;
        }

        productTableBody.innerHTML = filtered.map(function (producto) {
          const listaNombre = getListaNameById(producto.lista_id, listas);
          return '<tr>' +
            '<td><strong>' + (producto.nombre || '').replace(/</g, '&lt;') + '</strong><div class="muted">' + (producto.marca || 'Sin marca').replace(/</g, '&lt;') + '</div></td>' +
            '<td>' + listaNombre + '</td>' +
            '<td>' + formatMoney(producto.precio) + '</td>' +
            '<td>' +
              '<button type="button" data-product-action="edit" data-product-id="' + producto.id + '">Editar</button>' +
              '<button type="button" data-product-action="delete" data-product-id="' + producto.id + '" class="btn-danger">Borrar</button>' +
              '<button type="button" data-product-action="publish" data-product-id="' + producto.id + '">Publicar</button>' +
            '</td>' +
          '</tr>';
        }).join('');
      }

      async function loadPreview() {
        const response = await fetch('/admin/api/publicacion/preview', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          publicationSummary.innerHTML = '<strong>Sin preview disponible.</strong><div class="muted">' + (data.error || 'Error') + '</div>';
          return;
        }

        const listItems = (data.listaIds || []).map(function (listaId) {
          return '<li><span>' + listaId + '</span><span>lista</span></li>';
        }).join('');

        const productChanges = (data.items || []).map(function (item) {
          const delta = Number(item.cambio || 0);
          const sign = delta >= 0 ? '+' : '-';
          const amount = Math.abs(delta).toLocaleString('es-CL');
          return '<li><span>' + (item.nombre || 'Sin nombre') + '</span><span>' + sign + '$' + amount + '</span></li>';
        }).join('');

        publicationSummary.innerHTML = '<strong>Snapshot ' + data.fecha + '</strong>' +
          '<div><strong>Total:</strong> ' + data.totalProductos + ' productos</div>' +
          '<div><strong>Promedio:</strong> $' + Number(data.promedioPrecio || 0).toLocaleString('es-CL') + '</div>' +
          '<div class="muted">' + (data.resumen || '') + '</div>' +
          '<ul class="history-list">' + (productChanges || '<li><span>Sin cambios</span><span>—</span></li>') + '</ul>' +
          '<ul class="history-list">' + (listItems || '<li><span>Sin listas</span><span>—</span></li>') + '</ul>';
      }

      async function loadBackups() {
        const response = await fetch('/admin/api/backups', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          backupList.innerHTML = '<div class="muted">' + (data.error || 'No se pudieron cargar las copias.') + '</div>';
          updateStats({ backups: [] });
          return;
        }

        const items = Array.isArray(data.backups) ? data.backups : [];
        updateStats({ backups: items });
        if (!items.length) {
          backupList.innerHTML = '<div class="muted">No hay copias de seguridad todavía.</div>';
          return;
        }

        backupList.innerHTML = items.map(function (item) {
          return '<div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:8px; padding:8px 10px; border:1px solid var(--border); border-radius:8px;">' +
            '<div><strong>' + item.name + '</strong><div class="muted">' + item.target + '</div></div>' +
            '<button type="button" data-backup-action="restore" data-backup-file="' + item.file + '" data-backup-target="' + item.target + '">Restaurar</button>' +
          '</div>';
        }).join('');
      }

      async function createBackup() {
        try {
          const response = await fetch('/admin/api/backups', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': productCsrfInput.value,
            },
            body: JSON.stringify({ target: 'all' }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'No se pudo crear la copia de seguridad.');
          }

          setProductStatus('Copia creada correctamente.', false);
          await loadBackups();
        } catch (error) {
          setProductStatus(error.message, true);
        }
      }

      async function loadLists() {
        const response = await fetch('/admin/api/listas', { cache: 'no-store' });
        const listas = await response.json();
        renderRows(listas);
        return listas;
      }

      async function loadProducts() {
        const response = await fetch('/admin/api/productos', { cache: 'no-store' });
        const productos = await response.json();
        const listas = await loadLists().catch(() => []);
        renderProductRows(productos, listas);
        return productos;
      }

      async function refreshOverview() {
        const [listasResponse, productosResponse, backupsResponse] = await Promise.all([
          fetch('/admin/api/listas', { cache: 'no-store' }),
          fetch('/admin/api/productos', { cache: 'no-store' }),
          fetch('/admin/api/backups', { cache: 'no-store' }),
        ]);

        const listas = await listasResponse.json();
        const productos = await productosResponse.json();
        const backupsData = await backupsResponse.json();
        const backups = Array.isArray(backupsData.backups) ? backupsData.backups : [];

        renderRows(listas);
        renderProductRows(productos, listas);
        populateProductFilter(listas);
        updateStats({ listas, productos, backups });
        return { listas, productos, backups };
      }

      function populateProductFilter(listas) {
        const options = ['<option value="">Todas las listas</option>']
          .concat(listas.map((lista) => '<option value="' + lista.id + '">' + lista.nombre + '</option>'))
          .join('');
        productoFilterSelect.innerHTML = options;
      }

      async function populateProductListSelect() {
        const listas = await loadLists();
        if (!listas.length) {
          productListSelect.innerHTML = '<option value="">No hay listas creadas</option>';
          productListSelect.disabled = true;
          populateProductFilter([]);
          return;
        }

        productListSelect.disabled = false;
        productListSelect.innerHTML = listas.map(function (lista) {
          return '<option value="' + lista.id + '">' + lista.nombre + '</option>';
        }).join('');
        populateProductFilter(listas);
      }

      listaSearchInput.addEventListener('input', async function () {
        const listas = await loadLists();
        renderRows(listas);
      });

      productoSearchInput.addEventListener('input', async function () {
        const listas = await loadLists();
        const productos = await loadProducts();
        renderRows(listas);
        renderProductRows(productos, listas);
      });

      productoFilterSelect.addEventListener('change', async function () {
        const listas = await loadLists();
        const productos = await loadProducts();
        renderRows(listas);
        renderProductRows(productos, listas);
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus('Guardando...', false);

        try {
          const payload = {
            nombre: form.elements.nombre.value,
            slug: form.elements.slug.value,
            descripcion: form.elements.descripcion.value,
            unidad_base: form.elements.unidad_base.value,
            orden_defecto: { campo: 'precio_por_gramo', direccion: 'menor' },
            campos: parseJsonField(form.elements.campos.value, 'Campos'),
            metricas: parseJsonField(form.elements.metricas.value, 'Métricas')
          };

          const id = document.getElementById('lista-id').value;
          const method = id ? 'PUT' : 'POST';
          const url = id ? '/admin/api/listas/' + encodeURIComponent(id) : '/admin/api/listas';

          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfInput.value,
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'No se pudo guardar la lista.');
          }

          setStatus('Lista guardada correctamente.', false);
          resetForm();
          await refreshOverview();
          await populateProductListSelect();
          await ensureSession();
        } catch (error) {
          setStatus(error.message, true);
        }
      });

      tbody.addEventListener('click', async (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const id = target.dataset.id;
        const action = target.dataset.action;

        if (action === 'edit') {
          const response = await fetch('/admin/api/listas/' + encodeURIComponent(id), { cache: 'no-store' });
          const lista = await response.json();

          if (!lista || !lista.id) {
            setStatus('No se pudo cargar la lista.', true);
            return;
          }

          document.getElementById('lista-id').value = lista.id;
          form.elements.nombre.value = lista.nombre || '';
          form.elements.slug.value = lista.slug || '';
          form.elements.descripcion.value = lista.descripcion || '';
          form.elements.unidad_base.value = lista.unidad_base || 'g';
          form.elements.campos.value = JSON.stringify(lista.campos || [], null, 2);
          form.elements.metricas.value = JSON.stringify(lista.metricas || [], null, 2);
          formTitle.textContent = 'Editar lista';
          setStatus('Lista cargada para edición.', false);
          return;
        }

        if (action === 'delete') {
          if (!window.confirm('¿Deseas borrar esta lista?')) return;

          const response = await fetch('/admin/api/listas/' + encodeURIComponent(id), {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': csrfInput.value },
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'No se pudo borrar la lista.');
          }

          setStatus('Lista eliminada.', false);
          resetForm();
          await refreshOverview();
          await populateProductListSelect();
        }
      });

      resetButton.addEventListener('click', () => {
        resetForm();
        setStatus('Formulario reiniciado.', false);
      });

      function resetProductForm() {
        productForm.reset();
        document.getElementById('producto-id').value = '';
        productFormTitle.textContent = 'Nuevo referid';
      }

      function fillDemoProduct() {
        const selectedListName = (productListSelect.selectedOptions[0]?.textContent || '').toLowerCase();
        const isProteinList = selectedListName.includes('proteína') || selectedListName.includes('protein');

        const demo = isProteinList ? {
          nombre: 'Proteína Whey Isolate 900 g',
          marca: 'Nutribox',
          precio: '32990',
          vendedor: 'Nutribox',
          idPublicacion: 'MLC-TEST-PROTEINA',
          url: 'https://example.com/proteina-whey-isolate-900g',
          atributos: { gramos_total: 900, proteina_total: 720, porciones: 30, tipo: 'Whey' },
          notas: 'Proteína sabor vainilla, ideal para post-entreno.',
        } : {
          nombre: 'Creatina Monohidratada 300 g',
          marca: 'PowerLab',
          precio: '24990',
          vendedor: 'PowerLab',
          idPublicacion: 'MLC-TEST-CREATINA',
          url: 'https://example.com/creatina-monohidratada-300g',
          atributos: { gramos_total: 300, porciones: 60, dosis_3g: 100, formato: 'Polvo' },
          notas: 'Creatina micronizada sin sabores, dosificación simple.',
        };

        productForm.elements.nombre.value = demo.nombre;
        productForm.elements.marca.value = demo.marca;
        productForm.elements.precio.value = demo.precio;
        productForm.elements.vendedor.value = demo.vendedor;
        productForm.elements.enlace_referido.value = demo.url;
        productForm.elements.id_publicacion.value = demo.idPublicacion;
        productForm.elements.notas.value = demo.notas;
        productForm.elements.atributos.value = JSON.stringify(demo.atributos, null, 2);
        setProductStatus('Ejemplo cargado. Ajusta nombre, precio o atributos antes de guardar.', false);
      }

      fillDemoProductButton.addEventListener('click', fillDemoProduct);

      productParseButton.addEventListener('click', async function () {
        const source = document.getElementById('producto-source').value;
        if (!source.trim()) {
          setProductStatus('Pega un enlace o un texto con el producto para sugerir datos.', true);
          return;
        }

        setProductStatus('Leyendo enlace...', false);

        try {
          const response = await fetch('/admin/api/parse-link', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': productCsrfInput.value,
            },
            body: JSON.stringify({ source: source }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'No se pudo leer el enlace.');
          }

          if (data.nombre) {
            productForm.elements.nombre.value = data.nombre;
          }
          if (data.marca) {
            productForm.elements.marca.value = data.marca;
          }
          if (data.vendedor) {
            productForm.elements.vendedor.value = data.vendedor;
          }
          if (data.precio !== undefined && data.precio !== null && Number(data.precio) > 0) {
            productForm.elements.precio.value = String(Number(data.precio));
          }
          if (data.enlace_referido) {
            productForm.elements.enlace_referido.value = data.enlace_referido;
          }
          if (data.id_publicacion) {
            productForm.elements.id_publicacion.value = data.id_publicacion;
          }
          if (data.imagen) {
            const existingImage = document.getElementById('producto-imagen');
            if (existingImage) {
              existingImage.value = data.imagen;
            }
          }
          if (data.notas) {
            productForm.elements.notas.value = data.notas;
          }
          if (data.atributos && typeof data.atributos === 'object' && Object.keys(data.atributos).length) {
            productForm.elements.atributos.value = JSON.stringify(data.atributos, null, 2);
          }

          setProductStatus('Datos sugeridos cargados correctamente.', false);
        } catch (error) {
          setProductStatus(error.message, true);
        }
      });

      productForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        setProductStatus('Guardando referid...', false);

        try {
          const payload = {
            lista_id: productForm.elements.lista_id.value,
            nombre: productForm.elements.nombre.value,
            marca: productForm.elements.marca.value,
            precio: productForm.elements.precio.value,
            enlace_referido: productForm.elements.enlace_referido.value,
            id_publicacion: productForm.elements.id_publicacion.value,
            url_publicacion: productForm.elements.enlace_referido.value,
            vendedor: productForm.elements.vendedor.value,
            activo: true,
            notas: productForm.elements.notas.value,
            imagen: productForm.elements.imagen.value,
            atributos: parseJsonObjectField(productForm.elements.atributos.value, 'Atributos')
          };

          const id = document.getElementById('producto-id').value;
          const method = id ? 'PUT' : 'POST';
          const url = id ? '/admin/api/productos/' + encodeURIComponent(id) : '/admin/api/productos';

          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': productCsrfInput.value,
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'No se pudo guardar el referid.');
          }

          setProductStatus('Referid guardado correctamente.', false);
          resetProductForm();
          await refreshOverview();
          await ensureSession();
        } catch (error) {
          setProductStatus(error.message, true);
        }
      });

      productTableBody.addEventListener('click', async function (event) {
        const target = event.target.closest('[data-product-action]');
        if (!target) return;

        const id = target.dataset.productId;
        const action = target.dataset.productAction;

        if (action === 'edit') {
          const response = await fetch('/admin/api/productos/' + encodeURIComponent(id), { cache: 'no-store' });
          const producto = await response.json();
          if (!producto || !producto.id) {
            setProductStatus('No se pudo cargar el referid.', true);
            return;
          }

          document.getElementById('producto-id').value = producto.id;
          productForm.elements.lista_id.value = producto.lista_id || productListSelect.value;
          productForm.elements.nombre.value = producto.nombre || '';
          productForm.elements.marca.value = producto.marca || '';
          productForm.elements.precio.value = producto.precio || '';
          productForm.elements.enlace_referido.value = producto.enlace_referido || '';
          productForm.elements.id_publicacion.value = producto.id_publicacion || '';
          productForm.elements.vendedor.value = producto.vendedor || '';
          productForm.elements.imagen.value = producto.imagen || '';
          productForm.elements.notas.value = producto.notas || '';
          productForm.elements.atributos.value = JSON.stringify(producto.atributos || {}, null, 2);
          productFormTitle.textContent = 'Editar referid';
          setProductStatus('Referid cargado para edición.', false);
          return;
        }

        if (action === 'delete') {
          if (!window.confirm('¿Deseas borrar este referid?')) return;

          const response = await fetch('/admin/api/productos/' + encodeURIComponent(id), {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': productCsrfInput.value },
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'No se pudo borrar el referid.');
          }

          setProductStatus('Referid eliminado.', false);
          resetProductForm();
          await refreshOverview();
          await loadPreview();
          return;
        }

        if (action === 'publish') {
          const response = await fetch('/admin/api/publicacion/guardar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': productCsrfInput.value,
            },
            body: JSON.stringify({ producto_id: id }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'No se pudo publicar el referid.');
          }
          setProductStatus('Referid publicado localmente para revisión.', false);
          await refreshOverview();
          await loadPreview();
        }
      });

      productResetButton.addEventListener('click', function () {
        resetProductForm();
        setProductStatus('Formulario reiniciado.', false);
      });

      refreshPreviewButton.addEventListener('click', async function () {
        await loadPreview();
      });

      backupCreateButton.addEventListener('click', createBackup);

      backupList.addEventListener('click', async function (event) {
        const target = event.target.closest('[data-backup-action]');
        if (!target) return;

        const fileName = target.dataset.backupFile;
        const targetType = target.dataset.backupTarget;
        if (!fileName || !targetType) return;

        if (!window.confirm('¿Quieres restaurar esta copia de seguridad?')) return;

        try {
          const response = await fetch('/admin/api/backups/restore', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': productCsrfInput.value,
            },
            body: JSON.stringify({ file: fileName, target: targetType }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'No se pudo restaurar la copia de seguridad.');
          }

          setProductStatus('Copia restaurada correctamente.', false);
          await loadBackups();
          await refreshOverview();
          await loadPreview();
        } catch (error) {
          setProductStatus(error.message, true);
        }
      });

      ensureSession().then(async function () {
        await populateProductListSelect();
        await refreshOverview();
        await loadPreview();
      }).catch(function (error) {
        setStatus(error.message, true);
      });
    </script>
  </body>
</html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  try {
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/admin') {
      const session = ensureSession(req, res);
      return htmlResponse(res, adminPage);
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/admin/session') {
      const session = ensureSession(req, res);
      return jsonResponse(res, 200, { csrfToken: session.csrfToken, sessionId: session.id });
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/admin/api/listas') {
      const listas = await readLists();
      return jsonResponse(res, 200, listas);
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith('/admin/api/listas/')) {
      const id = decodeURIComponent(url.pathname.replace('/admin/api/listas/', ''));
      const listas = await readLists();
      const found = listas.find((item) => item.id === id || item.slug === id);
      if (!found) {
        return jsonResponse(res, 404, { error: 'Lista no encontrada.' });
      }
      return jsonResponse(res, 200, found);
    }

    if (req.method === 'POST' && url.pathname === '/admin/api/listas') {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const payload = await parseJsonBody(req);
      const nextList = normalisePayload(payload);

      if (!nextList.nombre) {
        return jsonResponse(res, 400, { error: 'El nombre es obligatorio.' });
      }

      const listas = await readLists();
      if (listas.some((item) => item.id === nextList.id || item.slug === nextList.slug)) {
        return jsonResponse(res, 409, { error: 'Ya existe una lista con ese slug.' });
      }

      listas.push(nextList);
      await writeLists(listas);
      return jsonResponse(res, 201, nextList);
    }

    if (req.method === 'PUT' && url.pathname.startsWith('/admin/api/listas/')) {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const id = decodeURIComponent(url.pathname.replace('/admin/api/listas/', ''));
      const payload = await parseJsonBody(req);
      const updated = normalisePayload({ ...payload, id, slug: payload.slug || id });

      const listas = await readLists();
      const index = listas.findIndex((item) => item.id === id || item.slug === id);
      if (index === -1) {
        return jsonResponse(res, 404, { error: 'Lista no encontrada.' });
      }

      if (listas.some((item) => (item.id !== id && item.slug === updated.slug))) {
        return jsonResponse(res, 409, { error: 'Ya existe otra lista con ese slug.' });
      }

      listas[index] = { ...listas[index], ...updated, id: updated.id, slug: updated.slug };
      await writeLists(listas);
      return jsonResponse(res, 200, listas[index]);
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/admin/api/listas/')) {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const id = decodeURIComponent(url.pathname.replace('/admin/api/listas/', ''));
      const listas = await readLists();
      const next = listas.filter((item) => item.id !== id && item.slug !== id);
      if (next.length === listas.length) {
        return jsonResponse(res, 404, { error: 'Lista no encontrada.' });
      }
      await writeLists(next);
      return jsonResponse(res, 200, { ok: true, deleted: id });
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/admin/api/productos') {
      const productos = await readProducts();
      return jsonResponse(res, 200, productos);
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith('/admin/api/productos/')) {
      const id = decodeURIComponent(url.pathname.replace('/admin/api/productos/', ''));
      const productos = await readProducts();
      const found = productos.find((item) => item.id === id);
      if (!found) {
        return jsonResponse(res, 404, { error: 'Referido no encontrado.' });
      }
      return jsonResponse(res, 200, found);
    }

    if (req.method === 'POST' && url.pathname === '/admin/api/parse-link') {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const payload = await parseJsonBody(req);
      const suggestion = await parseLinkSuggestion(payload.source || payload.text || payload.url || payload.enlace || '');
      if (!suggestion.ok) {
        return jsonResponse(res, 400, suggestion);
      }
      return jsonResponse(res, 200, suggestion);
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/admin/api/backups') {
      const files = await readdir(BACKUPS_DIR).catch(() => []);
      const backups = files
        .filter((name) => name.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a))
        .map((name) => {
          const target = name.startsWith('listas-') ? 'listas' : name.startsWith('productos-') ? 'productos' : 'desconocido';
          return { name, file: name, target };
        });
      return jsonResponse(res, 200, { backups });
    }

    if (req.method === 'POST' && url.pathname === '/admin/api/backups') {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const listas = await readLists();
      const productos = await readProducts();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const files = [];

      const listasBackupPath = `${BACKUPS_DIR}/listas-${timestamp}.json`;
      const productosBackupPath = `${BACKUPS_DIR}/productos-${timestamp}.json`;
      await writeFile(listasBackupPath, `${JSON.stringify(listas, null, 2)}\n`, 'utf8');
      await writeFile(productosBackupPath, `${JSON.stringify(productos, null, 2)}\n`, 'utf8');
      files.push('listas-' + timestamp + '.json', 'productos-' + timestamp + '.json');

      return jsonResponse(res, 200, { ok: true, files });
    }

    if (req.method === 'POST' && url.pathname === '/admin/api/backups/restore') {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const payload = await parseJsonBody(req);
      const fileName = String(payload.file || '').trim();
      const target = String(payload.target || '').trim();
      if (!fileName || !target) {
        return jsonResponse(res, 400, { error: 'Debes indicar qué copia quieres restaurar.' });
      }

      const backupPath = `${BACKUPS_DIR}/${fileName}`;
      const raw = await readFile(backupPath, 'utf8');
      const parsed = JSON.parse(raw);
      const destination = target === 'listas' ? LISTAS_FILE : target === 'productos' ? PRODUCTS_FILE : null;
      if (!destination) {
        return jsonResponse(res, 400, { error: 'Destino de respaldo no válido.' });
      }

      await writeFile(destination, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
      return jsonResponse(res, 200, { ok: true, restored: fileName, target });
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/admin/api/publicacion/preview') {
      const productos = await readProducts();
      return jsonResponse(res, 200, buildPublicationSnapshot(productos));
    }

    if (req.method === 'POST' && url.pathname === '/admin/api/publicacion/preview') {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const payload = await parseJsonBody(req);
      const productos = Array.isArray(payload.productos) ? payload.productos : await readProducts();
      return jsonResponse(res, 200, buildPublicationSnapshot(productos));
    }

    if (req.method === 'POST' && url.pathname === '/admin/api/publicacion/guardar') {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const payload = await parseJsonBody(req);
      const productos = await readProducts();
      const productoId = payload.producto_id || payload.id;
      const producto = productos.find((item) => item.id === productoId);
      if (!producto) {
        return jsonResponse(res, 404, { error: 'Referido no encontrado.' });
      }

      const fecha = payload.fecha || new Date().toISOString().slice(0, 10);
      const precio = payload.precio === undefined ? Number(producto.precio ?? 0) : Number(payload.precio);
      if (!Number.isFinite(precio) || precio <= 0) {
        return jsonResponse(res, 400, { error: 'El precio debe ser mayor a 0.' });
      }

      const nextHistory = addPriceHistoryEntry(producto.historial_precios || [], precio, fecha);
      const updated = {
        ...producto,
        precio,
        fecha_precio: fecha,
        historial_precios: nextHistory,
        actualizado: new Date().toISOString(),
      };

      const index = productos.findIndex((item) => item.id === productoId);
      productos[index] = updated;
      await writeProducts(productos);
      return jsonResponse(res, 200, { ok: true, producto: updated, snapshot: buildPublicationSnapshot(productos) });
    }

    if (req.method === 'POST' && url.pathname === '/admin/api/productos') {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const payload = await parseJsonBody(req);
      const listas = await readLists();
      if (!payload.lista_id || !listas.some((lista) => lista.id === payload.lista_id)) {
        return jsonResponse(res, 400, { error: 'Debes seleccionar una lista válida.' });
      }
      if (!payload.nombre || !String(payload.nombre).trim()) {
        return jsonResponse(res, 400, { error: 'El nombre del referid es obligatorio.' });
      }
      if (!payload.enlace_referido && !payload.url_publicacion) {
        return jsonResponse(res, 400, { error: 'Debes pegar un enlace o URL del producto.' });
      }
      const precio = Number(payload.precio ?? 0);
      if (!Number.isFinite(precio) || precio <= 0) {
        return jsonResponse(res, 400, { error: 'El precio debe ser un número mayor a 0.' });
      }

      const productos = await readProducts();
      let nextProduct;
      try {
        nextProduct = validateProductPayload(payload, productos);
      } catch (error) {
        return jsonResponse(res, 400, { error: error.message });
      }
      productos.push(nextProduct);
      await writeProducts(productos);
      return jsonResponse(res, 201, nextProduct);
    }

    if (req.method === 'PUT' && url.pathname.startsWith('/admin/api/productos/')) {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const id = decodeURIComponent(url.pathname.replace('/admin/api/productos/', ''));
      const payload = await parseJsonBody(req);
      const listas = await readLists();
      if (payload.lista_id && !listas.some((lista) => lista.id === payload.lista_id)) {
        return jsonResponse(res, 400, { error: 'La lista seleccionada no es válida.' });
      }

      const productos = await readProducts();
      const index = productos.findIndex((item) => item.id === id);
      if (index === -1) {
        return jsonResponse(res, 404, { error: 'Referido no encontrado.' });
      }

      const existing = productos[index];
      let updated;
      try {
        updated = validateProductPayload({ ...payload, id }, productos, id);
      } catch (error) {
        return jsonResponse(res, 400, { error: error.message });
      }

      productos[index] = { ...existing, ...updated };
      await writeProducts(productos);
      return jsonResponse(res, 200, productos[index]);
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/admin/api/productos/')) {
      const session = ensureSession(req, res);
      const csrfToken = req.headers['x-csrf-token'];
      if (csrfToken !== session.csrfToken) {
        return jsonResponse(res, 403, { error: 'CSRF inválido o sesión expirada.' });
      }

      const id = decodeURIComponent(url.pathname.replace('/admin/api/productos/', ''));
      const productos = await readProducts();
      const next = productos.filter((item) => item.id !== id);
      if (next.length === productos.length) {
        return jsonResponse(res, 404, { error: 'Referido no encontrado.' });
      }
      await writeProducts(next);
      return jsonResponse(res, 200, { ok: true, deleted: id });
    }

    return jsonResponse(res, 404, { error: 'Ruta no encontrada.' });
  } catch (error) {
    const message = error && error.message ? error.message : 'Error interno';
    if (message === 'JSON inválido') {
      return jsonResponse(res, 400, { error: 'JSON inválido. Revisa la estructura enviada.' });
    }
    console.error(error);
    return jsonResponse(res, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Admin local listo en http://${HOST}:${PORT}/admin`);
});
