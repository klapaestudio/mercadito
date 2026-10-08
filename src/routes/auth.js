const express = require('express');
const users = require('../services/users');
const guard = require('../services/login-guard');
const time = require('../lib/time');
const { homeFor, requireLogin } = require('../middleware/auth');

const router = express.Router();

/** Inicia sesión regenerando el id (evita fijación de sesión). */
function startSession(req, user, cb) {
  req.session.regenerate((err) => {
    if (err) return cb(err);
    req.session.userId = user.id;
    req.session.save(cb);
  });
}

router.get('/', (req, res) => {
  if (req.user) return res.redirect(homeFor(req.user));
  res.page('auth/login', { title: 'Ingresar', layout: 'auth', form: {} });
});

router.get('/ingresar', (req, res) => res.redirect('/'));

router.post('/ingresar', (req, res, next) => {
  const username = String(req.body.usuario || '').trim();
  const password = String(req.body.password || '');
  const fail = (error) => res.status(400).page('auth/login', {
    title: 'Ingresar', layout: 'auth', form: { usuario: username }, error,
  });

  const locked = guard.lockedMinutes(username, req.ip);
  if (locked) {
    return fail(`Hubo demasiados intentos. Probá de nuevo en ${locked} minuto${locked === 1 ? '' : 's'}.`);
  }

  const user = users.findForLogin(username);
  if (!user || !user.active || !users.verify(password, user.password_hash)) {
    guard.registerFailure(username, req.ip);
    return fail('El usuario o la contraseña no son correctos.');
  }

  guard.registerSuccess(username);
  startSession(req, user, (err) => {
    if (err) return next(err);
    res.redirect(user.must_change_password ? '/cambiar-clave' : homeFor(user));
  });
});

router.post('/salir', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('mds.sid');
    res.redirect('/');
  });
});

/* ---------- Registro de clientes ---------- */

router.get('/registro', (req, res) => {
  if (req.user) return res.redirect(homeFor(req.user));
  res.page('auth/register', { title: 'Creá tu cuenta', layout: 'auth', form: {}, errors: {} });
});

function validateRegistration(body) {
  const form = {
    first_name: String(body.first_name || '').trim(),
    last_name: String(body.last_name || '').trim(),
    phone: String(body.phone || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    birthday: String(body.birthday || '').trim(),
    consent: body.consent === 'on',
  };
  const password = String(body.password || '');
  const errors = {};

  if (!form.first_name) errors.first_name = 'Contanos tu nombre.';
  if (!form.last_name) errors.last_name = 'Contanos tu apellido.';

  const digits = users.normalizePhone(form.phone);
  if (!users.isValidPhone(digits)) errors.phone = 'Ingresá tu celular con código de área, solo números (ej: 1155551234).';
  else if (users.findForLogin(digits)) errors.phone = 'Ya hay una cuenta con este celular. Si no recordás la contraseña, pedí que te la reseteen en el mostrador.';

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Revisá el email.';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthday)) errors.birthday = 'Ingresá tu fecha de cumpleaños.';
  else {
    const year = Number(form.birthday.slice(0, 4));
    if (year < 1900 || form.birthday > time.today()) errors.birthday = 'Revisá la fecha de cumpleaños.';
  }

  if (password.length < users.MIN_PASSWORD) errors.password = `La contraseña tiene que tener al menos ${users.MIN_PASSWORD} caracteres.`;
  else if (password !== String(body.password2 || '')) errors.password2 = 'Las contraseñas no coinciden.';

  if (!form.consent) errors.consent = 'Necesitamos tu consentimiento para crear la cuenta.';

  return { form, digits, password, errors };
}

router.post('/registro', (req, res, next) => {
  if (req.user) return res.redirect(homeFor(req.user));
  const { form, digits, password, errors } = validateRegistration(req.body);

  if (Object.keys(errors).length) {
    return res.status(400).page('auth/register', { title: 'Creá tu cuenta', layout: 'auth', form, errors });
  }

  const user = users.createClient({ ...form, phone: digits, password });
  startSession(req, user, (err) => {
    if (err) return next(err);
    req.flash('¡Bienvenido/a a Mercadito de Sabores! Ya podés empezar a sumar sellos.');
    res.redirect('/inicio');
  });
});

/* ---------- Cambio obligatorio de contraseña (después de un reseteo) ---------- */

router.get('/cambiar-clave', requireLogin, (req, res) => {
  if (!req.user.must_change_password) return res.redirect(homeFor(req.user));
  res.page('auth/change-password', { title: 'Creá tu nueva contraseña', layout: 'auth', errors: {} });
});

router.post('/cambiar-clave', requireLogin, (req, res) => {
  if (!req.user.must_change_password) return res.redirect(homeFor(req.user));
  const password = String(req.body.password || '');
  const errors = {};
  if (password.length < users.MIN_PASSWORD) errors.password = `Tiene que tener al menos ${users.MIN_PASSWORD} caracteres.`;
  else if (password !== String(req.body.password2 || '')) errors.password2 = 'Las contraseñas no coinciden.';
  else if (users.verify(password, req.user.password_hash)) errors.password = 'Elegí una contraseña distinta a la temporal.';

  if (Object.keys(errors).length) {
    return res.status(400).page('auth/change-password', { title: 'Creá tu nueva contraseña', layout: 'auth', errors });
  }

  users.setPassword(req.user.id, password, false);
  req.flash('Listo, tu contraseña quedó actualizada.');
  res.redirect(homeFor(req.user));
});

router.get('/privacidad', (req, res) => {
  res.page('auth/privacy', { title: 'Uso de datos personales', layout: req.user ? 'app' : 'auth' });
});

module.exports = router;
