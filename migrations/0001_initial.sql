-- D'MonkeySport: esquema inicial para Cloudflare D1.
-- Ejecutar con: npx wrangler d1 migrations apply dmonkeysport-db --local
-- Las categorias se configuran aqui; los productos reales se importaran en una etapa separada.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  config_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  seller TEXT NOT NULL DEFAULT '',
  ml_item_id TEXT,
  ml_catalog_id TEXT,
  affiliate_url TEXT NOT NULL,
  product_url TEXT NOT NULL DEFAULT '',
  price_clp INTEGER NOT NULL CHECK (price_clp > 0),
  price_checked_at TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  attributes_json TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_products_category_active
  ON products(category_id, active);

CREATE INDEX IF NOT EXISTS idx_products_brand
  ON products(brand);

CREATE INDEX IF NOT EXISTS idx_products_ml_item
  ON products(ml_item_id);

CREATE TABLE IF NOT EXISTS product_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  price_clp INTEGER NOT NULL CHECK (price_clp > 0),
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  source TEXT NOT NULL DEFAULT 'manual',
  FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_date
  ON product_price_history(product_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  referrer TEXT NOT NULL DEFAULT '',
  campaign TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_product_date
  ON affiliate_clicks(product_id, clicked_at DESC);

INSERT OR IGNORE INTO categories (id, slug, name, description, config_json, sort_order)
VALUES
(
  'creatina',
  'creatina',
  'Creatina',
  'Comparador de creatina según costo por porción, por gramo y por dosis.',
  '{"unidad_base":"g","orden_defecto":{"campo":"precio_por_gramo","direccion":"menor"},"campos":[{"clave":"gramos_total","etiqueta":"Cantidad total","tipo":"numero","unidad":"g","mejor":"mayor","en_tabla":true,"filtrable":true,"requerido":true},{"clave":"porciones","etiqueta":"Porciones","tipo":"numero","unidad":"ud","mejor":"mayor","en_tabla":true,"filtrable":true,"requerido":true},{"clave":"dosis_3g","etiqueta":"Dosis de 3 g","tipo":"numero","unidad":"ud","mejor":"mayor","en_tabla":true,"filtrable":false,"requerido":false},{"clave":"dosis_5g","etiqueta":"Dosis de 5 g","tipo":"numero","unidad":"ud","mejor":"mayor","en_tabla":true,"filtrable":false,"requerido":false},{"clave":"formato","etiqueta":"Formato","tipo":"seleccion","opciones":["Polvo","Capsulas","Tabletas"],"en_tabla":true,"filtrable":true,"requerido":true},{"clave":"sabor","etiqueta":"Sabor","tipo":"texto","en_tabla":false,"filtrable":false,"requerido":false}],"metricas":[{"clave":"precio_por_porcion","etiqueta":"Precio por porción","formula":{"tipo":"precio_dividido_por","campo":"porciones"},"mejor":"menor","decimales":2},{"clave":"precio_por_gramo","etiqueta":"Precio por gramo","formula":{"tipo":"precio_dividido_por","campo":"gramos_total"},"mejor":"menor","decimales":2},{"clave":"precio_por_dosis_3g","etiqueta":"Precio por dosis 3 g","formula":{"tipo":"precio_dividido_por","campo":"dosis_3g"},"mejor":"menor","decimales":2},{"clave":"precio_por_dosis_5g","etiqueta":"Precio por dosis 5 g","formula":{"tipo":"precio_dividido_por","campo":"dosis_5g"},"mejor":"menor","decimales":2}]}',
  1
),
(
  'proteina',
  'proteina',
  'Proteína',
  'Comparador de proteína según costo por porción y por gramo de proteína.',
  '{"unidad_base":"g","orden_defecto":{"campo":"precio_por_gramo_proteina","direccion":"menor"},"campos":[{"clave":"gramos_total","etiqueta":"Cantidad total","tipo":"numero","unidad":"g","mejor":"mayor","en_tabla":true,"filtrable":true,"requerido":true},{"clave":"proteina_total","etiqueta":"Proteína total","tipo":"numero","unidad":"g","mejor":"mayor","en_tabla":true,"filtrable":true,"requerido":true},{"clave":"porciones","etiqueta":"Porciones","tipo":"numero","unidad":"ud","mejor":"mayor","en_tabla":true,"filtrable":true,"requerido":true},{"clave":"tipo","etiqueta":"Tipo","tipo":"seleccion","opciones":["Whey","Caseína","Vegana","Mezcla"],"en_tabla":true,"filtrable":true,"requerido":true},{"clave":"sabor","etiqueta":"Sabor","tipo":"texto","en_tabla":false,"filtrable":false,"requerido":false}],"metricas":[{"clave":"precio_por_porcion","etiqueta":"Precio por porción","formula":{"tipo":"precio_dividido_por","campo":"porciones"},"mejor":"menor","decimales":2},{"clave":"precio_por_gramo","etiqueta":"Precio por gramo total","formula":{"tipo":"precio_dividido_por","campo":"gramos_total"},"mejor":"menor","decimales":2},{"clave":"precio_por_gramo_proteina","etiqueta":"Precio por gramo de proteína","formula":{"tipo":"precio_dividido_por","campo":"proteina_total"},"mejor":"menor","decimales":2}]}',
  2
);
