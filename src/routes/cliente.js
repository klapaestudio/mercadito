const express = require('express');
const QRCode = require('qrcode');
const { requireRole } = require('../middleware/auth');
const settings = require('../services/settings');
const levels = require('../services/levels');
const benefits = require('../services/benefits');
const notifications = require('../services/notifications');
const events = require('../services/events');
const time = require('../lib/time');

const router = express.Router();
const cliente = requireRole('cliente');

/** URL que codifica el QR: si el cajero la escanea con la cámara del celular, abre la ficha. */
const qrUrl = (req, user) => `${req.protocol}://${req.get('host')}/caja/qr/${user.qr_token}`;

/**
 * Festejo a mostrar en el inicio: primero los pendientes (tarjeta completa, nivel, etc.).
 * Además, mientras tenga el regalo de cumpleaños sin usar y sin vencer,
 * se lo recordamos cada vez que inicia sesión.
 */
function celebrationFor(req) {
  const pending = notifications.takeCelebration(req.user.id);
  if (pending) {
    if (pending.type === 'cumpleanos') delete req.session.justLoggedIn;
    return pending;
  }
  if (!req.session.justLoggedIn) return null;
  delete req.session.justLoggedIn;

  const gift = benefits.activeBirthday(req.user.id);
  if (!gift) return null;
  return {
    type: 'cumpleanos',
    drawing: 3,
    title: `¡Feliz cumpleaños, ${req.user.first_name}!`,
    body: `Te espera un regalo: ${gift.title}. Válido hasta el ${time.fmtDate(gift.expires_at)}. Mostrá tu QR en caja para usarlo.`,
  };
}

router.get('/inicio', cliente, (req, res) => {
  const u = req.user;
  const previewWelcome = !require('../config').isProd && req.query.bienvenida === '1';
  const justLoggedIn = !!req.session.justLoggedIn;
  const celebration = previewWelcome ? null : celebrationFor(req);
  delete req.session.justLoggedIn;
  const welcome = previewWelcome || (justLoggedIn && !celebration);
  const active = benefits.activeFor(u.id);
  const upcoming = events.forClient(u).filter((e) => e.mine || e.canBook).slice(0, 2);
  res.page('cliente/home', {
    title: 'Inicio',
    stampsPerCard: settings.get('stamps_per_card'),
    cardPrize: benefits.templateFor('tarjeta_completa'),
    progress: levels.progress(u.total_visits),
    benefits: active,
    upcoming,
    birthday: benefits.activeBirthday(u.id),
    celebration,
    welcome,
  });
});

router.get('/mi-qr', cliente, async (req, res, next) => {
  try {
    const svg = await QRCode.toString(qrUrl(req, req.user), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
    res.page('cliente/qr', { title: 'Mi QR', svg, level: levels.byId(req.user.level_id), jar: levels.progress(req.user.total_visits).jar });
  } catch (err) { next(err); }
});

router.get('/beneficios', cliente, (req, res) => {
  res.page('cliente/benefits', {
    title: 'Beneficios',
    active: benefits.activeFor(req.user.id),
    history: benefits.historyFor(req.user.id),
    daysLeft: benefits.daysLeft,
  });
});

router.get('/notificaciones', cliente, (req, res) => {
  const list = notifications.list(req.user.id);
  notifications.markAllRead(req.user.id);
  res.locals.unread = 0;
  res.page('cliente/notifications', { title: 'Notificaciones', list });
});

router.get('/eventos', cliente, (req, res) => {
  const past = events.userHistory(req.user.id).filter((r) => r.status === 'activa' && new Date(r.starts_at.replace(' ', 'T') + 'Z') < new Date());
  res.page('cliente/events', { title: 'Eventos', list: events.forClient(req.user), past });
});

router.post('/eventos/:id/reservar', cliente, (req, res) => {
  const r = events.reserve(req.user, Number(req.params.id), req.body.seats);
  if (!r.ok) req.flash(r.error, 'error');
  else {
    const extra = r.given.length ? ` Además te regalamos: ${r.given.map((b) => b.title).join(', ')}.` : '';
    req.flash(`¡Listo! Reservaste ${r.seats} lugar${r.seats > 1 ? 'es' : ''} para ${r.event.name}.${extra}`);
  }
  res.redirect('/eventos');
});

router.post('/reservas/:id/cancelar', cliente, (req, res) => {
  const r = events.cancelReservation(Number(req.params.id), req.user);
  req.flash(r.ok ? 'Cancelaste tu reserva.' : r.error, r.ok ? 'ok' : 'error');
  res.redirect('/eventos');
});

module.exports = router;
