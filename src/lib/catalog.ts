import listasData from '../../data/listas.json';
import productosData from '../../data/productos.json';
import { evaluateMetric, formatMetricValue, parseNumber } from './metricas';

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
    formula: any;
    mejor: 'menor' | 'mayor' | null;
    decimales?: number;
  }>;
};

export type Producto = {
  id: string;
  lista_id: string;
  nombre: string;
  marca: string;
  id_publicacion: string;
  enlace_referido: string;
  url_publicacion?: string;
  precio: number;
  fecha_precio: string;
  vendedor: string;
  activo: boolean;
  imagen?: string;
  notas?: string;
  atributos: Record<string, unknown>;
  historial_precios: Array<{ fecha: string; precio: number }>;
  creado: string;
  actualizado: string;
};

export const listas = listasData as Lista[];
export const productos = productosData as Producto[];

export function getListaBySlug(slug: string): Lista | undefined {
  return listas.find((lista) => lista.slug === slug);
}

export function getListaById(id: string): Lista | undefined {
  return listas.find((lista) => lista.id === id);
}

export function getProductosByListaId(listaId: string): Producto[] {
  return productos.filter((producto) => producto.lista_id === listaId && producto.activo);
}

export function getProductoById(id: string): Producto | undefined {
  return productos.find((producto) => producto.id === id);
}

export function currencyCLP(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
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
