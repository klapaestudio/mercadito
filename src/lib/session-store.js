const session = require('express-session');

const DAY = 24 * 60 * 60 * 1000;

/** Store de express-session sobre la misma base SQLite. */
class SqliteStore extends session.Store {
  constructor(db) {
    super();
    this.db = db;
    this.q = {
      get: db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expires > ?'),
      set: db.prepare(`INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
                       ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires`),
      touch: db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?'),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      clear: db.prepare('DELETE FROM sessions WHERE expires <= ?'),
    };
    this.clearExpired();
    setInterval(() => this.clearExpired(), 60 * 60 * 1000).unref();
  }

  expiresOf(sess) {
    const e = sess?.cookie?.expires;
    return e ? new Date(e).getTime() : Date.now() + DAY;
  }

  get(sid, cb) {
    try {
      const row = this.q.get.get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (err) { cb(err); }
  }

  set(sid, sess, cb) {
    try {
      this.q.set.run(sid, JSON.stringify(sess), this.expiresOf(sess));
      cb?.(null);
    } catch (err) { cb?.(err); }
  }

  touch(sid, sess, cb) {
    try {
      this.q.touch.run(this.expiresOf(sess), sid);
      cb?.(null);
    } catch (err) { cb?.(err); }
  }

  destroy(sid, cb) {
    try {
      this.q.destroy.run(sid);
      cb?.(null);
    } catch (err) { cb?.(err); }
  }

  clearExpired() {
    this.q.clear.run(Date.now());
  }
}

module.exports = SqliteStore;
