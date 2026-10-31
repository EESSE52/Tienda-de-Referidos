#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Extractor ML</title>
    <style>
      :root { color-scheme: dark; --bg:#071521; --panel:#102334; --line:#294158; --text:#e5eef7; --muted:#a7bacb; --accent:#47d7a4; --danger:#ff8e8e; }
      * { box-sizing: border-box; }
      body { margin:0; background:var(--bg); color:var(--text); font-family:system-ui,sans-serif; }
      main { max-width: 1100px; margin: auto; padding: 2rem 1rem 4rem; }
      h1 { margin-bottom: 0.5rem; }
      .muted { color: var(--muted); }
      .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem; }
      .panel { background: var(--panel); border:1px solid var(--line); border-radius: .75rem; padding: 1rem; }
      textarea, input, select { width:100%; border:1px solid var(--line); background:#071521; color:var(--text); border-radius:.5rem; padding:.8rem; font:inherit; }
      textarea { min-height: 180px; resize: vertical; }
      button { background: var(--accent); color:#06121c; border:0; border-radius:.5rem; padding:.75rem 1rem; font-weight:800; cursor:pointer; }
      button.secondary { background:#213d4f; color:var(--text); }
      button.danger { background:var(--danger); }
      .row { display:flex; gap:.75rem; margin-top:1rem; }
      .row > * { flex: 1; }
      .status { min-height: 1.5rem; margin-top: .75rem; color: var(--muted); }
      .status.error { color: var(--danger); }
      .code { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .example { color: var(--muted); }
      @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Extractor de enlaces de Mercado Libre</h1>
      <p class="muted">Genera payloads JSON para cargar manualmente en el admin de Cloudflare.</p>

      <div class="grid">
        <section class="panel">
          <label>
            Lista destino
            <input id="listaId" value="creatina" placeholder="creatina" />
          </label>

          <div class="row">
            <input id="linksInput" placeholder="Pega uno o varios enlaces de Mercado Libre, uno por línea" />
            <button id="generateBtn">Generar JSON</button>
          </div>

          <div class="row">
            <button class="secondary" id="exampleBtn">Cargar ejemplo</button>
            <button class="danger" id="clearBtn">Limpiar</button>
          </div>

          <p id="status" class="status" aria-live="polite"></p>
        </section>

        <section class="panel">
          <h2>JSON generado</h2>
          <textarea id="output" readonly></textarea>
        </section>
      </div>

      <section class="panel" style="margin-top:1rem;">
        <h2>Instrucciones</h2>
        <p class="example">1) Pega un o varios enlaces de Mercado Libre.<br>2) Pulsa “Generar JSON”.<br>3) Edita nombre, marca, precio, imagen y atributos.<br>4) Pégalo en el admin de Cloudflare y guárdalo en D1.</p>
      </section>
    </main>

    <script type="module">
      const listaIdInput = document.getElementById('listaId');
      const linksInput = document.getElementById('linksInput');
      const output = document.getElementById('output');
      const status = document.getElementById('status');

      function setStatus(message, isError = false) {
        status.textContent = message;
        status.className = 'status' + (isError ? ' error' : '');
      }

      function slugify(value) {
        return String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      function getMlId(url) {
        const decoded = decodeURIComponent(String(url || ''));
        const match = decoded.match(/\b(ML[A-Z])[-_]?([0-9]{6,})\b/i);
        return match ? (match[1] + match[2]).toUpperCase() : '';
      }

      function createPayload(url, listaId) {
        const id = getMlId(url) || 'MLX000000';
        const now = new Date();
        return {
          id: 'producto-nombre-a-cargar-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8),
          lista_id: listaId || 'creatina',
          nombre: 'NOMBRE_A_CARGAR',
          marca: 'MARCA_A_CARGAR',
          precio: 0,
          fecha_precio: now.toISOString().slice(0, 10),
          id_publicacion: id,
          enlace_referido: url,
          url_publicacion: url,
          imagen: '',
          activo: true,
          vendedor: 'VENDEDOR_A_CARGAR',
          atributos: {},
          historial_precios: [{ fecha: now.toISOString().slice(0, 10), precio: 0 }],
        };
      }

      function generate() {
        const rawText = linksInput.value.trim();
        const listaId = listaIdInput.value.trim() || 'creatina';
        if (!rawText) {
          setStatus('Pega al menos un enlace de Mercado Libre.', true);
          output.value = '';
          return;
        }

        const urls = rawText.split(/\n|\s+/).map((entry) => entry.trim()).filter(Boolean);
        const validUrls = urls.filter((url) => /^https?:\/\//i.test(url));

        if (!validUrls.length) {
          setStatus('No encontré enlaces válidos. Deben empezar con http o https.', true);
          output.value = '';
          return;
        }

        const payloads = validUrls.map((url) => createPayload(url, listaId));
        const text = JSON.stringify(payloads.length === 1 ? payloads[0] : payloads, null, 2);
        output.value = text;
        const plural = payloads.length > 1 ? 's' : '';
        setStatus(payloads.length + ' payload' + plural + ' generado' + plural + '.');
      }

      document.getElementById('generateBtn').addEventListener('click', generate);
      document.getElementById('exampleBtn').addEventListener('click', () => {
        listaIdInput.value = 'creatina';
        linksInput.value = [
          'https://www.mercadolibre.cl/creatina-monohidratada/MLC1234567890',
          'https://www.mercadolibre.cl/proteina-whey/MLC987654321'
        ].join('\n');
        generate();
      });
      document.getElementById('clearBtn').addEventListener('click', () => {
        linksInput.value = '';
        output.value = '';
        setStatus('Formulario limpiado.');
      });
    </script>
  </body>
</html>`;

const server = createServer(async (req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

const port = Number(process.env.PORT || 4177);
server.listen(port, '127.0.0.1', () => {
  console.log(`Extractor ML UI running at http://127.0.0.1:${port}`);
});
