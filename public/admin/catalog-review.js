import { priceAgeStatus } from './price-alerts.js';

// Diagnóstico local y de solo lectura. Nunca consulta ni modifica Mercado Libre ni D1.
export function reviewCatalogProducts(products, now = new Date()) {
  return (Array.isArray(products) ? products : [])
    .filter(p => p && p.activo === true && p.es_prueba !== true)
    .map(product => {
      const problems = [];
      const age = priceAgeStatus(product, now);
      if (['vencido', 'sin_fecha', 'fecha_futura'].includes(age.status))
        problems.push({ code: 'precio', label: age.label });
      if (!Number.isSafeInteger(Number(product.precio)) || Number(product.precio) <= 0)
        problems.push({ code: 'importe', label: 'Importe no válido' });
      const affiliate = String(product.enlace_referido || '');
      if (!/^https:\/\//i.test(affiliate)) problems.push({ code: 'afiliado', label: 'Enlace afiliado ausente o no HTTPS' });
      if (!String(product.id_publicacion || '').trim()) problems.push({ code: 'publicacion', label: 'Sin identificador de publicación' });
      if (!String(product.vendedor_nombre || product.vendedor || '').trim()) problems.push({ code: 'vendedor', label: 'Sin vendedor' });
      return { id: product.id, nombre: product.nombre, categoria: product.lista_id, problems, count: problems.length };
    })
    .filter(item => item.count)
    .sort((a,b) => b.count - a.count || a.nombre.localeCompare(b.nombre,'es'));
}
