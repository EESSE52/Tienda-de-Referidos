CREATE TABLE IF NOT EXISTS catalog_lists (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  activa INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_products (
  id TEXT PRIMARY KEY,
  lista_id TEXT NOT NULL REFERENCES catalog_lists(id),
  nombre TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS catalog_products_lista_id
ON catalog_products(lista_id);
