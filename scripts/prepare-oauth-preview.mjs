import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const input = resolve('dist/server/wrangler.json');
const output = resolve('dist/server/wrangler.oauth-preview.json');
if (!existsSync(input)) {
  console.error('Primero ejecuta npm run build.');
  process.exitCode = 1;
} else {
  const config = JSON.parse(readFileSync(input, 'utf8'));
  const originalName = config.name;
  if (!originalName) throw new Error('No se encontró el nombre del Worker compilado.');
  config.name = 'tienda-de-referidos-oauth-pruebas';
  // No acceder a bases de producción ni heredar rutas o dominios.
  delete config.d1_databases;
  delete config.kv_namespaces;
  delete config.r2_buckets;
  delete config.durable_objects;
  delete config.routes;
  delete config.route;
  delete config.triggers;
  delete config.workers_dev;
  delete config.custom_domain;
  delete config.env;
  delete config.previews;
  delete config.unsafe;
  // Conserva las variables del panel de Cloudflare; no copia vars del Worker de producción.
  delete config.vars;
  config.keep_vars = true;
  // KV separado: nunca heredar namespaces de la tienda principal.
  const kvId = (process.env.ML_OAUTH_KV_NAMESPACE_ID || '').trim();
  if (kvId) {
    if (!/^[a-f0-9]{32}$/i.test(kvId)) throw new Error('El identificador KV debe contener 32 caracteres hexadecimales.');
    config.kv_namespaces = [{ binding: 'ML_OAUTH_TOKENS', id: kvId }];
  }
  // Sin secretos: esta preparación no inicia OAuth ni publica nada.
  writeFileSync(output, JSON.stringify(config, null, 2) + '\n');
  console.log('Configuración de pruebas preparada en dist/server/wrangler.oauth-preview.json.');
  console.log('Worker de pruebas: ' + config.name);
  console.log('Sin D1, R2 ni rutas vinculadas a producción.');
  console.log(kvId ? 'KV exclusivo de OAuth configurado (binding ML_OAUTH_TOKENS).' : 'Sin KV: el intercambio de tokens permanece deshabilitado.');
  console.log('keep_vars=true: conservar las variables existentes del dashboard.');
  console.log('No se realizó ningún despliegue. No contiene credenciales.');
}
