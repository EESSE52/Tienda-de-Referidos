-- D'MonkeySport Fase 6: métricas agregadas sin identificadores personales.
-- Aplicar LOCAL antes de probar: npx wrangler d1 execute tienda_referidos --local --file migrations/0002_analytics_daily.sql
-- No ejecutar --remote hasta autorizar explícitamente la publicación.
CREATE TABLE IF NOT EXISTS analytics_daily (
  day TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'affiliate_click')),
  product_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  seller TEXT NOT NULL DEFAULT '',
  placement TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (day, event_type, product_id, placement)
);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_day ON analytics_daily(day, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_category ON analytics_daily(category_id, event_type, day);
