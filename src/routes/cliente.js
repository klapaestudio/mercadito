const express = require('express');
const QRCode = require('qrcode');
const { requireRole } = require('../middleware/auth');
const settings = require('../services/settings');
const levels = require('../services/levels');
const benefits = require('../services/benefits');
const notifications = require('../services/notifications');
const events = require('../services/events');

const router = express.Router();
const cliente = requireRole('cliente');

/** URL que codifica el QR: si el cajero la escanea con la cámara del celular, abre la ficha. */
const qrUrl = (req, user) => `${req.protocol}://${req.get('host')}/caja/qr/${user.qr_token}`;

router.get('/inicio', cliente, (req, res) => {
  const u = req.user;
  const active = benefits.activeFor(u.id);
  const upcoming = events.forClient(u).filter((e) => e.mine || e.canBook).slice(0, 2);
  res.page('cliente/home', {
    title: 'Inicio',
    stampsPerCard: settings.get('stamps_per_card'),
    cardPrize: benefits.templateFor('tarjeta_completa'),
    progress: levels.progress(u.total_visits),
    benefits: active,
    upcoming,
    celebration: notifications.takeCelebration(u.id),
  });
});

router.get('/mi-qr', cliente, async (req, res, next) => {
  try {
    const svg = await QRCode.toString(qrUrl(req, req.user), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
    res.page('cliente/qr', { title: 'Mi QR', svg, level: levels.byId(req.user.level_id) });
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
