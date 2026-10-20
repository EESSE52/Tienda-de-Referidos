import { describe, expect, it } from 'vitest';
import { addPriceHistoryEntry, buildPublicationSnapshot } from './admin-publicacion';

describe('addPriceHistoryEntry', () => {
  it('guarda un nuevo precio y evita duplicados del mismo día', () => {
    const history = [
      { fecha: '2026-10-19', precio: 24990 },
    ];

    const next = addPriceHistoryEntry(history, 25990, '2026-10-19');
    expect(next).toEqual([
      { fecha: '2026-10-19', precio: 25990 },
    ]);
  });
});

describe('buildPublicationSnapshot', () => {
  it('genera una instantánea local con fecha, conteo y resumen', () => {
    const snapshot = buildPublicationSnapshot([
      { id: 'p-1', nombre: 'Creatina', lista_id: 'creatina', precio: 24990 },
      { id: 'p-2', nombre: 'Proteína', lista_id: 'proteina', precio: 32990 },
    ]);

    expect(snapshot.totalProductos).toBe(2);
    expect(snapshot.listaIds).toEqual(['creatina', 'proteina']);
    expect(snapshot.resumen).toContain('2');
  });

  it('incluye el cambio del precio por producto para la vista previa de publicación', () => {
    const snapshot = buildPublicationSnapshot([
      {
        id: 'p-1',
        nombre: 'Creatina',
        lista_id: 'creatina',
        precio: 25990,
        historial_precios: [
          { fecha: '2026-10-17', precio: 24990 },
          { fecha: '2026-10-19', precio: 25990 },
        ],
      },
    ]);

    expect(snapshot.items[0].precioAnterior).toBe(24990);
    expect(snapshot.items[0].cambio).toBe(1000);
  });
});
