const db = require('../db');
const time = require('../lib/time');
const users = require('./users');

const BASE = `SELECT u.*, l.name AS level_name FROM users u LEFT JOIN levels l ON l.id = u.level_id WHERE u.role = 'cliente'`;

/**
 * Búsqueda de clientes con filtros.
 * q: nombre, apellido, celular o email · level: id · birthdayMonth: '01'..'12' · inactiveDays: n
 */
function search({ q = '', level = '', birthdayMonth = '', inactiveDays = '', limit = 50, offset = 0 } = {}) {
  const where = [];
  const params = {};
  const text = String(q).trim().toLowerCase();
  if (text) {
    const digits = users.normalizePhone(text);
    where.push(`(lower(u.first_name || ' ' || u.last_name) LIKE @like OR lower(u.last_name) LIKE @like
                 OR lower(COALESCE(u.email, '')) LIKE @like${digits.length >= 3 ? ' OR u.phone LIKE @digits' : ''})`);
    params.like = `%${text}%`;
    if (digits.length >= 3) params.digits = `%${digits}%`;
  }
  if (level) { where.push('u.level_id = @level'); params.level = Number(level); }
  if (/^\d{2}$/.test(birthdayMonth)) { where.push("substr(u.birthday, 6, 2) = @month"); params.month = birthdayMonth; }
  const days = Number(inactiveDays);
  if (days > 0) {
    where.push("COALESCE(u.last_visit_at, u.created_at) < datetime('now', @ago)");
    params.ago = `-${days} days`;
  }
  const sqlWhere = where.length ? ` AND ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users u WHERE u.role = 'cliente'${sqlWhere}`).get(params).n;
  const rows = db.prepare(`${BASE}${sqlWhere} ORDER BY u.first_name, u.last_name LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });
  return { total, rows };
}

const byId = (id) => db.prepare(`${BASE} AND u.id = ?`).get(id);
const byQrToken = (token) => db.prepare(`${BASE} AND u.qr_token = ?`).get(String(token || ''));

/** Clientes que cumplen años en la semana actual (lunes a domingo). */
function birthdaysThisWeek() {
  const { monday } = time.weekRange();
  const mds = Array.from({ length: 7 }, (_, i) => time.addDays(monday, i).slice(5));
  const rows = db.prepare(`${BASE} AND u.active = 1 AND u.birthday IS NOT NULL`).all();
  return rows
    .filter((u) => mds.includes(u.birthday.slice(5)))
    .sort((a, b) => mds.indexOf(a.birthday.slice(5)) - mds.indexOf(b.birthday.slice(5)));
}

const setActive = (id, active) => db.prepare("UPDATE users SET active = ?, updated_at = datetime('now') WHERE id = ? AND role = 'cliente'").run(active ? 1 : 0, id);

module.exports = { search, byId, byQrToken, birthdaysThisWeek, setActive };
