const db = require('../db');

const DEFAULTS = {
  stamps_per_card: 10,
  one_stamp_per_day: true,
  birthday_enabled: true,
  miss_you_enabled: true,
  miss_you_days: 30,
  priority_hours_default: 48,
  max_seats_default: 4,
};

const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
const upsert = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
                           ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
const selectAll = db.prepare('SELECT key, value FROM settings');

function ensureDefaults() {
  for (const [k, v] of Object.entries(DEFAULTS)) insert.run(k, JSON.stringify(v));
}

function all() {
  const out = { ...DEFAULTS };
  for (const { key, value } of selectAll.all()) out[key] = JSON.parse(value);
  return out;
}

function get(key) {
  return all()[key];
}

function set(values) {
  db.transaction(() => {
    for (const [k, v] of Object.entries(values)) upsert.run(k, JSON.stringify(v));
  })();
}

module.exports = { DEFAULTS, ensureDefaults, all, get, set };
