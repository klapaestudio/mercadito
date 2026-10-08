const db = require('../db');
const time = require('../lib/time');
const levels = require('./levels');
const benefits = require('./benefits');
const notifications = require('./notifications');

const HOUR = 60 * 60 * 1000;

const q = {
  all: db.prepare(`SELECT e.*, COALESCE((SELECT SUM(seats) FROM reservations r WHERE r.event_id = e.id AND r.status = 'activa'), 0) AS taken,
                   (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id AND r.status = 'activa') AS bookings
                   FROM events e ORDER BY e.starts_at ASC`),
  byId: db.prepare(`SELECT e.*, COALESCE((SELECT SUM(seats) FROM reservations r WHERE r.event_id = e.id AND r.status = 'activa'), 0) AS taken
                    FROM events e WHERE e.id = ?`),
  insert: db.prepare(`INSERT INTO events (name, description, starts_at, capacity, max_seats, booking_opens_at, priority_hours, active)
                      VALUES (@name, @description, @starts_at, @capacity, @max_seats, @booking_opens_at, @priority_hours, @active)`),
  update: db.prepare(`UPDATE events SET name = @name, description = @description, starts_at = @starts_at, capacity = @capacity,
                      max_seats = @max_seats, booking_opens_at = @booking_opens_at, priority_hours = @priority_hours, active = @active,
                      priority_notified_at = CASE WHEN booking_opens_at <> @booking_opens_at THEN NULL ELSE priority_notified_at END,
                      public_notified_at = CASE WHEN booking_opens_at <> @booking_opens_at OR priority_hours <> @priority_hours
                                                THEN NULL ELSE public_notified_at END
                      WHERE id = @id`),
  remove: db.prepare('DELETE FROM events WHERE id = ?'),
  myReservation: db.prepare("SELECT * FROM reservations WHERE event_id = ? AND user_id = ? AND status = 'activa'"),
  myReservations: db.prepare("SELECT * FROM reservations WHERE user_id = ? AND status = 'activa'"),
  reservations: db.prepare(`SELECT r.*, u.first_name, u.last_name, u.phone, l.name AS level_name, c.first_name AS cancelled_by_name
                            FROM reservations r JOIN users u ON u.id = r.user_id LEFT JOIN levels l ON l.id = u.level_id
                            LEFT JOIN users c ON c.id = r.cancelled_by
                            WHERE r.event_id = ? ORDER BY r.status ASC, r.created_at ASC`),
  insertRes: db.prepare('INSERT INTO reservations (event_id, user_id, seats) VALUES (?, ?, ?)'),
  resById: db.prepare('SELECT * FROM reservations WHERE id = ?'),
  cancelRes: db.prepare("UPDATE reservations SET status = 'cancelada', cancelled_by = ? WHERE id = ? AND status = 'activa'"),
  userHistory: db.prepare(`SELECT r.*, e.name, e.starts_at FROM reservations r JOIN events e ON e.id = r.event_id
                           WHERE r.user_id = ? ORDER BY e.starts_at DESC LIMIT 30`),
  activeClients: db.prepare("SELECT id FROM users WHERE role = 'cliente' AND active = 1"),
  clientsOfLevel: db.prepare("SELECT id FROM users WHERE role = 'cliente' AND active = 1 AND level_id = ?"),
  setPriorityNotified: db.prepare("UPDATE events SET priority_notified_at = datetime('now') WHERE id = ?"),
  setPublicNotified: db.prepare("UPDATE events SET public_notified_at = datetime('now') WHERE id = ?"),
};

/** Momento en que las reservas se abren a todos (fin de la ventana de prioridad). */
const publicAt = (e) => new Date(time.fromSql(e.booking_opens_at).getTime() + e.priority_hours * HOUR);

/**
 * Estado de un evento:
 *  pasado | inactivo | pronto (todavía no abre) | prioridad (solo nivel más alto) | abierto | lleno
 */
function phase(e, now = new Date()) {
  if (time.fromSql(e.starts_at) <= now) return 'pasado';
  if (!e.active) return 'inactivo';
  if (time.fromSql(e.booking_opens_at) > now) return 'pronto';
  if (e.capacity - e.taken <= 0) return 'lleno';
  if (publicAt(e) > now) return 'prioridad';
  return 'abierto';
}

/** Decora un evento con su estado y la situación del cliente. */
function decorate(e, user) {
  const ph = phase(e);
  const topLevel = levels.top();
  const isTop = !!(user && topLevel && user.level_id === topLevel.id);
  const mine = user ? q.myReservation.get(e.id, user.id) || null : null;
  const left = Math.max(0, e.capacity - e.taken);
  const canBook = !mine && (ph === 'abierto' || (ph === 'prioridad' && isTop));
  return {
    ...e, phase: ph, left, mine, canBook, isTop, topLevelName: topLevel?.name || '',
    publicAt: time.toSql(publicAt(e)), maxSeatsNow: Math.min(e.max_seats, left),
  };
}

const all = () => q.all.all();
const byId = (id) => q.byId.get(id);

/** Eventos visibles para el cliente: activos y futuros. */
function forClient(user) {
  return all().filter((e) => e.active && phase(e) !== 'pasado').map((e) => decorate(e, user));
}

