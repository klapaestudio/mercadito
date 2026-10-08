const db = require('../db');
const time = require('../lib/time');

const TRIGGERS = {
  tarjeta_completa: 'Tarjeta completa',
  subir_nivel: 'Al subir de nivel',
  cumpleanos: 'Cumpleaños',
  te_extranamos: 'Te extrañamos',
  evento: 'Al reservar un evento',
  manual: 'Manual (lo otorga el admin)',
};

const q = {
  tplAll: db.prepare(`SELECT t.*, l.name AS level_name, e.name AS event_name FROM benefit_templates t
                      LEFT JOIN levels l ON l.id = t.level_id LEFT JOIN events e ON e.id = t.event_id
                      ORDER BY t.active DESC, t.trigger, t.name`),
  tplById: db.prepare('SELECT * FROM benefit_templates WHERE id = ?'),
  tplByTrigger: db.prepare('SELECT * FROM benefit_templates WHERE trigger = ? AND active = 1 ORDER BY id LIMIT 1'),
  tplAnyByTrigger: db.prepare('SELECT * FROM benefit_templates WHERE trigger = ? ORDER BY active DESC, id LIMIT 1'),
  tplForLevel: db.prepare("SELECT * FROM benefit_templates WHERE trigger = 'subir_nivel' AND level_id = ? AND active = 1"),
  tplForEvent: db.prepare("SELECT * FROM benefit_templates WHERE trigger = 'evento' AND event_id = ? AND active = 1"),
  tplInsert: db.prepare(`INSERT INTO benefit_templates (name, description, validity_days, trigger, level_id, event_id, active)
                         VALUES (@name, @description, @validity_days, @trigger, @level_id, @event_id, @active)`),
  tplUpdate: db.prepare(`UPDATE benefit_templates SET name = @name, description = @description, validity_days = @validity_days,
                         trigger = @trigger, level_id = @level_id, event_id = @event_id, active = @active WHERE id = @id`),
  insert: db.prepare(`INSERT OR IGNORE INTO benefits (user_id, template_id, title, description, source, dedupe_key, expires_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`),
  byId: db.prepare('SELECT * FROM benefits WHERE id = ?'),
  active: db.prepare("SELECT * FROM benefits WHERE user_id = ? AND status = 'activo' AND expires_at >= ? ORDER BY expires_at ASC"),
  history: db.prepare(`SELECT b.*, u.first_name AS redeemed_by_name FROM benefits b LEFT JOIN users u ON u.id = b.redeemed_by
                       WHERE b.user_id = ? AND (b.status <> 'activo' OR b.expires_at < ?)
                       ORDER BY COALESCE(b.redeemed_at, b.expires_at) DESC LIMIT 50`),
  redeem: db.prepare(`UPDATE benefits SET status = 'canjeado', redeemed_at = datetime('now'), redeemed_by = ?
                      WHERE id = ? AND status = 'activo' AND expires_at >= ?`),
  expire: db.prepare("UPDATE benefits SET status = 'vencido' WHERE status = 'activo' AND expires_at < ?"),
};

/* ---------- Plantillas ---------- */

const templates = () => q.tplAll.all();
const template = (id) => q.tplById.get(id);
const templateFor = (trigger) => q.tplByTrigger.get(trigger);
const anyTemplateFor = (trigger) => q.tplAnyByTrigger.get(trigger);
const templatesForLevel = (levelId) => q.tplForLevel.all(levelId);
const templatesForEvent = (eventId) => q.tplForEvent.all(eventId);

function saveTemplate(data) {
  const row = {
    name: data.name, description: data.description || '', validity_days: data.validity_days,
    trigger: data.trigger, level_id: data.level_id || null, event_id: data.event_id || null,
    active: data.active ? 1 : 0,
  };
  if (data.id) q.tplUpdate.run({ ...row, id: data.id });
  else return q.tplInsert.run(row).lastInsertRowid;
  return data.id;
}

/* ---------- Beneficios otorgados ---------- */

/**
 * Otorga un beneficio a partir de una plantilla. Con dedupeKey no se duplica
 * (devuelve null si ya existía). expiresAt opcional (por defecto hoy + vigencia).
 */
function issue(userId, tpl, { source, dedupeKey = null, expiresAt = null } = {}) {
  const expires = expiresAt || time.addDays(time.today(), Math.max(0, tpl.validity_days));
  const info = q.insert.run(userId, tpl.id, tpl.name, tpl.description, source || tpl.trigger, dedupeKey, expires);
  return info.changes ? q.byId.get(info.lastInsertRowid) : null;
}

const activeFor = (userId) => q.active.all(userId, time.today());
const historyFor = (userId) => q.history.all(userId, time.today());
const byId = (id) => q.byId.get(id);

/** Canjea un beneficio activo y no vencido. Devuelve true si se canjeó. */
function redeem(benefitId, cashierId) {
  return q.redeem.run(cashierId, benefitId, time.today()).changes === 1;
}

/** Marca como vencidos los beneficios activos cuya fecha ya pasó. */
function expireOld() {
  return q.expire.run(time.today()).changes;
}

/** Días que faltan para que venza (0 = vence hoy). */
const daysLeft = (b) => time.daysBetween(time.today(), b.expires_at);

module.exports = {
  TRIGGERS, templates, template, templateFor, anyTemplateFor, templatesForLevel, templatesForEvent, saveTemplate,
  issue, activeFor, historyFor, byId, redeem, expireOld, daysLeft,
};
