const crypto = require('crypto');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Token CSRF por sesión: en formularios como _csrf, en fetch como header x-csrf-token. */
function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('base64url');
  res.locals.csrfToken = req.session.csrf;
  if (SAFE.has(req.method)) return next();

  const sent = req.body?._csrf || req.get('x-csrf-token') || '';
  const a = Buffer.from(String(sent));
  const b = Buffer.from(req.session.csrf);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();

  res.status(403);
  return res.page('error', {
    title: 'Sesión vencida',
    message: 'El formulario venció. Volvé atrás, recargá la página e intentá de nuevo.',
  });
}

module.exports = csrf;