function reserve(user, eventId, seats) {
  return db.transaction(() => {
    const e = byId(eventId);
    if (!e) return { ok: false, error: 'No encontramos el evento.' };
    const d = decorate(e, user);
    if (d.mine) return { ok: false, error: 'Ya tenés una reserva para este evento.' };
    if (d.phase === 'pasado') return { ok: false, error: 'Este evento ya pasó.' };
    if (d.phase === 'pronto') return { ok: false, error: 'Las reservas todavía no abrieron.' };
    if (d.phase === 'lleno') return { ok: false, error: 'No quedan lugares para este evento.' };
    if (d.phase === 'prioridad' && !d.isTop) {
      return { ok: false, error: `Por ahora solo pueden reservar clientes ${d.topLevelName}. Se abre a todos el ${time.fmtDateTime(d.publicAt)}.` };
    }
    if (d.phase !== 'abierto' && d.phase !== 'prioridad') return { ok: false, error: 'Este evento no admite reservas.' };
    const n = Math.floor(Number(seats));
    if (!(n >= 1 && n <= e.max_seats)) return { ok: false, error: `Podés reservar entre 1 y ${e.max_seats} lugares.` };
    if (n > d.left) return { ok: false, error: `Solo quedan ${d.left} lugares.` };

    q.insertRes.run(e.id, user.id, n);
    const given = [];
    for (const tpl of benefits.templatesForEvent(e.id)) {
      const b = benefits.issue(user.id, tpl, { source: 'evento', dedupeKey: `evento:${e.id}:${tpl.id}` });
      if (b) given.push(b);
    }
    return { ok: true, event: e, seats: n, given };
  })();
}

/** Cancela una reserva. Si la cancela el cliente, solo la propia y antes del evento. */
function cancelReservation(resId, byUser) {
  const r = q.resById.get(resId);
  if (!r || r.status !== 'activa') return { ok: false, error: 'La reserva ya no está activa.' };
  if (byUser.role === 'cliente') {
    if (r.user_id !== byUser.id) return { ok: false, error: 'No podés cancelar esta reserva.' };
    const e = byId(r.event_id);
    if (phase(e) === 'pasado') return { ok: false, error: 'El evento ya pasó.' };
  }
  q.cancelRes.run(byUser.id, resId);
  return { ok: true, reservation: r };
}

function validate(body, settings) {
  const data = {
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim(),
    starts_at: time.localInputToSql(body.starts_at),
    capacity: Math.floor(Number(body.capacity)),
    max_seats: Math.floor(Number(body.max_seats || settings.max_seats_default)),
    booking_opens_at: time.localInputToSql(body.booking_opens_at) || time.toSql(new Date()),
    priority_hours: Math.floor(Number(body.priority_hours ?? settings.priority_hours_default)),
    active: body.active === 'on' ? 1 : 0,
  };
  const errors = {};
  if (!data.name) errors.name = 'Poné un nombre.';
  if (!data.starts_at) errors.starts_at = 'Elegí fecha y hora.';
  if (!(data.capacity >= 1)) errors.capacity = 'El cupo tiene que ser 1 o más.';
  if (!(data.max_seats >= 1)) errors.max_seats = 'Tiene que ser 1 o más.';
  if (!(data.priority_hours >= 0)) errors.priority_hours = 'Tiene que ser 0 o más.';
  if (data.starts_at && data.booking_opens_at > data.starts_at) errors.booking_opens_at = 'Las reservas tienen que abrir antes del evento.';
  return { data, errors };
}

function save(id, data) {
  if (id) { q.update.run({ ...data, id }); return id; }
  return q.insert.run(data).lastInsertRowid;
}

const remove = (id) => q.remove.run(id);
const reservations = (eventId) => q.reservations.all(eventId);
const userHistory = (userId) => q.userHistory.all(userId);

/**
 * Avisos automáticos: cuando abre la ventana de prioridad (al nivel más alto)
 * y cuando se abre a todos. Se llama cada hora y al arrancar.
 */
function notifyOpenings() {
  const now = new Date();
  const topLevel = levels.top();
  let sent = 0;
  for (const e of all()) {
    if (!e.active || phase(e) === 'pasado') continue;
    const opens = time.fromSql(e.booking_opens_at);
    if (opens > now) continue;
    const when = time.fmtDateTime(e.starts_at);

    if (!e.priority_notified_at && e.priority_hours > 0 && publicAt(e) > now && topLevel) {
      for (const { id } of q.clientsOfLevel.all(topLevel.id)) {
        notifications.notify(id, {
          type: 'evento', drawing: 1,
          title: `Prioridad ${topLevel.name}: ${e.name}`,
          body: `Por ser ${topLevel.name} podés reservar antes que nadie (${when}).`,
        });
        sent++;
      }
      q.setPriorityNotified.run(e.id);
    }

    if (!e.public_notified_at && publicAt(e) <= now) {
      if (e.capacity - e.taken > 0) {
        for (const { id } of q.activeClients.all()) {
          notifications.notify(id, {
            type: 'evento', drawing: 2,
            title: `Nuevo evento: ${e.name}`,
            body: `Ya podés reservar tu lugar desde Eventos (${when}).`,
          });
          sent++;
        }
      }
      if (!e.priority_notified_at) q.setPriorityNotified.run(e.id);
      q.setPublicNotified.run(e.id);
    }
  }
  return sent;
}

module.exports = {
  phase, decorate, all, byId, forClient, reserve, cancelReservation, validate, save, remove,
  reservations, userHistory, notifyOpenings, publicAt,
};
