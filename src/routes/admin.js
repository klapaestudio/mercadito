const express = require('express');
const db = require('../db');
const time = require('../lib/time');
const { requireRole } = require('../middleware/auth');
const settings = require('../services/settings');
const levels = require('../services/levels');
const benefits = require('../services/benefits');
const clients = require('../services/clients');
const visits = require('../services/visits');
const events = require('../services/events');
const users = require('../services/users');
const notifications = require('../services/notifications');
const cron = require('../services/cron');

const router = express.Router();
router.use('/admin', requireRole('admin'));

const int = (v, def = null) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && String(v).trim() !== '' ? n : def;
};
const wide = { wide: true };

/* ---------- Resumen ---------- */

router.get('/admin', (req, res) => {
  const today = time.today();
  const monthStart = `${today.slice(0, 7)}-01`;
  const one = (sql, ...p) => db.prepare(sql).get(...p).n;
  const stats = {
    clients: one("SELECT COUNT(*) AS n FROM users WHERE role = 'cliente'"),
    newThisMonth: one("SELECT COUNT(*) AS n FROM users WHERE role = 'cliente' AND created_at >= ?", `${monthStart} 03:00:00`),
    visitsMonth: one('SELECT COUNT(*) AS n FROM visits WHERE local_date >= ?', monthStart),
    visitsToday: one('SELECT COUNT(*) AS n FROM visits WHERE local_date = ?', today),
    redeemedMonth: one("SELECT COUNT(*) AS n FROM benefits WHERE status = 'canjeado' AND redeemed_at >= ?", `${monthStart} 03:00:00`),
    activeBenefits: one("SELECT COUNT(*) AS n FROM benefits WHERE status = 'activo' AND expires_at >= ?", today),
  };
  const byLevel = db.prepare(`SELECT l.id, l.name, COUNT(u.id) AS n FROM levels l
                              LEFT JOIN users u ON u.level_id = l.id AND u.role = 'cliente'
                              GROUP BY l.id ORDER BY l.min_visits`).all();
  const upcoming = events.all().map((e) => events.decorate(e, null)).filter((e) => e.phase !== 'pasado' && e.active).slice(0, 4);
  res.page('admin/summary', {
    title: 'Resumen', ...wide, stats, byLevel, birthdays: clients.birthdaysThisWeek(), upcoming,
    lastRun: cron.lastDailyRun(),
  });
});

/* ---------- Clientes ---------- */

router.get('/admin/clientes', (req, res) => {
  const f = {
    q: String(req.query.q || ''), level: String(req.query.level || ''),
    birthdayMonth: req.query.cumple === 'mes' ? time.today().slice(5, 7) : '',
    cumple: req.query.cumple === 'mes' ? 'mes' : '',
    inactiveDays: String(req.query.sin_visitas || ''),
  };
  const page = Math.max(1, int(req.query.p, 1));
  const perPage = 50;
  const { total, rows } = clients.search({ ...f, limit: perPage, offset: (page - 1) * perPage });
  res.page('admin/clients', {
    title: 'Clientes', ...wide, f, rows, total, page, pages: Math.max(1, Math.ceil(total / perPage)),
    levels: levels.all(), query: req.query,
  });
});

router.get('/admin/clientes/:id', (req, res) => {
  const c = clients.byId(Number(req.params.id));
  if (!c) return res.status(404).page('error', { title: 'No encontrado', message: 'No encontramos a este cliente.' });
  const temp = req.session.tempPassword;
  delete req.session.tempPassword;
  res.page('admin/client', {
    title: users.fullName(c), ...wide, c,
    stampsPerCard: settings.get('stamps_per_card'),
    progress: levels.progress(c.total_visits),
    visits: visits.forUser(c.id, 100),
    active: benefits.activeFor(c.id),
    history: benefits.historyFor(c.id),
    reservations: events.userHistory(c.id),
    templates: benefits.templates().filter((t) => t.active),
    daysLeft: benefits.daysLeft,
    tempPassword: temp?.id === c.id ? temp.value : null,
  });
});

