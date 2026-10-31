import { spawn } from 'node:child_process';
import net from 'node:net';

const rootDir = process.cwd();

function isPortTaken(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close(() => resolve(false));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function startService(name, command, args, env) {
  const port = Number(env.PORT || env.ADMIN_PORT || 0);

  if (port && (await isPortTaken(port))) {
    console.log(`[${name}] puerto ${port} ya está en uso; se omite el arranque.`);
    return null;
  }

  console.log(`[${name}] iniciando...`);
  const child = spawn(command, args, {
    cwd: rootDir,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code, signal) => {
    const status = signal ? `señal ${signal}` : `código ${code}`;
    console.log(`[${name}] proceso finalizado (${status}).`);
  });

  child.on('error', (error) => {
    console.error(`[${name}] error al arrancar: ${error.message}`);
  });

  return child;
}

const services = [
  {
    name: 'admin',
    command: 'node',
    args: ['scripts/admin-server.mjs'],
    env: { ADMIN_PORT: '4322' },
  },
  {
    name: 'ml-gui',
    command: 'node',
    args: ['scripts/ml-gui.mjs'],
    env: { PORT: '4177' },
  },
  {
    name: 'callback',
    command: 'node',
    args: ['public/admin/server-https.js'],
    env: {},
  },
];

const children = [];

async function main() {
  console.log('⚙️ Arrancando stack local de la app...');
  for (const service of services) {
    const child = await startService(service.name, service.command, service.args, service.env);
    if (child) {
      children.push(child);
    }
  }

  const shutdown = () => {
    console.log('\nCerrando servicios locales...');
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGINT');
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('Stack activa. Presiona Ctrl+C para cerrar.');
}

main().catch((error) => {
  console.error('Error arrancando el stack local:', error);
  process.exit(1);
});
