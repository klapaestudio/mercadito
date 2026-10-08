const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD = 6;

const hash = (pw) => bcrypt.hashSync(pw, BCRYPT_ROUNDS);
const verify = (pw, h) => bcrypt.compareSync(pw, h);
const newQrToken = () => crypto.randomBytes(16).toString('base64url');

/** Deja solo los dígitos de un celular. */
function normalizePhone(s) {
  return String(s || '').replace(/\D/g, '');
}

function isValidPhone(digits) {
  return /^\d{8,15}$/.test(digits);
}

/** Contraseña temporal fácil de dictar en el mostrador (sin caracteres confusos). */
function tempPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out;
}

const q = {
  byId: db.prepare('SELECT * FROM users WHERE id = ?'),
  byUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  firstLevel: db.prepare('SELECT id FROM levels ORDER BY min_visits ASC, sort_order ASC LIMIT 1'),
  insert: db.prepare(`INSERT INTO users
    (role, username, first_name, last_name, phone, email, birthday, password_hash,
     must_change_password, qr_token, consent_at, level_id)
    VALUES (@role, @username, @first_name, @last_name, @phone, @email, @birthday, @password_hash,
     @must_change_password, @qr_token, @consent_at, @level_id)`),
  setPassword: db.prepare(`UPDATE users SET password_hash = ?, must_change_password = ?,
    updated_at = datetime('now') WHERE id = ?`),
  countAdmins: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
};

const findById = (id) => q.byId.get(id);

/** Busca por usuario tal cual o, si parece un celular, por sus dígitos. */
function findForLogin(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;
  return q.byUsername.get(raw) || q.byUsername.get(normalizePhone(raw)) || null;
}

function createClient({ first_name, last_name, phone, email, birthday, password }) {
  const info = q.insert.run({
    role: 'cliente',
    username: phone,
    first_name, last_name, phone,
    email: email || null,
    birthday,
    password_hash: hash(password),
    must_change_password: 0,
    qr_token: newQrToken(),
    consent_at: new Date().toISOString(),
    level_id: q.firstLevel.get()?.id ?? null,
  });
  return findById(info.lastInsertRowid);
}

function createStaff({ role, username, first_name, last_name = '', password, must_change_password = 0 }) {
  const info = q.insert.run({
    role,
    username: username.trim().toLowerCase(),
    first_name, last_name,
    phone: null, email: null, birthday: null,
    password_hash: hash(password),
    must_change_password: must_change_password ? 1 : 0,
    qr_token: null, consent_at: null, level_id: null,
  });
  return findById(info.lastInsertRowid);
}

function setPassword(userId, password, mustChange = false) {
  q.setPassword.run(hash(password), mustChange ? 1 : 0, userId);
}

/** Genera una contraseña temporal y obliga a cambiarla en el próximo ingreso. */
function resetPassword(userId) {
  const temp = tempPassword();
  setPassword(userId, temp, true);
  return temp;
}

const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ');

/** Crea el admin inicial desde ADMIN_USER / ADMIN_PASSWORD si todavía no hay ninguno. */
function ensureAdmin(username, password) {
  if (q.countAdmins.get().n > 0) return;
  if (!password) {
    console.warn('[admin] No hay admin y falta ADMIN_PASSWORD: no se pudo crear el admin inicial.');
    return;
  }
  createStaff({ role: 'admin', username, first_name: 'Admin', password });
  console.log(`[admin] Admin inicial creado: "${username}".`);
}

module.exports = {
  MIN_PASSWORD, verify, normalizePhone, isValidPhone, findById, findForLogin,
  createClient, createStaff, setPassword, resetPassword, fullName, ensureAdmin,
};
