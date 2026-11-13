-- D'MonkeySport: observaciones de precio independientes del catálogo.
-- Los precios y enlaces existentes NO se actualizan desde este monitor.
CREATE TABLE IF NOT EXISTS price_monitor_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  checked INTEGER NOT NULL DEFAULT 0,
  changed INTEGER NOT NULL DEFAULT 0,
  unverifiable INTEGER NOT NULL DEFAULT 0,
  alerted INTEGER NOT NULL DEFAULT 0,
  message TEXT
);
CREATE TABLE IF NOT EXISTS price_monitor_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  saved_price INTEGER NOT NULL,
  observed_price INTEGER,
  difference_percent REAL,
  status TEXT NOT NULL CHECK(status IN ('equal','changed','unverifiable')),
  alert INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'mercadolibre_prices_api',
  FOREIGN KEY(run_id) REFERENCES price_monitor_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_price_monitor_checks_product ON price_monitor_checks(product_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_monitor_checks_run ON price_monitor_checks(run_id);