router.post('/admin/clientes/:id/beneficio', (req, res) => {
  const c = clients.byId(Number(req.params.id));
  const tpl = benefits.template(int(req.body.template_id));
  if (c && tpl) {
    const b = benefits.issue(c.id, tpl, { source: 'manual' });
    notifications.notify(c.id, {
      type: 'beneficio', drawing: 1, title: 'Tenés un regalo',
      body: `Te otorgamos: ${b.title}. Válido hasta el ${time.fmtDate(b.expires_at)}.`,
    });
    req.flash(`Otorgaste "${b.title}" a ${c.first_name}.`);
  }
  res.redirect(`/admin/clientes/${req.params.id}`);
});

router.post('/admin/clientes/:id/estado', (req, res) => {
  const active = req.body.active === '1';
  clients.setActive(Number(req.params.id), active);
  req.flash(active ? 'Cuenta reactivada.' : 'Cuenta desactivada. El cliente ya no puede ingresar.');
  res.redirect(`/admin/clientes/${req.params.id}`);
});

/* ---------- Sellos ---------- */

router.get('/admin/sellos', (req, res) => {
  res.page('admin/stamps', { title: 'Sellos', cfg: settings.all(), tpl: benefits.anyTemplateFor('tarjeta_completa'), errors: {} });
});

router.post('/admin/sellos', (req, res) => {
  const n = int(req.body.stamps_per_card);
  const validity = int(req.body.validity_days);
  const name = String(req.body.prize_name || '').trim();
  const errors = {};
  if (!(n >= 2 && n <= 30)) errors.stamps_per_card = 'Entre 2 y 30 sellos.';
  if (!name) errors.prize_name = 'Poné el premio.';
  if (!(validity >= 1)) errors.validity_days = 'Al menos 1 día.';
  const tpl = benefits.anyTemplateFor('tarjeta_completa');
  if (Object.keys(errors).length) {
    return res.status(400).page('admin/stamps', { title: 'Sellos', cfg: { ...settings.all(), ...req.body }, tpl: { ...tpl, name, validity_days: req.body.validity_days, description: req.body.prize_description }, errors });
  }
  settings.set({ stamps_per_card: n, one_stamp_per_day: req.body.one_stamp_per_day === 'on' });
  benefits.saveTemplate({
    id: tpl?.id, name, description: String(req.body.prize_description || '').trim(),
    validity_days: validity, trigger: 'tarjeta_completa', active: true,
  });
  req.flash('Guardamos la configuración de sellos.');
  res.redirect('/admin/sellos');
});

/* ---------- Niveles ---------- */

const levelForm = (body) => ({
  name: String(body.name || '').trim(),
  min_visits: int(body.min_visits),
  perks: String(body.perks || '').trim(),
});

function levelErrors(data, id) {
  if (!data.name) return 'Poné un nombre para el nivel.';
  if (!(data.min_visits >= 0)) return 'Las visitas necesarias tienen que ser 0 o más.';
  const list = levels.all().filter((l) => l.id !== id);
  if (list.some((l) => l.min_visits === data.min_visits)) return 'Ya hay otro nivel con esa cantidad de visitas.';
  if (data.min_visits !== 0 && !list.some((l) => l.min_visits === 0)) return 'El primer nivel tiene que empezar en 0 visitas.';
  return null;
}

router.get('/admin/niveles', (req, res) => {
  const counts = Object.fromEntries(db.prepare("SELECT level_id, COUNT(*) AS n FROM users WHERE role = 'cliente' GROUP BY level_id").all().map((r) => [r.level_id, r.n]));
  const tpls = benefits.templates().filter((t) => t.trigger === 'subir_nivel');
  res.page('admin/levels', { title: 'Niveles', ...wide, list: levels.all(), counts, tpls });
});

router.post('/admin/niveles', (req, res) => {
  const data = levelForm(req.body);
  const err = levelErrors(data, null);
  if (err) req.flash(err, 'error');
  else { levels.create(data); req.flash(`Creaste el nivel ${data.name}.`); }
  res.redirect('/admin/niveles');
});

router.post('/admin/niveles/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = levelForm(req.body);
  const err = levelErrors(data, id);
  if (err) req.flash(err, 'error');
  else { levels.update(id, data); req.flash(`Guardaste ${data.name}. Recalculamos el nivel de todos los clientes.`); }
  res.redirect('/admin/niveles');
});

