import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const LISTAS_FILE = fileURLToPath(new URL('../data/listas.json', import.meta.url));
const PRODUCTOS_FILE = fileURLToPath(new URL('../data/productos.json', import.meta.url));
const ULTIMA_ACTUALIZACION_FILE = fileURLToPath(new URL('../data/ultima-actualizacion.json', import.meta.url));
const REVISION_PENDIENTE_FILE = fileURLToPath(new URL('../data/revision-pendiente.json', import.meta.url));

function nowIso() {
  return new Date().toISOString();
}

function parseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

function normalizeMetric(metric) {
  const plantilla = metric?.plantilla || metric?.formula || null;
  return {
    clave: String(metric?.clave || ''),
    etiqueta: String(metric?.etiqueta || ''),
    plantilla,
    formula: plantilla,
    mejor: metric?.mejor ?? null,
    decimales: Number.isFinite(metric?.decimales) ? metric.decimales : 2,
  };
}

function defaultAttributeMapByList(listaId) {
  if (listaId === 'creatina') {
    return {
      BRAND: { campo: 'marca', conversion: 'texto' },
      SUPPLEMENT_FORMAT: { campo: 'formato', conversion: 'texto' },
      NET_WEIGHT: { campo: 'gramos_total', conversion: 'peso_a_gramos' },
      FLAVOR: { campo: 'sabor', conversion: 'texto' },
      SERVINGS_NUMBER: { campo: 'porciones', conversion: 'numero' },
    };
  }

  if (listaId === 'proteina') {
    return {
      BRAND: { campo: 'marca', conversion: 'texto' },
      SUPPLEMENT_FORMAT: { campo: 'tipo', conversion: 'texto' },
      NET_WEIGHT: { campo: 'gramos_total', conversion: 'peso_a_gramos' },
      FLAVOR: { campo: 'sabor', conversion: 'texto' },
      SERVINGS_NUMBER: { campo: 'porciones', conversion: 'numero' },
      PROTEIN_PORTION: { campo: 'proteina_total', conversion: 'peso_a_gramos' },
    };
  }

  return {};
}

function normalizeLista(lista) {
  const id = String(lista?.id || lista?.slug || '').trim();
  return {
    id,
    slug: String(lista?.slug || id).trim(),
    nombre: String(lista?.nombre || id).trim(),
    descripcion: String(lista?.descripcion || '').trim(),
    unidad_base: String(lista?.unidad_base || 'g').trim(),
    orden_defecto: {
      campo: String(lista?.orden_defecto?.campo || 'precio').trim(),
      direccion: String(lista?.orden_defecto?.direccion || 'menor').trim(),
    },
    activa: lista?.activa === undefined ? true : Boolean(lista.activa),
    campos: Array.isArray(lista?.campos) ? lista.campos : [],
    metricas: Array.isArray(lista?.metricas) ? lista.metricas.map(normalizeMetric) : [],
    mapa_atributos_ml: (lista?.mapa_atributos_ml && typeof lista.mapa_atributos_ml === 'object')
      ? lista.mapa_atributos_ml
      : defaultAttributeMapByList(id),
  };
}

