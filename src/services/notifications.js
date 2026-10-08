const db = require('../db');

const q = {
  insert: db.prepare(`INSERT INTO notifications (user_id, type, title, body, drawing, celebrate)
                      VALUES (@user_id, @type, @title, @body, @drawing, @celebrate)`),
  list: db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100'),
  readAll: db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL"),
  celebration: db.prepare(`SELECT * FROM notifications WHERE user_id = ? AND celebrate = 1
                           ORDER BY created_at DESC, id DESC LIMIT 1`),
  clearCelebrations: db.prepare('UPDATE notifications SET celebrate = 0 WHERE user_id = ? AND celebrate = 1'),
};

/** Crea una notificación dentro de la web. celebrate = mostrar pantalla de festejo en el próximo inicio. */
function notify(userId, { type, title, body = '', drawing = null, celebrate = false }) {
  q.insert.run({ user_id: userId, type, title, body, drawing, celebrate: celebrate ? 1 : 0 });
}

const list = (userId) => q.list.all(userId);
const markAllRead = (userId) => q.readAll.run(userId);

/** Devuelve el festejo pendiente más reciente y los marca como mostrados. */
function takeCelebration(userId) {
  const n = q.celebration.get(userId);
  if (n) q.clearCelebrations.run(userId);
  return n || null;
}

module.exports = { notify, list, markAllRead, takeCelebration };