router.post('/admin/niveles/:id/eliminar', (req, res) => {
  const id = Number(req.params.id);
  const l = levels.byId(id);
  if (l && l.min_visits === 0) req.flash('No podés eliminar el nivel inicial.', 'error');
  else if (l) { levels.remove(id); req.flash(`Eliminaste ${l.name}.`); }
  res.redirect('/admin/niveles');
});

/* ---------- Beneficios ---------- */

router.get('/admin/beneficios', (req, res) => {
  const counts = Object.fromEntries(db.prepare(`SELECT template_id, COUNT(*) AS n FROM benefits WHERE status = 'activo'
                                                AND expires_at >= ? GROUP BY template_id`).all(time.today()).map((r) => [r.template_id, r.n]));
  res.page('admin/benefits', { title: 'Beneficios', ...wide, list: benefits.templates(), counts, TRIGGERS: benefits.TRIGGERS });
});

const benefitFormLocals = (tpl, errors = {}) => ({
  title: tpl.id ? 'Editar beneficio' : 'Nuevo beneficio', tpl, errors,
  TRIGGERS: benefits.TRIGGERS, levels: levels.all(),
  events: events.all().filter((e) => events.phase(e) !== 'pasado' || e.id === tpl.event_id),
});

router.get('/admin/beneficios/nuevo', (req, res) => {
  res.page('admin/benefit-form', benefitFormLocals({ trigger: 'manual', validity_days: 30, active: 1 }));
});

router.get('/admin/beneficios/:id', (req, res) => {
  const tpl = benefits.template(Number(req.params.id));
  if (!tpl) return res.redirect('/admin/beneficios');
  res.page('admin/benefit-form', benefitFormLocals(tpl));
});

router.post('/admin/beneficios', (req, res) => {
  const tpl = {
    id: int(req.body.id) || undefined,
    name: String(req.body.name || '').trim(),
    description: String(req.body.description || '').trim(),
    validity_days: int(req.body.validity_days),
    trigger: String(req.body.trigger || ''),
    level_id: int(req.body.level_id),
    event_id: int(req.body.event_id),
    active: req.body.active === 'on' ? 1 : 0,
  };
  const errors = {};
  if (!tpl.name) errors.name = 'Poné un nombre.';
  if (!(tpl.validity_days >= 0)) errors.validity_days = 'Indicá los días de vigencia.';
  if (!benefits.TRIGGERS[tpl.trigger]) errors.trigger = 'Elegí cuándo se otorga.';
  if (tpl.trigger === 'subir_nivel' && !tpl.level_id) errors.level_id = 'Elegí el nivel.';
  if (tpl.trigger === 'evento' && !tpl.event_id) errors.event_id = 'Elegí el evento.';
  if (tpl.trigger !== 'subir_nivel') tpl.level_id = null;
  if (tpl.trigger !== 'evento') tpl.event_id = null;
  if (Object.keys(errors).length) return res.status(400).page('admin/benefit-form', benefitFormLocals(tpl, errors));

  // Tarjeta completa, cumpleaños y te extrañamos usan una sola plantilla activa
  if (tpl.active && ['tarjeta_completa', 'cumpleanos', 'te_extranamos'].includes(tpl.trigger)) {
    db.prepare('UPDATE benefit_templates SET active = 0 WHERE trigger = ? AND id <> ?').run(tpl.trigger, tpl.id || 0);
  }
  benefits.saveTemplate(tpl);
  req.flash(`Guardaste el beneficio "${tpl.name}".`);
  res.redirect('/admin/beneficios');
});

/* ---------- Cumpleaños y Te extrañamos ---------- */

router.get('/admin/automaticos', (req, res) => {
  res.page('admin/automatic', {
    title: 'Cumpleaños y Te extrañamos', cfg: settings.all(),
    bday: benefits.anyTemplateFor('cumpleanos'), miss: benefits.anyTemplateFor('te_extranamos'),
    lastRun: cron.lastDailyRun(), errors: {},
  });
});

