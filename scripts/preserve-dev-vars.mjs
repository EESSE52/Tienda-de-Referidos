import { existsSync, mkdirSync, copyFileSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const rootSecret = resolve('.dev.vars');
const builtSecret = resolve('dist/server/.dev.vars');
const mode = process.argv[2];

if (!['backup', 'restore'].includes(mode)) {
  console.error('Uso: node scripts/preserve-dev-vars.mjs backup|restore');
  process.exitCode = 1;
} else if (mode === 'backup') {
  // Primera ejecución: conserva el secreto que antes vivía en dist/server.
  if (!existsSync(rootSecret) && existsSync(builtSecret)) {
    copyFileSync(builtSecret, rootSecret);
    chmodSync(rootSecret, 0o600);
    console.log('[dev-vars] Clave local respaldada fuera de dist/.');
  }
} else if (existsSync(rootSecret)) {
  // Astro puede regenerar dist/ en cada compilación.
  mkdirSync(dirname(builtSecret), { recursive: true });
  copyFileSync(rootSecret, builtSecret);
  chmodSync(builtSecret, 0o600);
  console.log('[dev-vars] Clave local disponible para Wrangler.');
} else {
  console.log('[dev-vars] Sin clave local; la API administrativa seguirá cerrada.');
}
