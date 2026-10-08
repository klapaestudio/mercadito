const db = require('../db');

/** Límite de intentos fallidos: por usuario y por IP. */
const RULES = {
  user: { max: 5, lockMs: 15 * 60 * 1000 },
  ip: { max: 30, lockMs: 15 * 60 * 1000 },
};
const WINDOW_MS = 60 * 60 * 1000; // los intentos viejos se olvidan

const q = {
  get: db.prepare('SELECT * FROM login_attempts WHERE key = ?'),
  upsert: db.prepare(`INSERT INTO login_attempts (key, count, locked_until, updated_at) VALUES (?, ?, ?, ?)
                      ON CONFLICT(key) DO UPDATE SET count = excluded.count,
                      locked_until = excluded.locked_until, updated_at = excluded.updated_at`),
  del: db.prepare('DELETE FROM login_attempts WHERE key = ?'),
  purge: db.prepare('DELETE FROM login_attempts WHERE updated_at < ? AND (locked_until IS NULL OR locked_until < ?)'),
};

const keys = (username, ip) => [
  ['user', `u:${String(username || '').trim().toLowerCase()}`],
  ['ip', `ip:${ip}`],
];

/** Devuelve los minutos restantes de bloqueo, o 0 si puede intentar. */
function lockedMinutes(username, ip) {
  const now = Date.now();
  let max = 0;
  for (const [, key] of keys(username, ip)) {
    const row = q.get.get(key);
    if (row?.locked_until && row.locked_until > now) max = Math.max(max, row.locked_until - now);
  }
  return Math.ceil(max / 60000);
}

function registerFailure(username, ip) {
  const now = Date.now();
  q.purge.run(now - WINDOW_MS, now);
  for (const [kind, key] of keys(username, ip)) {
    const row = q.get.get(key);
    const count = (row && now - row.updated_at < WINDOW_MS ? row.count : 0) + 1;
    const rule = RULES[kind];
    const locked = count >= rule.max ? now + rule.lockMs : null;
    q.upsert.run(key, locked ? 0 : count, locked, now);
  }
}

function registerSuccess(username) {
  q.del.run(keys(username, '')[0][1]);
}

module.exports = { lockedMinutes, registerFailure, registerSuccess };
