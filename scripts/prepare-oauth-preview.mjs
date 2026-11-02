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
  // No copiar variables productivas del Worker generado.
  delete config.vars;
  // Sin secretos: esta preparación no inicia OAuth ni publica nada.
  writeFileSync(output, JSON.stringify(config, null, 2) + '\n');
  console.log('Configuración de pruebas preparada en dist/server/wrangler.oauth-preview.json.');
  console.log('Worker de pruebas: ' + config.name);
  console.log('Sin D1, KV, R2 ni rutas vinculadas a producción.');
  console.log('No se realizó ningún despliegue. No contiene credenciales.');
}
