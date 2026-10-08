const cron = require('node-cron');
const db = require('../db');
const config = require('../config');
const time = require('../lib/time');
const settings = require('./settings');
const benefits = require('./benefits');
const notifications = require('./notifications');
const events = require('./events');

const q = {
  lastRun: db.prepare('SELECT last_run FROM cron_runs WHERE task = ?'),
  setRun: db.prepare(`INSERT INTO cron_runs (task, last_run) VALUES (?, ?)
                      ON CONFLICT(task) DO UPDATE SET last_run = excluded.last_run`),
  birthdayClients: db.prepare("SELECT id, first_name, birthday FROM users WHERE role = 'cliente' AND active = 1 AND birthday IS NOT NULL"),
  missYouClients: db.prepare(`SELECT id, first_name, last_visit_at, created_at FROM users
                              WHERE role = 'cliente' AND active = 1`),
};

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Beneficio de cumpleaños para quienes cumplen esta semana (lunes a domingo). */
function birthdays() {
  if (!settings.get('birthday_enabled')) return 0;
  const tpl = benefits.templateFor('cumpleanos');
  if (!tpl) return 0;
  const { monday, sunday } = time.weekRange();

  // Día y mes de cada día de la semana -> año en que cae ese cumpleaños
  const days = new Map();
  for (let i = 0; i < 7; i++) {
    const d = time.addDays(monday, i);
    days.set(d.slice(5), d.slice(0, 4));
  }

  let n = 0;
  for (const c of q.birthdayClients.all()) {
    const md = c.birthday.slice(5);
    let year = days.get(md);
    if (!year && md === '02-29') {
      // En años no bisiestos, quien nació el 29/2 festeja el 28/2
      const y = days.get('02-28');
      if (y && !isLeap(Number(y))) year = y;
    }
    if (!year) continue;
    const b = benefits.issue(c.id, tpl, { source: 'cumpleanos', dedupeKey: `cumple:${year}`, expiresAt: sunday });
    if (b) {
      notifications.notify(c.id, {
        type: 'cumpleanos', drawing: 3, celebrate: true,
        title: `¡Feliz cumpleaños, ${c.first_name}!`,
        body: `Toda esta semana te espera un regalo: ${b.title}. Válido hasta el ${time.fmtDate(sunday)}.`,
      });
      n++;
    }
  }
  return n;
}

/** Beneficio "Te extrañamos" para quienes llevan X días sin venir (uno por cada ausencia). */
function missYou() {
  if (!settings.get('miss_you_enabled')) return 0;
  const tpl = benefits.templateFor('te_extranamos');
  if (!tpl) return 0;
  const days = Number(settings.get('miss_you_days')) || 30;
  const today = time.today();

  let n = 0;
  for (const c of q.missYouClients.all()) {
    const ref = c.last_visit_at || c.created_at;
    const lastDay = time.sqlToLocalDate(ref);
    if (time.daysBetween(lastDay, today) < days) continue;
    const key = c.last_visit_at ? `extranamos:${lastDay}` : 'extranamos:nunca';
    const b = benefits.issue(c.id, tpl, { source: 'te_extranamos', dedupeKey: key });
    if (b) {
      notifications.notify(c.id, {
        type: 'te_extranamos', drawing: 2,
        title: `Te extrañamos, ${c.first_name}`,
        body: `Hace rato que no pasás. Te guardamos un regalo: ${b.title}. Válido hasta el ${time.fmtDate(b.expires_at)}.`,
      });
      n++;
    }
  }
  return n;
}

/** Tareas diarias. Se puede llamar a mano desde el admin. */
function runDaily() {
  const out = {
    vencidos: benefits.expireOld(),
    cumpleanos: birthdays(),
    te_extranamos: missYou(),
    eventos: events.notifyOpenings(),
  };
  q.setRun.run('daily', time.today());
  console.log(`[cron] tareas diarias ${time.today()}:`, out);
  return out;
}

function runHourly() {
  const sent = events.notifyOpenings();
  if (sent) console.log(`[cron] avisos de eventos enviados: ${sent}`);
  return sent;
}

/** Programa las tareas y, si el servidor estuvo apagado, las recupera al arrancar. */
function start() {
  const last = q.lastRun.get('daily')?.last_run;
  if (last !== time.today()) runDaily();
  else runHourly();

  cron.schedule('5 0 * * *', runDaily, { timezone: config.tz });
  cron.schedule('0 * * * *', runHourly, { timezone: config.tz });
}

const lastDailyRun = () => q.lastRun.get('daily')?.last_run || null;

module.exports = { start, runDaily, runHourly, birthdays, missYou, lastDailyRun };
