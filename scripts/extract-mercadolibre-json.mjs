#!/usr/bin/env node
import { buildManualProductPayload } from '../src/lib/mercadolibre-payload.js';

const args = process.argv.slice(2);
if (!args.length) {
  console.log('Uso:');
  console.log('  node scripts/extract-mercadolibre-json.mjs "https://.../MLC1234567890" [lista_id]');
  console.log('  node scripts/extract-mercadolibre-json.mjs "creatina" "https://.../MLC1234567890" "https://.../MLC987654321"');
  process.exit(1);
}

const looksLikeUrl = /^https?:\/\//i.test(args[0]);
const listaId = looksLikeUrl ? 'creatina' : args.shift() || 'creatina';
const urls = args.filter(Boolean);

if (!urls.length) {
  console.log('No se recibieron enlaces de Mercado Libre para procesar.');
  process.exit(1);
}

const products = urls.map((rawUrl) => buildManualProductPayload(
  {
    name: 'NOMBRE_A_CARGAR',
    brand: 'MARCA_A_CARGAR',
    seller: 'VENDEDOR_A_CARGAR',
    price: 0,
    image: '',
    attributes: {},
  },
  { url: rawUrl, lista_id: listaId },
));

console.log(JSON.stringify(products.length === 1 ? products[0] : products, null, 2));
