// Funciones de presentación (aquí sí se redondea).

/** Valor con separador de miles "." y coma decimal: 24990 -> "$24.990"; null -> "—". */
export function formatoCLP(valor: number | null | undefined, decimales = 0): string {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return '—';
  const [entero, dec] = Math.abs(valor).toFixed(decimales).split('.');
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${valor < 0 ? '-' : ''}$${miles}${dec ? ',' + dec : ''}`;
}

/** "2026-10-15" -> "15/10/2026". */
export function formatoFecha(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

/** Días transcurridos desde una fecha YYYY-MM-DD hasta `hoy`; null si la fecha es inválida. */
export function diasDesde(iso: string | null | undefined, hoy: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return null;
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return Math.floor((hoy.getTime() - t) / 86_400_000);
}

export const DIAS_MAXIMOS_PRECIO = 14;

export function precioDesactualizado(iso: string | null | undefined, hoy: Date = new Date()): boolean {
  const d = diasDesde(iso, hoy);
  return d === null || d > DIAS_MAXIMOS_PRECIO;
}
