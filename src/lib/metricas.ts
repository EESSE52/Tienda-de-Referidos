export type Formula =
  | { tipo: 'precio_dividido_por'; campo: string }
  | { tipo: 'campo_dividido_por'; campo_a: string; campo_b: string };

export type MetricDefinition = {
  clave: string;
  etiqueta: string;
  formula: Formula;
  mejor: 'menor' | 'mayor' | null;
  decimales?: number;
};

export type ProductLike = {
  precio?: number | string | null;
  atributos?: Record<string, number | string | null | undefined>;
  [key: string]: unknown;
};

export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return null;

    const withoutSpaces = normalized.replace(/\s+/g, '');
    if (!withoutSpaces || withoutSpaces === '—' || withoutSpaces === 'null') {
      return null;
    }

    const hasDot = withoutSpaces.includes('.');
    const hasComma = withoutSpaces.includes(',');

    if (hasDot && hasComma) {
      const lastDot = withoutSpaces.lastIndexOf('.');
      const lastComma = withoutSpaces.lastIndexOf(',');
      const decimalSeparator = lastDot > lastComma ? '.' : ',';
      const clean = decimalSeparator === '.'
        ? withoutSpaces.replace(/,/g, '')
        : withoutSpaces.replace(/\./g, '').replace(',', '.');
      const parsed = Number(clean);
      return Number.isFinite(parsed) ? parsed : null;
    }

    if (hasDot && !hasComma) {
      const parts = withoutSpaces.split('.');
      const last = parts[parts.length - 1];
      const isThousands = parts.length > 1 && /^\d{3}$/.test(last);
      if (isThousands) {
        return Number(withoutSpaces.replace(/\./g, ''));
      }
    }

    if (hasComma) {
      const lastComma = withoutSpaces.lastIndexOf(',');
      const decimalPart = withoutSpaces.slice(lastComma + 1);
      const integerPart = withoutSpaces.slice(0, lastComma);
      const hasOnlyThousands = /^\d{1,3}(\.\d{3})+$/.test(withoutSpaces);
      if (hasOnlyThousands) {
        return Number(withoutSpaces.replace(/\./g, '').replace(',', '.'));
      }
      if (decimalPart.length <= 2 && integerPart.length > 0) {
        return Number(withoutSpaces.replace(',', '.'));
      }
      return Number(withoutSpaces.replace(',', ''));
    }

    if (hasDot) {
      const numericText = withoutSpaces.replace(/,/g, '');
      const asNumber = Number(numericText);
      return Number.isFinite(asNumber) ? asNumber : null;
    }

    const numeric = Number(withoutSpaces);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

export function resolveFieldValue(producto: ProductLike, fieldName: string): number | null {
  if (!fieldName) return null;

  const direct = (producto as Record<string, unknown>)[fieldName];
  if (direct !== undefined && direct !== null) {
    const parsed = parseNumber(direct);
    if (parsed !== null) return parsed;
  }

  const fromAttributes = producto.atributos?.[fieldName];
  if (fromAttributes !== undefined && fromAttributes !== null) {
    const parsed = parseNumber(fromAttributes);
    if (parsed !== null) return parsed;
  }

  return null;
}

export function evaluateFormula(formula: Formula, producto: ProductLike): number | null {
  if (formula.tipo === 'precio_dividido_por') {
    const precio = resolveFieldValue(producto, 'precio');
    const divisor = resolveFieldValue(producto, formula.campo);
    if (precio === null || divisor === null || divisor === 0) return null;
    return precio / divisor;
  }

  if (formula.tipo === 'campo_dividido_por') {
    const a = resolveFieldValue(producto, formula.campo_a);
    const b = resolveFieldValue(producto, formula.campo_b);
    if (a === null || b === null || b === 0) return null;
    return a / b;
  }

  return null;
}

export function evaluateMetric(metric: MetricDefinition, producto: ProductLike): number | null {
  return evaluateFormula(metric.formula, producto);
}

export function formatMetricValue(value: number | null, decimals = 2): string {
  if (value === null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
