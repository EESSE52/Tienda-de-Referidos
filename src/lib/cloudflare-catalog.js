export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export function requireAdmin({ env, request }) {
  const configuredToken = env?.ADMIN_API_TOKEN;

  if (typeof configuredToken !== 'string' || !configuredToken.trim()) {
    return jsonResponse(
      { error: 'Acceso administrativo no configurado.' },
      503
    );
  }

  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  const providedToken = bearer ||
    request.headers.get('x-admin-token') ||
    '';

  if (!providedToken || !safeEqual(providedToken, configuredToken)) {
    return jsonResponse({ error: 'No autorizado.' }, 401);
  }

  return null;
}

function safeEqual(a, b) {
  const encoder = new TextEncoder();
  const first = encoder.encode(a);
  const second = encoder.encode(b);

  if (first.length !== second.length) return false;

  let difference = 0;
  for (let i = 0; i < first.length; i++) {
    difference |= first[i] ^ second[i];
  }
  return difference === 0;
}

export async function readJsonBody(request) {
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Se requiere contenido JSON.');
  }

  return request.json();
}

function getDatabase(env) {
  const db = env?.CATALOG_DB;

  if (!db || typeof db.prepare !== 'function') {
    throw new Error('La base D1 CATALOG_DB (tienda_referidos) no está disponible.');
  }

  return db;
}

function parseRows(rows) {
  return rows.map(row => JSON.parse(row.data));
}

export async function readCatalog(env) {
  const db = getDatabase(env);

  const [lists, products] = await Promise.all([
    db.prepare('SELECT data FROM catalog_lists ORDER BY nombre').all(),
    db.prepare('SELECT data FROM catalog_products ORDER BY nombre').all(),
  ]);

  return {
    listas: parseRows(lists.results || []),
    productos: parseRows(products.results || []),
  };
}

export async function saveRecord(env, table, record) {
  if (table !== 'catalog_products' && table !== 'catalog_lists') {
    throw new Error('Tabla no permitida.');
  }

  if (!record || typeof record !== 'object' || !record.id) {
    throw new Error('Registro inválido.');
  }

  const db = getDatabase(env);
  const now = new Date().toISOString();

  if (table === 'catalog_products') {
    if (!record.lista_id || !record.nombre) {
      throw new Error('El producto requiere categoría y nombre.');
    }

    await db.prepare(`
      INSERT INTO catalog_products
        (id, lista_id, nombre, activo, data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        lista_id = excluded.lista_id,
        nombre = excluded.nombre,
        activo = excluded.activo,
        data = excluded.data,
        updated_at = excluded.updated_at
    `).bind(
      String(record.id),
      String(record.lista_id),
      String(record.nombre),
      record.activo === false ? 0 : 1,
      JSON.stringify(record),
      now
    ).run();
  } else {
    if (!record.slug || !record.nombre) {
      throw new Error('La categoría requiere slug y nombre.');
    }

    await db.prepare(`
      INSERT INTO catalog_lists
        (id, slug, nombre, activa, data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        nombre = excluded.nombre,
        activa = excluded.activa,
        data = excluded.data,
        updated_at = excluded.updated_at
    `).bind(
      String(record.id),
      String(record.slug),
      String(record.nombre),
      record.activa === false ? 0 : 1,
      JSON.stringify(record),
      now
    ).run();
  }

  return record;
}