router.post('/admin/automaticos', (req, res) => {
  const b = req.body;
  const days = int(b.miss_you_days);
  const missValidity = int(b.miss_validity_days);
  if (!(days >= 1) || !(missValidity >= 1) || !String(b.bday_name || '').trim() || !String(b.miss_name || '').trim()) {
    req.flash('Revisá los datos: nombres completos y días mayores a 0.', 'error');
    return res.redirect('/admin/automaticos');
  }
  settings.set({
    birthday_enabled: b.birthday_enabled === 'on',
    miss_you_enabled: b.miss_you_enabled === 'on',
    miss_you_days: days,
  });
  const bday = benefits.anyTemplateFor('cumpleanos');
  benefits.saveTemplate({ id: bday?.id, name: b.bday_name.trim(), description: String(b.bday_description || '').trim(), validity_days: 7, trigger: 'cumpleanos', active: true });
  const miss = benefits.anyTemplateFor('te_extranamos');
  benefits.saveTemplate({ id: miss?.id, name: b.miss_name.trim(), description: String(b.miss_description || '').trim(), validity_days: missValidity, trigger: 'te_extranamos', active: true });
  req.flash('Guardamos la configuración.');
  res.redirect('/admin/automaticos');
});

router.post('/admin/automaticos/ejecutar', (req, res) => {
  const r = cron.runDaily();
  req.flash(`Tareas ejecutadas: ${r.cumpleanos} de cumpleaños, ${r.te_extranamos} "te extrañamos", ${r.vencidos} vencidos, ${r.eventos} avisos de eventos.`);
  res.redirect(req.body.back === 'resumen' ? '/admin' : '/admin/automaticos');
});

/* ---------- Eventos ---------- */

router.get('/admin/eventos', (req, res) => {
  const list = events.all().map((e) => events.decorate(e, null));
  res.page('admin/events', {
    title: 'Eventos', ...wide,
    upcoming: list.filter((e) => e.phase !== 'pasado'),
    past: list.filter((e) => e.phase === 'pasado').reverse(),
  });
});

const eventFormLocals = (ev, errors = {}) => ({ title: ev.id ? 'Editar evento' : 'Nuevo evento', ev, errors, topLevel: levels.top() });

router.get('/admin/eventos/nuevo', (req, res) => {
  const cfg = settings.all();
  res.page('admin/event-form', eventFormLocals({
    capacity: 20, max_seats: cfg.max_seats_default, priority_hours: cfg.priority_hours_default, active: 1,
    booking_opens_at_input: time.sqlToLocalInput(time.toSql(new Date())), starts_at_input: '',
  }));
});

router.get('/admin/eventos/:id', (req, res) => {
  const e = events.byId(Number(req.params.id));
  if (!e) return res.redirect('/admin/eventos');
  res.page('admin/event', {
    title: e.name, ...wide, ev: events.decorate(e, null), reservations: events.reservations(e.id),
  });
});

router.get('/admin/eventos/:id/editar', (req, res) => {
  const e = events.byId(Number(req.params.id));
  if (!e) return res.redirect('/admin/eventos');
  res.page('admin/event-form', eventFormLocals({
    ...e, starts_at_input: time.sqlToLocalInput(e.starts_at), booking_opens_at_input: time.sqlToLocalInput(e.booking_opens_at),
  }));
});

router.post('/admin/eventos', (req, res) => {
  const id = int(req.body.id);
  const { data, errors } = events.validate(req.body, settings.all());
  if (Object.keys(errors).length) {
    return res.status(400).page('admin/event-form', eventFormLocals({
      ...data, id, starts_at_input: req.body.starts_at, booking_opens_at_input: req.body.booking_opens_at,
    }, errors));
  }
  const savedId = events.save(id, data);
  events.notifyOpenings();
  req.flash(id ? 'Guardaste los cambios del evento.' : `Creaste el evento ${data.name}.`);
  res.redirect(`/admin/eventos/${savedId}`);
});

router.post('/admin/eventos/:id/eliminar', (req, res) => {
  events.remove(Number(req.params.id));
  req.flash('Eliminaste el evento y sus reservas.');
  res.redirect('/admin/eventos');
});