function normalizeProducto(producto) {
  const precio = Number(producto?.precio ?? 0);
  const fechaPrecio = String(producto?.fecha_precio || new Date().toISOString().slice(0, 10));
  const vendedorNombre = String(producto?.vendedor_nombre || producto?.vendedor || '').trim();
  const imagenPropia = String(producto?.imagen_propia || producto?.imagen || '').trim();
  const historial = Array.isArray(producto?.historial_precios) ? producto.historial_precios : [];
  const formato = String(producto?.formato || producto?.atributos?.formato || producto?.atributos?.tipo || '').trim();

  return {
    id: String(producto?.id || '').trim(),
    lista_id: String(producto?.lista_id || '').trim(),
    nombre: String(producto?.nombre || '').trim(),
    marca: String(producto?.marca || '').trim(),
    formato,
    enlace_referido: String(producto?.enlace_referido || '').trim(),
    id_catalogo: producto?.id_catalogo ? String(producto.id_catalogo).trim() : null,
    id_publicacion: String(producto?.id_publicacion || '').trim(),
    precio,
    precio_original: Number.isFinite(Number(producto?.precio_original)) ? Number(producto.precio_original) : null,
    fecha_precio: fechaPrecio,
    precio_fuente: producto?.precio_fuente === 'api' ? 'api' : 'manual',
    ultima_revision: String(producto?.ultima_revision || producto?.actualizado || nowIso()),
    estado_oferta: ['disponible', 'no_disponible', 'sin_verificar'].includes(producto?.estado_oferta)
      ? producto.estado_oferta
      : 'sin_verificar',
    activo: producto?.activo === undefined ? true : Boolean(producto.activo),
    en_promocion: Boolean(producto?.en_promocion),
    envio_gratis: Boolean(producto?.envio_gratis),
    despacho_full: Boolean(producto?.despacho_full),
    tienda_oficial: Boolean(producto?.tienda_oficial),
    garantia: producto?.garantia ? String(producto.garantia).trim() : null,
    vendedor_id: producto?.vendedor_id ? String(producto.vendedor_id).trim() : null,
    vendedor_nombre: vendedorNombre || null,
    reputacion_nivel: producto?.reputacion_nivel ? String(producto.reputacion_nivel).trim() : null,
    mercadolider: producto?.mercadolider ? String(producto.mercadolider).trim() : null,
    transacciones_total: Number.isFinite(Number(producto?.transacciones_total)) ? Number(producto.transacciones_total) : null,
    cuenta_activa: producto?.cuenta_activa === undefined ? null : Boolean(producto.cuenta_activa),
    reputacion_revisada: producto?.reputacion_revisada ? String(producto.reputacion_revisada) : null,
    atributos: (producto?.atributos && typeof producto.atributos === 'object') ? producto.atributos : {},
    notas: producto?.notas ? String(producto.notas) : '',
    imagen_propia: imagenPropia,
    imagen_candidata: producto?.imagen_candidata ? String(producto.imagen_candidata) : '',
    imagen_fuente: producto?.imagen_fuente || (imagenPropia ? 'propia' : 'ml_api'),
    historial_precios: historial,
    creado: String(producto?.creado || nowIso()),
    actualizado: String(producto?.actualizado || nowIso()),

    // Compatibilidad temporal hasta adaptar todas las vistas/admin al nuevo modelo.
    vendedor: vendedorNombre,
    url_publicacion: producto?.url_publicacion ? String(producto.url_publicacion) : '',
    imagen: imagenPropia,
  };
}

async function main() {
  const rawListas = await readFile(LISTAS_FILE, 'utf8');
  const rawProductos = await readFile(PRODUCTOS_FILE, 'utf8');

  const listas = parseJson(rawListas, []);
  const productos = parseJson(rawProductos, []);

  const listasMigradas = Array.isArray(listas) ? listas.map(normalizeLista) : [];
  const productosMigrados = Array.isArray(productos) ? productos.map(normalizeProducto) : [];

  await writeFile(LISTAS_FILE, `${JSON.stringify(listasMigradas, null, 2)}\n`, 'utf8');
  await writeFile(PRODUCTOS_FILE, `${JSON.stringify(productosMigrados, null, 2)}\n`, 'utf8');

  const ultimaActualizacion = {
    fecha: nowIso(),
    revisados: 0,
    cambios: 0,
    errores: [],
  };

  const revisionPendiente = {
    motivo: '',
    producto: null,
    valores: {},
  };

  await writeFile(ULTIMA_ACTUALIZACION_FILE, `${JSON.stringify(ultimaActualizacion, null, 2)}\n`, 'utf8');
  await writeFile(REVISION_PENDIENTE_FILE, `${JSON.stringify(revisionPendiente, null, 2)}\n`, 'utf8');

  console.log(`Migracion completada: ${listasMigradas.length} listas y ${productosMigrados.length} productos.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
