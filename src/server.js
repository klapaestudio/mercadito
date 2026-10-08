const path = require('path');
const express = require('express');
const session = require('express-session');

const config = require('./config');
const db = require('./db');
const bootstrap = require('./db/bootstrap');
const SqliteStore = require('./lib/session-store');
const time = require('./lib/time');
const brand = require('./lib/brand');
const nav = require('./lib/nav');
const users = require('./services/users');
const { loadUser, forcePasswordChange } = require('./middleware/auth');
const csrf = require('./middleware/csrf');

bootstrap();

const app = express();
app.disable('x-powered-by');
if (config.isProd) app.set('trust proxy', 1); // Railway termina HTTPS en un proxy

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
Object.assign(app.locals, {
  time, crop: brand.crop, stampDrawing: brand.stampDrawing, isActive: nav.isActive, fullName: users.fullName,
});

/** res.page(): renderiza la vista y la envuelve en el layout ("app" o "auth"). */
app.use((req, res, next) => {
  res.page = (view, locals = {}) => {
    const layout = locals.layout || (req.user ? 'app' : 'auth');
    res.render(view, locals, (err, body) => {
      if (err) return next(err);
      res.render(`layouts/${layout}`, { ...locals, body });
    });
  };
  next();
});

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
  });
  next();
});

app.get('/health', (req, res) => res.type('text').send('ok'));

app.use(express.static(path.join(config.root, 'public'), { maxAge: config.isProd ? '7d' : 0 }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(express.json({ limit: '50kb' }));

app.use(session({
  name: 'mds.sid',
  store: new SqliteStore(db),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: 180 * 24 * 60 * 60 * 1000, // sesión persistente: 6 meses desde la última visita
  },
}));

/** Mensajes de un solo uso entre redirecciones. */
app.use((req, res, next) => {
  req.flash = (msg, type = 'ok') => { (req.session.flash ||= []).push({ msg, type }); };
  res.locals.flash = req.session.flash || [];
  if (req.session.flash) delete req.session.flash;
  next();
});

app.use(loadUser);
app.use(csrf);
app.use(forcePasswordChange);

app.use(require('./routes/auth'));
app.use(require('./routes/cliente'));
app.use(require('./routes/placeholders'));

app.use((req, res) => {
  res.status(404).page('error', { title: 'No encontrado', message: 'No encontramos esta página.' });
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  if (res.headersSent) return;
  res.status(500).render('layouts/auth', {
    title: 'Error', user: null, flash: [],
    body: '<div class="card center"><h1>Algo salió mal</h1><p class="muted">Probá de nuevo en un momento.</p><a class="btn" href="/">Volver</a></div>',
  });
});

app.listen(config.port, () => {
  console.log(`Mercadito de Sabores escuchando en http://localhost:${config.port}`);
});
