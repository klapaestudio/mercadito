const db = require('./index');
const config = require('../config');
const settings = require('../services/settings');
const users = require('../services/users');

/** Datos mínimos para que el sistema funcione. Idempotente: se corre en cada arranque. */
function bootstrap() {
  settings.ensureDefaults();

  if (db.prepare('SELECT COUNT(*) AS n FROM levels').get().n === 0) {
    const ins = db.prepare('INSERT INTO levels (name, min_visits, perks, sort_order) VALUES (?, ?, ?, ?)');
    ins.run('Marta 1', 0, 'Sumás sellos en cada visita.', 1);
    ins.run('Marta 2', 15, 'Sumás sellos en cada visita y recibís sorpresas especiales.', 2);
    ins.run('Marta 3', 40, 'Prioridad para reservar en eventos y beneficios exclusivos.', 3);
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM benefit_templates').get().n === 0) {
    const ins = db.prepare(`INSERT INTO benefit_templates (name, description, validity_days, trigger)
                            VALUES (?, ?, ?, ?)`);
    ins.run('Un café', 'Premio por completar tu tarjeta de sellos.', 30, 'tarjeta_completa');
    ins.run('Regalo de cumpleaños', 'Una porción de torta para festejar tu semana de cumpleaños.', 7, 'cumpleanos');
    ins.run('Te extrañamos', 'Un café de regalo para tu próxima visita.', 15, 'te_extranamos');
  }

  users.ensureAdmin(config.adminUser, config.adminPassword);
}

module.exports = bootstrap;
