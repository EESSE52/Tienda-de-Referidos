-- Aplicar en la base CATALOG_DB antes de activar la edición de artículos.
CREATE TABLE IF NOT EXISTS seo_articles (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  list_slug TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_articles_status ON seo_articles(status,updated_at);
