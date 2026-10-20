export function addPriceHistoryEntry(history = [], nextPrice, date = new Date().toISOString().slice(0, 10)) {
  const numericPrice = Number(nextPrice ?? 0);
  const normalized = Array.isArray(history) ? history.map((entry) => ({
    fecha: String(entry?.fecha || date),
    precio: Number(entry?.precio ?? 0),
  })) : [];

  const sameDay = normalized.find((entry) => String(entry.fecha) === String(date));
  if (sameDay) {
    return [...normalized.filter((entry) => String(entry.fecha) !== String(date)), { fecha: date, precio: numericPrice }];
  }

  return [...normalized, { fecha: date, precio: numericPrice }];
}

export function buildPublicationSnapshot(productos = []) {
  const productList = Array.isArray(productos) ? productos : [];
  const items = productList.map((producto) => {
    const historial = Array.isArray(producto?.historial_precios) ? producto.historial_precios : [];
    const ordenado = [...historial]
      .map((entry) => ({
        fecha: String(entry?.fecha || ''),
        precio: Number(entry?.precio ?? 0),
      }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const precioActual = Number(producto?.precio ?? 0);
    const precioAnterior = ordenado.length > 1
      ? Number(ordenado[ordenado.length - 2]?.precio ?? precioActual)
      : Number(ordenado[ordenado.length - 1]?.precio ?? precioActual);
    const cambio = precioActual - precioAnterior;

    return {
      id: String(producto?.id || ''),
      nombre: String(producto?.nombre || 'Sin nombre'),
      lista_id: String(producto?.lista_id || 'sin-lista'),
      precio: precioActual,
      precioAnterior,
      cambio,
    };
  });

  const listaIds = [...new Set(items.map((item) => item.lista_id))];
  const total = items.length;
  const suma = items.reduce((acc, item) => acc + item.precio, 0);
  const promedio = total ? suma / total : 0;

  return {
    fecha: new Date().toISOString().slice(0, 10),
    totalProductos: total,
    listaIds,
    promedioPrecio: promedio,
    items,
    resumen: `Se preparan ${total} referidos para publicación en ${listaIds.length} listas. Precio promedio ${promedio.toLocaleString('es-CL', { maximumFractionDigits: 0 })} CLP.`,
  };
}
