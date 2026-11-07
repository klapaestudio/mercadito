const db = require('../db');

const q = {
  all: db.prepare('SELECT * FROM levels ORDER BY min_visits ASC, sort_order ASC, id ASC'),
  byId: db.prepare('SELECT * FROM levels WHERE id = ?'),
  insert: db.prepare('INSERT INTO levels (name, min_visits, perks, sort_order) VALUES (?, ?, ?, ?)'),
  update: db.prepare('UPDATE levels SET name = ?, min_visits = ?, perks = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM levels WHERE id = ?'),
  clients: db.prepare("SELECT id, total_visits, level_id FROM users WHERE role = 'cliente'"),
  setLevel: db.prepare('UPDATE users SET level_id = ? WHERE id = ?'),
};

const all = () => q.all.all();
const byId = (id) => q.byId.get(id);

/** Nivel que corresponde a una cantidad de visitas históricas. */
function forVisits(visits, list = all()) {
  return list.filter((l) => visits >= l.min_visits).pop() || list[0];
}

/** Nivel siguiente (o null si ya está en el más alto). */
function next(visits, list = all()) {
  return list.find((l) => l.min_visits > visits) || null;
}

/** El nivel más alto: el que tiene prioridad en eventos. */
function top(list = all()) {
  return list[list.length - 1] || null;
}

/** Progreso hacia el próximo nivel, para la barra del inicio. */
function progress(visits) {
  const list = all();
  const current = forVisits(visits, list);
  const nxt = next(visits, list);
  // Frasco de Marta (1-3) según la posición del nivel; el último nivel siempre es Marta 3
  const pos = list.indexOf(current);
  const jar = !nxt ? 3 : Math.min(3, Math.max(1, pos + 1));
  if (!nxt) return { current, next: null, pct: 100, missing: 0, jar };
  const span = nxt.min_visits - current.min_visits;
  const done = visits - current.min_visits;
  return { current, next: nxt, pct: Math.round((done / span) * 100), missing: nxt.min_visits - visits, jar };
}

/** Recalcula el nivel de todos los clientes (sin notificar), tras cambiar la configuración. */
function recalcAll() {
  const list = all();
  db.transaction(() => {
    for (const u of q.clients.all()) {
      const lvl = forVisits(u.total_visits, list);
      if (lvl && lvl.id !== u.level_id) q.setLevel.run(lvl.id, u.id);
    }
  })();
}

function create({ name, min_visits, perks }) {
  q.insert.run(name, min_visits, perks, min_visits);
  recalcAll();
}

function update(id, { name, min_visits, perks }) {
  q.update.run(name, min_visits, perks, id);
  recalcAll();
}

function remove(id) {
  db.prepare('UPDATE users SET level_id = NULL WHERE level_id = ?').run(id);
  q.remove.run(id);
  recalcAll();
}

module.exports = { all, byId, forVisits, next, top, progress, recalcAll, create, update, remove };
