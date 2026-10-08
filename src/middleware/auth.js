const db = require('../db');
const users = require('../services/users');
const nav = require('../lib/nav');

const unreadQ = db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL');

const HOME = { cliente: '/inicio', cajero: '/caja', admin: '/admin' };
const homeFor = (user) => HOME[user.role] || '/';

/** Carga el usuario de la sesión en req.user y res.locals. */
function loadUser(req, res, next) {
  const id = req.session?.userId;
  const user = id ? users.findById(id) : null;
  if (id && (!user || !user.active)) {
    delete req.session.userId;
  }
  req.user = user && user.active ? user : null;
  res.locals.user = req.user;
  res.locals.nav = req.user ? nav.forRole(req.user.role) : [];
  res.locals.unread = req.user?.role === 'cliente' ? unreadQ.get(req.user.id).n : 0;
  res.locals.path = req.path;
  next();
}

/** Si el usuario entró con contraseña temporal, solo puede cambiarla o salir. */
function forcePasswordChange(req, res, next) {
  if (req.user?.must_change_password && !['/cambiar-clave', '/salir'].includes(req.path)) {
    return res.redirect('/cambiar-clave');
  }
  next();
}

function requireLogin(req, res, next) {
  if (!req.user) return res.redirect('/');
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/');
    if (!roles.includes(req.user.role)) return res.redirect(homeFor(req.user));
    next();
  };
}

module.exports = { loadUser, forcePasswordChange, requireLogin, requireRole, homeFor };
