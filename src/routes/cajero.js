const express = require('express');
const { requireRole } = require('../middleware/auth');
const clients = require('../services/clients');
const visits = require('../services/visits');
const benefits = require('../services/benefits');
const settings = require('../services/settings');
const levels = require('../services/levels');
const users = require('../services/users');

const router = express.Router();
const staff = requireRole('cajero', 'admin');

router.get('/caja', staff, (req, res) => {
  const q = String(req.query.q || '').trim();
  const results = q.length >= 2 ? clients.search({ q, limit: 20 }).rows : null;
  res.page('cajero/index', { title: 'Cargar visita', q, results, scripts: ['/vendor/html5-qrcode.min.js', '/js/scanner.js'] });
});

/** Destino del QR del cliente. */
router.get('/caja/qr/:token', staff, (req, res) => {
  const c = clients.byQrToken(req.params.token);
  if (!c) {
    req.flash('Ese QR no corresponde a ningún cliente.', 'error');
    return res.redirect('/caja');
  }
  res.redirect(`/caja/cliente/${c.id}`);
});

router.get('/caja/cliente/:id', staff, (req, res) => {
  const c = clients.byId(Number(req.params.id));
  if (!c) return res.status(404).page('error', { title: 'No encontrado', message: 'No encontramos a este cliente.' });
  const cfg = settings.all();
  const temp = req.session.tempPassword;
  delete req.session.tempPassword;
  res.page('cajero/client', {
    title: users.fullName(c),
    c,
    stampsPerCard: cfg.stamps_per_card,
    blockedToday: cfg.one_stamp_per_day && visits.visitedToday(c.id),
    progress: levels.progress(c.total_visits),
    benefits: benefits.activeFor(c.id),
    daysLeft: benefits.daysLeft,
    tempPassword: temp?.id === c.id ? temp.value : null,
  });
});

router.post('/caja/cliente/:id/visita', staff, (req, res) => {
  const id = Number(req.params.id);
  const r = visits.add(id, req.user.id);
  if (!r.ok) req.flash(r.error, 'error');
  else {
    const msgs = [`Visita sumada. Lleva ${r.total} visitas.`];
    if (r.cardCompleted) msgs.push(`¡Completó la tarjeta!${r.cardCompleted.title ? ` Ganó: ${r.cardCompleted.title}.` : ''}`);
    if (r.levelUp) msgs.push(`¡Subió a ${r.levelUp.name}!`);
    req.flash(msgs.join(' '), r.cardCompleted || r.levelUp ? 'celebrate' : 'ok');
  }
  res.redirect(`/caja/cliente/${id}`);
});

router.post('/caja/beneficio/:id/canjear', staff, (req, res) => {
  const b = benefits.byId(Number(req.params.id));
  if (!b) return res.redirect('/caja');
  if (benefits.redeem(b.id, req.user.id)) req.flash(`Canjeado: ${b.title}.`);
  else req.flash('Este beneficio ya no se puede canjear (ya se usó o venció).', 'error');
  res.redirect(req.body.back === 'admin' ? `/admin/clientes/${b.user_id}` : `/caja/cliente/${b.user_id}`);
});

router.post('/caja/cliente/:id/resetear-clave', staff, (req, res) => {
  const c = clients.byId(Number(req.params.id));
  if (!c) return res.redirect('/caja');
  req.session.tempPassword = { id: c.id, value: users.resetPassword(c.id) };
  res.redirect(req.body.back === 'admin' ? `/admin/clientes/${c.id}` : `/caja/cliente/${c.id}`);
});

module.exports = router;
