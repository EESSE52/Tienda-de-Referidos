// Carga de productos desde data/productos.json y valores derivados.
import datos from '../../data/productos.json';
import { categoriaPorSlug, type Columna } from '../config/categorias';
import { calcularMetricas, type Metricas } from './calculos';
import { formatoCLP } from './formato';

export interface Producto {
  id: string;
  categoria: string;
  nombre: string;
  marca: string;
  formato: string;
  vendedor: string;
  id_publicacion?: string | null;
  enlace_referido: string;
  precio: number;
  fecha_precio: string;
  contenido_g: number;
  porciones: number;
  dosis_g: number;
  imagen?: string | null;
  notas?: string | null;
  activo: boolean;
  tipo?: string;
  certificacion?: string;
  proteina_por_porcion_g?: number;
}

export const productos = datos as Producto[];

export const productosDe = (slug: string) => productos.filter((p) => p.categoria === slug);

export const metricasDe = (p: Producto): Metricas => calcularMetricas(p);

/** Valor crudo de una columna: campo del producto o métrica calculada. */
export function valorDe(p: Producto, clave: string): string | number | null {
  const m = metricasDe(p);
  if (clave in m) return m[clave];
  const v = (p as unknown as Record<string, unknown>)[clave];
  return typeof v === 'string' || typeof v === 'number' ? v : null;
}

/** Valor formateado para mostrar según la columna. */
export function mostrar(p: Producto, col: Pick<Columna, 'clave' | 'formato'>): string {
  const v = valorDe(p, col.clave);
  if (v === null || v === '') return '—';
  if (col.formato === 'clp') return typeof v === 'number' ? formatoCLP(v) : String(v);
  if (col.formato === 'clp1') return typeof v === 'number' ? formatoCLP(v, 1) : String(v);
  return String(v);
}

/** Solo permite enlaces http(s) como enlace de compra. */
export function enlaceSeguro(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

export const nombreCategoria = (slug: string) => categoriaPorSlug(slug)?.nombre ?? slug;
