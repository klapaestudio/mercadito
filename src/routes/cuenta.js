const express = require('express');
const db = require('../db');
const users = require('../services/users');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

const q = {
  updateClient: db.prepare(`UPDATE users SET first_name = ?, last_name = ?, phone = ?, username = ?, email = ?,
                            updated_at = datetime('now') WHERE id = ?`),
  updateStaff: db.prepare("UPDATE users SET first_name = ?, last_name = ?, updated_at = datetime('now') WHERE id = ?"),
};

const render = (res, extra = {}) => res.page('account', {
  title: 'Mi cuenta', form: res.locals.user, errors: {}, pwErrors: {}, ...extra,
});

router.get('/mi-cuenta', requireLogin, (req, res) => render(res));

router.post('/mi-cuenta/datos', requireLogin, (req, res) => {
  const u = req.user;
  const form = {
    ...u,
    first_name: String(req.body.first_name || '').trim(),
    last_name: String(req.body.last_name || '').trim(),
    phone: String(req.body.phone || '').trim(),
    email: String(req.body.email || '').trim().toLowerCase(),
  };
  const errors = {};
  if (!form.first_name) errors.first_name = 'Completá tu nombre.';

  if (u.role === 'cliente') {
    if (!form.last_name) errors.last_name = 'Completá tu apellido.';
    const digits = users.normalizePhone(form.phone);
    if (!users.isValidPhone(digits)) errors.phone = 'Revisá el celular (solo números, con código de área).';
    else {
      const other = users.findForLogin(digits);
      if (other && other.id !== u.id) errors.phone = 'Ese celular ya está registrado en otra cuenta.';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Revisá el email.';
    form.phone = digits;
  }

  if (Object.keys(errors).length) return res.status(400).page('account', { title: 'Mi cuenta', form, errors, pwErrors: {} });

  if (u.role === 'cliente') q.updateClient.run(form.first_name, form.last_name, form.phone, form.phone, form.email || null, u.id);
  else q.updateStaff.run(form.first_name, form.last_name, u.id);
  req.flash('Guardamos tus datos.');
  res.redirect('/mi-cuenta');
});

router.post('/mi-cuenta/clave', requireLogin, (req, res) => {
  const current = String(req.body.current || '');
  const password = String(req.body.password || '');
  const pwErrors = {};
  if (!users.verify(current, req.user.password_hash)) pwErrors.current = 'La contraseña actual no es correcta.';
  if (password.length < users.MIN_PASSWORD) pwErrors.password = `Tiene que tener al menos ${users.MIN_PASSWORD} caracteres.`;
  else if (password !== String(req.body.password2 || '')) pwErrors.password2 = 'Las contraseñas no coinciden.';

  if (Object.keys(pwErrors).length) return res.status(400).page('account', { title: 'Mi cuenta', form: req.user, errors: {}, pwErrors });

  users.setPassword(req.user.id, password, false);
  req.flash('Cambiaste tu contraseña.');
  res.redirect('/mi-cuenta');
});

module.exports = router;