router.post('/admin/reservas/:id/cancelar', (req, res) => {
  const r = events.cancelReservation(Number(req.params.id), req.user);
  if (r.ok) {
    const e = events.byId(r.reservation.event_id);
    notifications.notify(r.reservation.user_id, {
      type: 'evento', drawing: 2, title: 'Tu reserva fue cancelada',
      body: `Cancelamos tu reserva para ${e.name}. Si tenés dudas, consultá en el mostrador.`,
    });
    req.flash('Reserva cancelada. Le avisamos al cliente.');
  } else req.flash(r.error, 'error');
  res.redirect(`/admin/eventos/${r.reservation?.event_id || req.body.event_id}`);
});

/* ---------- Usuarios del sistema ---------- */

router.get('/admin/usuarios', (req, res) => {
  const list = db.prepare("SELECT * FROM users WHERE role IN ('cajero','admin') ORDER BY active DESC, role, first_name").all();
  const temp = req.session.tempPassword;
  delete req.session.tempPassword;
  res.page('admin/users', { title: 'Usuarios del sistema', ...wide, list, temp });
});

router.get('/admin/usuarios/nuevo', (req, res) => {
  res.page('admin/user-form', { title: 'Nuevo usuario', u: { role: 'cajero', active: 1 }, errors: {} });
});

router.get('/admin/usuarios/:id', (req, res) => {
  const u = users.findById(Number(req.params.id));
  if (!u || u.role === 'cliente') return res.redirect('/admin/usuarios');
  res.page('admin/user-form', { title: 'Editar usuario', u, errors: {} });
});

const activeAdmins = () => db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").get().n;

router.post('/admin/usuarios', (req, res) => {
  const id = int(req.body.id);
  const existing = id ? users.findById(id) : null;
  const u = {
    id,
    first_name: String(req.body.first_name || '').trim(),
    last_name: String(req.body.last_name || '').trim(),
    username: String(req.body.username || '').trim().toLowerCase(),
    role: req.body.role === 'admin' ? 'admin' : 'cajero',
    active: req.body.active === 'on' ? 1 : 0,
  };
  const errors = {};
  if (!u.first_name) errors.first_name = 'Poné el nombre.';
  if (!existing) {
    if (!/^[a-z0-9._-]{3,30}$/.test(u.username)) errors.username = 'Entre 3 y 30 caracteres: letras, números, punto o guion.';
    else if (/^\d+$/.test(u.username)) errors.username = 'Que no sea solo números (eso se reserva para celulares de clientes).';
    else if (users.findForLogin(u.username)) errors.username = 'Ese usuario ya existe.';
  }
  if (existing && existing.role === 'admin' && existing.active && (u.role !== 'admin' || !u.active) && activeAdmins() <= 1) {
    errors.role = 'Tiene que quedar al menos un admin activo.';
  }
  if (existing && existing.id === req.user.id && (!u.active || u.role !== 'admin')) {
    errors.role = 'No podés quitarte el rol de admin ni desactivarte a vos mismo.';
  }
  if (Object.keys(errors).length) {
    return res.status(400).page('admin/user-form', { title: id ? 'Editar usuario' : 'Nuevo usuario', u: { ...existing, ...u }, errors });
  }

  if (existing) {
    db.prepare("UPDATE users SET first_name = ?, last_name = ?, role = ?, active = ?, updated_at = datetime('now') WHERE id = ?")
      .run(u.first_name, u.last_name, u.role, u.active, id);
    req.flash(`Guardaste a ${u.first_name}.`);
  } else {
    const created = users.createStaff({ ...u, password: 'x', must_change_password: 1 });
    req.session.tempPassword = { id: created.id, value: users.resetPassword(created.id), username: created.username };
  }
  res.redirect('/admin/usuarios');
});

router.post('/admin/usuarios/:id/resetear-clave', (req, res) => {
  const u = users.findById(Number(req.params.id));
  if (u && u.role !== 'cliente') {
    req.session.tempPassword = { id: u.id, value: users.resetPassword(u.id), username: u.username };
  }
  res.redirect('/admin/usuarios');
});

module.exports = router;
