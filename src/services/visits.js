const db = require('../db');
const time = require('../lib/time');
const settings = require('./settings');
const levels = require('./levels');
const benefits = require('./benefits');
const notifications = require('./notifications');
const users = require('./users');

const q = {
  todayVisit: db.prepare('SELECT 1 FROM visits WHERE user_id = ? AND local_date = ? LIMIT 1'),
  insert: db.prepare('INSERT INTO visits (user_id, cashier_id, local_date) VALUES (?, ?, ?)'),
  update: db.prepare(`UPDATE users SET total_visits = ?, card_stamps = ?, level_id = ?,
                      last_visit_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`),
  forUser: db.prepare(`SELECT v.*, c.first_name AS cashier_name FROM visits v LEFT JOIN users c ON c.id = v.cashier_id
                       WHERE v.user_id = ? ORDER BY v.created_at DESC LIMIT ?`),
};

const visitedToday = (userId) => !!q.todayVisit.get(userId, time.today());

/**
 * Suma una visita (= 1 sello). Si completa la tarjeta, la reinicia y otorga el premio;
 * si alcanza un nivel nuevo, lo actualiza, otorga los beneficios del nivel y notifica.
 */
function add(clientId, cashierId) {
  return db.transaction(() => {
    const client = users.findById(clientId);
    if (!client || client.role !== 'cliente') return { ok: false, error: 'No encontramos al cliente.' };
    if (!client.active) return { ok: false, error: 'La cuenta de este cliente está desactivada.' };

    const cfg = settings.all();
    const today = time.today();
    if (cfg.one_stamp_per_day && q.todayVisit.get(clientId, today)) {
      return { ok: false, error: 'Este cliente ya sumó su sello de hoy.' };
    }

    q.insert.run(clientId, cashierId, today);

    const total = client.total_visits + 1;
    let stamps = client.card_stamps + 1;
    const result = { ok: true, total, cardCompleted: null, levelUp: null, levelBenefits: [] };

    if (stamps >= cfg.stamps_per_card) {
      stamps = 0;
      const tpl = benefits.templateFor('tarjeta_completa');
      const prize = tpl ? benefits.issue(clientId, tpl, { source: 'tarjeta_completa', dedupeKey: `tarjeta:${total}` }) : null;
      result.cardCompleted = prize || true;
      notifications.notify(clientId, {
        type: 'tarjeta_completa',
        title: '¡Completaste tu tarjeta!',
        body: prize ? `Ganaste: ${prize.title}. Mostrá tu QR en caja para canjearlo. Tu tarjeta vuelve a empezar.`
                    : 'Tu tarjeta vuelve a empezar.',
        drawing: 1, celebrate: true,
      });
    }

    const list = levels.all();
    const oldLevel = list.find((l) => l.id === client.level_id) || levels.forVisits(client.total_visits, list);
    const newLevel = levels.forVisits(total, list);
    if (newLevel && oldLevel && newLevel.min_visits > oldLevel.min_visits) {
      result.levelUp = newLevel;
      for (const tpl of benefits.templatesForLevel(newLevel.id)) {
        const b = benefits.issue(clientId, tpl, { source: 'subir_nivel', dedupeKey: `nivel:${newLevel.id}` + (tpl.id ? `:${tpl.id}` : '') });
        if (b) result.levelBenefits.push(b);
      }
      const extra = result.levelBenefits.length ? ` Te regalamos: ${result.levelBenefits.map((b) => b.title).join(', ')}.` : '';
      notifications.notify(clientId, {
        type: 'nivel',
        title: `¡Subiste a ${newLevel.name}!`,
        body: `${newLevel.perks}${extra}`.trim(),
        drawing: 3, celebrate: true,
      });
    }

    q.update.run(total, stamps, newLevel?.id ?? client.level_id, clientId);
    result.stamps = stamps;
    return result;
  })();
}

const forUser = (userId, limit = 50) => q.forUser.all(userId, limit);

module.exports = { add, visitedToday, forUser };
