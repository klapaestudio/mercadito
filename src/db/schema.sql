PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS levels (
  id           INTEGER PRIMARY KEY,
  name         TEXT    NOT NULL,
  min_visits   INTEGER NOT NULL DEFAULT 0,
  perks        TEXT    NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id                   INTEGER PRIMARY KEY,
  role                 TEXT    NOT NULL CHECK (role IN ('cliente','cajero','admin')),
  username             TEXT    NOT NULL UNIQUE,
  first_name           TEXT    NOT NULL,
  last_name            TEXT    NOT NULL DEFAULT '',
  phone                TEXT,
  email                TEXT,
  birthday             TEXT,                -- YYYY-MM-DD
  password_hash        TEXT    NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  qr_token             TEXT    UNIQUE,
  consent_at           TEXT,
  total_visits         INTEGER NOT NULL DEFAULT 0,
  card_stamps          INTEGER NOT NULL DEFAULT 0,
  level_id             INTEGER REFERENCES levels(id),
  last_visit_at        TEXT,
  active               INTEGER NOT NULL DEFAULT 1,
  created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS login_attempts (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,               -- epoch ms
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS visits (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cashier_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  local_date  TEXT    NOT NULL,       -- YYYY-MM-DD en la zona horaria del local
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visits_user ON visits(user_id, local_date);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(local_date);

CREATE TABLE IF NOT EXISTS events (
  id                 INTEGER PRIMARY KEY,
  name               TEXT    NOT NULL,
  description        TEXT    NOT NULL DEFAULT '',
  starts_at          TEXT    NOT NULL,   -- datetime UTC
  capacity           INTEGER NOT NULL,
  max_seats          INTEGER NOT NULL DEFAULT 4,
  booking_opens_at   TEXT    NOT NULL,   -- datetime UTC: abre para Marta 3
  priority_hours     INTEGER NOT NULL DEFAULT 48,
  public_notified_at TEXT,
  active             INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reservations (
  id           INTEGER PRIMARY KEY,
  event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seats        INTEGER NOT NULL DEFAULT 1,
  status       TEXT    NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','cancelada')),
  cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_res_event ON reservations(event_id, status);

CREATE TABLE IF NOT EXISTS benefit_templates (
  id            INTEGER PRIMARY KEY,
  name          TEXT    NOT NULL,
  description   TEXT    NOT NULL DEFAULT '',
  validity_days INTEGER NOT NULL DEFAULT 30,
  trigger       TEXT    NOT NULL CHECK (trigger IN ('tarjeta_completa','subir_nivel','cumpleanos','te_extranamos','evento','manual')),
  level_id      INTEGER REFERENCES levels(id) ON DELETE SET NULL,
  event_id      INTEGER REFERENCES events(id) ON DELETE SET NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS benefits (
  id           INTEGER PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id  INTEGER REFERENCES benefit_templates(id) ON DELETE SET NULL,
  title        TEXT    NOT NULL,
  description  TEXT    NOT NULL DEFAULT '',
  source       TEXT    NOT NULL,
  dedupe_key   TEXT,
  issued_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT    NOT NULL,        -- YYYY-MM-DD, último día válido (hora local)
  status       TEXT    NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','canjeado','vencido')),
  redeemed_at  TEXT,
  redeemed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_benefits_user ON benefits(user_id, status);

CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL DEFAULT '',
  drawing     INTEGER,                  -- 1..3
  celebrate   INTEGER NOT NULL DEFAULT 0,
  read_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read_at);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cron_runs (
  task     TEXT PRIMARY KEY,
  last_run TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  sid     TEXT PRIMARY KEY,
  sess    TEXT    NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
