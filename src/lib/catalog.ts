import listasData from '../../data/listas.json';
import productosData from '../../data/productos.json';
import { evaluateMetric, formatMetricValue, parseNumber, type PlantillaMetrica } from './metricas';

export type Lista = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  unidad_base: string;
  orden_defecto: { campo: string; direccion: 'asc' | 'desc' | 'menor' | 'mayor' };
  campos: Array<{
    clave: string;
    etiqueta: string;
    tipo: 'numero' | 'texto' | 'seleccion';
    unidad?: string | null;
    opciones?: string[];
    mejor?: 'menor' | 'mayor' | null;
    en_tabla: boolean;
    filtrable: boolean;
    requerido: boolean;
  }>;
  metricas: Array<{
    clave: string;
    etiqueta: string;
    plantilla?: PlantillaMetrica;
    formula?: PlantillaMetrica;
    mejor: 'menor' | 'mayor' | null;
    decimales?: number;
  }>;
  mapa_atributos_ml?: Record<string, { campo: string; conversion: string }>;
  activa?: boolean;
};

export type Producto = {
  id: string;
  lista_id: string;
  nombre: string;
  marca: string;
  formato?: string;
  id_catalogo?: string | null;
  id_publicacion: string;
  enlace_referido: string;
  url_publicacion?: string;
  precio: number;
  precio_original?: number | null;
  fecha_precio: string;
  precio_fuente?: 'manual' | 'api';
  ultima_revision?: string;
  estado_oferta?: 'disponible' | 'no_disponible' | 'sin_verificar';
  vendedor: string;
  vendedor_nombre?: string | null;
  vendedor_id?: string | null;
  reputacion_nivel?: string | null;
  mercadolider?: string | null;
  transacciones_total?: number | null;
  cuenta_activa?: boolean | null;
  reputacion_revisada?: string | null;
  en_promocion?: boolean;
  envio_gratis?: boolean;
  despacho_full?: boolean;
  tienda_oficial?: boolean;
  garantia?: string | null;
  activo: boolean;
  imagen?: string;
  imagen_propia?: string;
  imagen_candidata?: string;
  imagen_fuente?: 'propia' | 'autorizada' | 'ml_api';
  notas?: string;
  atributos: Record<string, unknown>;
  historial_precios: Array<{ fecha: string; precio: number }>;
  creado: string;
  actualizado: string;
};

export const listas = listasData as Lista[];
export const productos = productosData as Producto[];

export type Catalog = ReturnType<typeof createCatalog>;

type D1DatabaseLike = {
  prepare(query: string): {
    all<T>(): Promise<{ results?: T[] }>;
  };
};

function parseCatalogRows<T>(rows: Array<{ data: string }>): T[] {
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.data) as T];
    } catch {
      return [];
    }
  });
}

export function createCatalog(catalogLists: Lista[], catalogProducts: Producto[]) {
  return {
    listas: catalogLists,
    productos: catalogProducts,
    getListaBySlug(slug: string) {
      return catalogLists.find((lista) => lista.slug === slug);
    },
    getListaById(id: string) {
      return catalogLists.find((lista) => lista.id === id);
    },
    getProductosByListaId(listaId: string) {
      return catalogProducts.filter((producto) => producto.lista_id === listaId && producto.activo);
    },
    getProductoById(id: string) {
      return catalogProducts.find((producto) => producto.id === id);
    },
  };
}

const localCatalog = createCatalog(listas, productos);

export async function loadCatalog(database?: D1DatabaseLike): Promise<Catalog> {
  if (!database || typeof (database as D1DatabaseLike & { prepare?: unknown }).prepare !== 'function') {
    return localCatalog;
  }

  try {
    const [listResult, productResult] = await Promise.all([
      database.prepare('SELECT data FROM catalog_lists ORDER BY nombre').all<{ data: string }>(),
      database.prepare('SELECT data FROM catalog_products ORDER BY nombre').all<{ data: string }>(),
    ]);

    return createCatalog(
      parseCatalogRows<Lista>(listResult.results ?? []),
      parseCatalogRows<Producto>(productResult.results ?? []),
    );
  } catch (error) {
    console.warn('[catalog] Fallback local activado por D1 no disponible o no inicializado:', error);
    return localCatalog;
  }
}

export const getListaBySlug = localCatalog.getListaBySlug;
export const getListaById = localCatalog.getListaById;
export const getProductosByListaId = localCatalog.getProductosByListaId;
export const getProductoById = localCatalog.getProductoById;

export function currencyCLP(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Importes unitarios: mantiene centavos CLP cuando el cálculo los requiere.
 * El precio de venta completo sigue mostrándose sin decimales con currencyCLP.
 */
export function currencyCLPUnit(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP',
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return formatMetricValue(value, decimals);
}

export function productHasOldPrice(dateIso: string | undefined): boolean {
  if (!dateIso) return false;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return false;
  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 14;
}

export function getMetricResult(producto: Producto, metric: any): number | null {
  return evaluateMetric(metric, producto);
}

export function getBestMetricValue(
  direction: 'menor' | 'mayor' | null | undefined,
  values: Array<number | null | undefined>,
): number | null {
  const valid = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  if (!valid.length) return null;
  return direction === 'menor' ? Math.min(...valid) : Math.max(...valid);
}

export function getSortValue(producto: Producto, metricKey: string): number | null {
  const target = metricKey === 'precio' ? producto.precio : parseNumber(producto.atributos?.[metricKey] ?? null);
  return target ?? null;
}

export function getDisplayValue(producto: Producto, fieldKey: string): string {
  const value = producto.atributos?.[fieldKey];
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'number') return formatMetricValue(value, 2);
  return String(value);
}
