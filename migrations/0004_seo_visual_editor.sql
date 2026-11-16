-- Datos estructurados del editor visual. Conserva todas las guías y artículos existentes.
ALTER TABLE seo_articles ADD COLUMN editor_json TEXT NOT NULL DEFAULT '{}';
