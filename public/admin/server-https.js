import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certCandidates = [
  path.resolve(__dirname, '../../certs/localhost.crt'),
  path.resolve(__dirname, '../../certs/cert.crt'),
  path.resolve(process.cwd(), 'certs/localhost.crt'),
  path.resolve(process.cwd(), 'certs/cert.crt'),
  '/home/eesse/certs/localhost.crt',
  '/home/eesse/cert.crt',
];

const keyCandidates = [
  path.resolve(__dirname, '../../certs/localhost.key'),
  path.resolve(__dirname, '../../certs/cert.key'),
  path.resolve(process.cwd(), 'certs/localhost.key'),
  path.resolve(process.cwd(), 'certs/cert.key'),
  '/home/eesse/certs/localhost.key',
  '/home/eesse/cert.key',
];

const certPath = certCandidates.find((candidate) => fs.existsSync(candidate));
const keyPath = keyCandidates.find((candidate) => fs.existsSync(candidate));

if (!certPath || !keyPath) {
  console.error('No se encontraron los certificados mkcert. Ejecuta:');
  console.error('mkdir -p certs');
  console.error('npx mkcert create-ca');
  console.error('npx mkcert create-cert ./certs/localhost.crt ./certs/localhost.key localhost 127.0.0.1 ::1');
  process.exit(1);
}

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

const server = https.createServer(options, (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);

  if (url.pathname === '/callback') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <h1>Callback OK</h1>
      <p>code: ${url.searchParams.get('code') || 'sin code'}</p>
      <p>state: ${url.searchParams.get('state') || 'sin state'}</p>
    `);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Servidor HTTPS funcionando');
});

server.listen(3000, '0.0.0.0', () => {
  console.log(`HTTPS activo en https://localhost:3000`);
  console.log(`Certificado: ${certPath}`);
  console.log(`Clave: ${keyPath}`);
});