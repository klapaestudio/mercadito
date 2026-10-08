/**
 * Datos de ejemplo para probar la app en local: `npm run seed`.
 * BORRA clientes, cajeros, visitas, beneficios, notificaciones, eventos y reservas,
 * y los vuelve a crear. Mantiene los admins y la configuración.
 */
const config = require('../config');

if (config.isProd && !process.argv.includes('--force')) {
  console.error('El seed borra datos. En producción hay que correrlo con --force.');
  process.exit(1);
}

const db = require('./index');
const bootstrap = require('./bootstrap');
const users = require('../services/users');
const settings = require('../services/settings');
const time = require('../lib/time');

bootstrap();

const PASSWORD_CLIENTES = 'cliente123';
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const today = time.today();

// Pseudoaleatorio con semilla fija: el seed siempre genera lo mismo
let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const sqlAt = (msAgo, hour = 10) => {
  const d = new Date(now - msAgo);
  d.setUTCHours(hour + 3, Math.floor(rand() * 60), 0, 0); // hora local AR ≈ UTC-3
  return time.toSql(d);
};

/* ---------- Limpieza ---------- */

db.transaction(() => {
  db.exec(`
    DELETE FROM reservations; DELETE FROM notifications; DELETE FROM benefits;
    DELETE FROM visits; DELETE FROM events; DELETE FROM login_attempts; DELETE FROM sessions;
    DELETE FROM users WHERE role IN ('cliente','cajero');
    DELETE FROM benefit_templates WHERE trigger IN ('subir_nivel','evento','manual');
  `);
})();

const levels = db.prepare('SELECT * FROM levels ORDER BY min_visits').all();
const levelFor = (visits) => levels.filter((l) => visits >= l.min_visits).pop();
const tpl = (trigger) => db.prepare('SELECT * FROM benefit_templates WHERE trigger = ? ORDER BY id LIMIT 1').get(trigger);
const stampsPerCard = settings.get('stamps_per_card');

/* ---------- Plantillas de beneficios extra ---------- */

const insTpl = db.prepare(`INSERT INTO benefit_templates (name, description, validity_days, trigger, level_id, event_id)
                           VALUES (?, ?, ?, ?, ?, ?)`);
const marta2 = levels.find((l) => l.name === 'Marta 2') || levels[1];
const marta3 = levels.find((l) => l.name === 'Marta 3') || levels[2];
insTpl.run('Medialuna de bienvenida a Marta 2', 'Una medialuna de manteca con tu próximo café.', 30, 'subir_nivel', marta2.id, null);
insTpl.run('Desayuno para dos', 'Un desayuno completo para compartir, por llegar a Marta 3.', 45, 'subir_nivel', marta3.id, null);
const tplM2 = db.prepare("SELECT * FROM benefit_templates WHERE trigger = 'subir_nivel' AND level_id = ?").get(marta2.id);
const tplM3 = db.prepare("SELECT * FROM benefit_templates WHERE trigger = 'subir_nivel' AND level_id = ?").get(marta3.id);

/* ---------- Staff ---------- */

users.createStaff({ role: 'cajero', username: 'caja', first_name: 'Lucía', last_name: 'Caja', password: 'caja1234' });

/* ---------- Clientes ---------- */

// visits: visitas totales; lastDaysAgo: hace cuántos días fue la última
const CLIENTES = [
  { first: 'Bianca', last: 'Dondio', phone: '1150000001', email: 'bianca@example.com', visits: 45, lastDaysAgo: 1, bday: 'esta-semana' },
  { first: 'Costanza', last: 'Rinaldi', phone: '1150000002', email: 'costanza@example.com', visits: 22, lastDaysAgo: 0, bday: '1994-03-22' },
  { first: 'Martina', last: 'Gómez', phone: '1150000003', visits: 9, lastDaysAgo: 3, bday: '1988-11-02' },
  { first: 'Julián', last: 'Ferreyra', phone: '1150000004', visits: 14, lastDaysAgo: 2, bday: '1979-07-15' },
  { first: 'Sofía', last: 'Benítez', phone: '1150000005', email: 'sofi.b@example.com', visits: 41, lastDaysAgo: 6, bday: '1992-10-27' },
  { first: 'Tomás', last: 'Aguirre', phone: '1150000006', visits: 6, lastDaysAgo: 42, bday: '1985-01-30' },
  { first: 'Valentina', last: 'Quiroga', phone: '1150000007', visits: 3, lastDaysAgo: 12, bday: '2001-10-19' },
  { first: 'Lautaro', last: 'Méndez', phone: '1150000008', visits: 27, lastDaysAgo: 35, bday: '1990-05-05' },
  { first: 'Camila', last: 'Ortiz', phone: '1150000009', email: 'cami@example.com', visits: 1, lastDaysAgo: 20, bday: '1999-12-12' },
  { first: 'Federico', last: 'Paz', phone: '1150000010', visits: 0, lastDaysAgo: null, bday: '1983-08-09' },
  { first: 'Agustina', last: 'Luna', phone: '1150000011', visits: 18, lastDaysAgo: 8, bday: '1996-02-14' },
  { first: 'Nicolás', last: 'Ibarra', phone: '1150000012', visits: 61, lastDaysAgo: 4, bday: '1975-09-30' },
];

// Cumpleaños dentro de la semana actual (lunes a domingo) para probar el beneficio
const monday = time.addDays(today, -((time.weekday(today) + 6) % 7));
const sunday = time.addDays(monday, 6);
const birthdayThisWeek = `1997-${today.slice(5)}`;

const q = {
  user: db.prepare(`UPDATE users SET total_visits = ?, card_stamps = ?, level_id = ?, last_visit_at = ?,
                    created_at = ?, consent_at = ? WHERE id = ?`),
  visit: db.prepare('INSERT INTO visits (user_id, cashier_id, local_date, created_at) VALUES (?, ?, ?, ?)'),
  benefit: db.prepare(`INSERT INTO benefits (user_id, template_id, title, description, source, dedupe_key,
                       issued_at, expires_at, status, redeemed_at, redeemed_by)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  notif: db.prepare(`INSERT INTO notifications (user_id, type, title, body, drawing, celebrate, read_at, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
};
const cajero = users.findForLogin('caja');
const created = [];

db.transaction(() => {
  for (const c of CLIENTES) {
    const birthday = c.bday === 'esta-semana' ? birthdayThisWeek : c.bday;
    const u = users.createClient({
      first_name: c.first, last_name: c.last, phone: c.phone, email: c.email, birthday, password: PASSWORD_CLIENTES,
    });

    // Fechas de visita: días distintos, de más vieja a más nueva, terminando en lastDaysAgo
    const days = [];
    let d = c.lastDaysAgo ?? 0;
    for (let i = 0; i < c.visits; i++) {
      days.unshift(d);
      d += 1 + Math.floor(rand() * 6);
    }
    const signupDaysAgo = (days[0] ?? 15) + 3 + Math.floor(rand() * 10);
    const signupAt = sqlAt(signupDaysAgo * DAY);
    q.notif.run(u.id, 'bienvenida', '¡Bienvenido/a a Mercadito!', 'Mostrá tu QR en caja en cada visita para sumar sellos.', 1, 0, signupAt, signupAt);

    let lastAt = null;
    days.forEach((ago, i) => {
      const at = sqlAt(ago * DAY, 8 + Math.floor(rand() * 10));
      lastAt = at;
      q.visit.run(u.id, cajero.id, time.today(new Date(now - ago * DAY)), at);
      const n = i + 1;
      const readAt = ago > 2 ? at : null;

      // Tarjeta completa cada N visitas
      if (n % stampsPerCard === 0) {
        const t = tpl('tarjeta_completa');
        const issuedDay = time.today(new Date(now - ago * DAY));
        const expires = time.addDays(issuedDay, t.validity_days);
        const isLast = n + stampsPerCard > c.visits;
        let status = 'canjeado';
        let redeemedAt = sqlAt(Math.max(ago - 2, 0) * DAY);
        if (expires < today) status = rand() < 0.3 ? 'vencido' : 'canjeado';
        if (isLast && expires >= today) { status = 'activo'; redeemedAt = null; }
        if (status !== 'canjeado') redeemedAt = null;
        q.benefit.run(u.id, t.id, t.name, t.description, 'tarjeta_completa', `tarjeta:${n}`, at, expires,
          status, redeemedAt, redeemedAt ? cajero.id : null);
        q.notif.run(u.id, 'tarjeta_completa', '¡Completaste tu tarjeta!', `Ganaste: ${t.name}. Tu tarjeta vuelve a empezar.`,
          (n / stampsPerCard - 1) % 3 + 1, 1, readAt, at);
      }

      // Subida de nivel
      const lvl = levels.find((l) => l.min_visits === n && n > 0);
      if (lvl) {
        const t = lvl.id === marta2.id ? tplM2 : lvl.id === marta3.id ? tplM3 : null;
        q.notif.run(u.id, 'nivel', `¡Subiste a ${lvl.name}!`, lvl.perks, lvl.id === marta3.id ? 3 : 2, 1, readAt, at);
        if (t) {
          const issuedDay = time.today(new Date(now - ago * DAY));
          const expires = time.addDays(issuedDay, t.validity_days);
          const active = expires >= today && ago < 10;
          q.benefit.run(u.id, t.id, t.name, t.description, 'subir_nivel', `nivel:${lvl.id}`, at, expires,
            active ? 'activo' : expires < today ? 'vencido' : 'canjeado',
            !active && expires >= today ? sqlAt(Math.max(ago - 1, 0) * DAY) : null,
            !active && expires >= today ? cajero.id : null);
        }
      }
    });

    const level = levelFor(c.visits);
    q.user.run(c.visits, c.visits % stampsPerCard, level.id, lastAt, signupAt, signupAt, u.id);
    created.push({ ...c, id: u.id, birthday, level: level.name });
  }
})();

const byPhone = (p) => created.find((c) => c.phone === p);

/* ---------- Beneficios automáticos de ejemplo ---------- */

db.transaction(() => {
  // Cumpleaños de Bianca (esta semana)
  const tb = tpl('cumpleanos');
  const bianca = byPhone('1150000001');
  q.benefit.run(bianca.id, tb.id, tb.name, tb.description, 'cumpleanos', `cumple:${today.slice(0, 4)}`,
    time.toSql(new Date(now - DAY)), sunday, 'activo', null, null);
  q.notif.run(bianca.id, 'cumpleanos', '¡Feliz semana de cumpleaños!', `Te esperamos con un regalo: ${tb.name}. Válido hasta el domingo.`,
    3, 1, null, time.toSql(new Date(now - DAY)));

  // Te extrañamos para quienes llevan +30 días sin venir
  const tm = tpl('te_extranamos');
  for (const c of created.filter((x) => x.lastDaysAgo !== null && x.lastDaysAgo >= settings.get('miss_you_days'))) {
    const last = db.prepare('SELECT last_visit_at FROM users WHERE id = ?').get(c.id).last_visit_at;
    const issued = time.toSql(new Date(now - 2 * DAY));
    q.benefit.run(c.id, tm.id, tm.name, tm.description, 'te_extranamos', `extranamos:${last.slice(0, 10)}`,
      issued, time.addDays(today, tm.validity_days - 2), 'activo', null, null);
    q.notif.run(c.id, 'te_extranamos', 'Te extrañamos', `Hace rato que no pasás. Te guardamos un regalo: ${tm.name}.`, 2, 0, null, issued);
  }

  // Un beneficio vencido de cumpleaños del año pasado para el historial de Costanza
  const costanza = byPhone('1150000002');
  q.benefit.run(costanza.id, tb.id, tb.name, tb.description, 'cumpleanos', `cumple:${Number(today.slice(0, 4)) - 1}`,
    `${Number(today.slice(0, 4)) - 1}-03-20 12:00:00`, `${Number(today.slice(0, 4)) - 1}-03-26`, 'canjeado',
    `${Number(today.slice(0, 4)) - 1}-03-23 17:30:00`, cajero.id);
})();

/* ---------- Eventos y reservas ---------- */

const insEvent = db.prepare(`INSERT INTO events (name, description, starts_at, capacity, max_seats, booking_opens_at,
                             priority_hours, public_notified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const insRes = db.prepare('INSERT INTO reservations (event_id, user_id, seats, status, created_at, cancelled_by) VALUES (?, ?, ?, ?, ?, ?)');
const at = (daysFromNow, hourLocal) => {
  const d = new Date(`${time.addDays(today, daysFromNow)}T00:00:00Z`);
  d.setUTCHours(hourLocal + 3);
  return time.toSql(d);
};

db.transaction(() => {
  // 1. En ventana de prioridad Marta 3 (abrió hace 10 hs, prioridad 48 hs)
  const e1 = insEvent.run('Tardeo de primavera',
    'Música en vivo, tragos de autor y una mesa dulce con lo mejor de nuestra pastelería.',
    at(10, 18), 30, 4, time.toSql(new Date(now - 10 * 60 * 60 * 1000)), 48, null).lastInsertRowid;
  insRes.run(e1, byPhone('1150000012').id, 2, 'activa', time.toSql(new Date(now - 8 * 60 * 60 * 1000)), null);
  insRes.run(e1, byPhone('1150000005').id, 3, 'activa', time.toSql(new Date(now - 5 * 60 * 60 * 1000)), null);

  // 2. Abierto a todos, casi lleno
  const e2 = insEvent.run('Cena de pastas caseras',
    'Menú de pasos con pastas hechas en casa, pan de masa madre y postre. Cupos limitados.',
    at(17, 21), 16, 4, time.toSql(new Date(now - 5 * DAY)), 48, time.toSql(new Date(now - 3 * DAY))).lastInsertRowid;
  [['1150000002', 2], ['1150000001', 2], ['1150000004', 4], ['1150000011', 2], ['1150000008', 3]].forEach(([p, seats], i) => {
    insRes.run(e2, byPhone(p).id, seats, 'activa', time.toSql(new Date(now - (4 - i * 0.5) * DAY)), null);
  });
  insRes.run(e2, byPhone('1150000003').id, 2, 'cancelada', time.toSql(new Date(now - 2 * DAY)), null);

  // 3. Todavía no abre las reservas
  insEvent.run('Brunch de domingo largo',
    'Brunch libre con huevos, panificados, frutas y café de especialidad.',
    at(30, 11), 40, 4, at(7, 10), 48, null);

  // 4. Evento pasado (historial)
  const e4 = insEvent.run('Clase abierta de medialunas',
    'Aprendé con nuestro equipo los secretos del hojaldre.',
    at(-12, 17), 12, 2, time.toSql(new Date(now - 25 * DAY)), 48, time.toSql(new Date(now - 23 * DAY))).lastInsertRowid;
  insRes.run(e4, byPhone('1150000002').id, 1, 'activa', time.toSql(new Date(now - 22 * DAY)), null);
  insRes.run(e4, byPhone('1150000007').id, 2, 'activa', time.toSql(new Date(now - 21 * DAY)), null);

  // Avisos de eventos
  for (const c of created) {
    q.notif.run(c.id, 'evento', 'Nuevo evento: Cena de pastas caseras', 'Ya podés reservar tu lugar desde Eventos.', 2, 0,
      c.phone === '1150000001' ? null : time.toSql(new Date(now - 2 * DAY)), time.toSql(new Date(now - 3 * DAY)));
    if (levelFor(c.visits).id === marta3.id) {
      q.notif.run(c.id, 'evento', 'Prioridad Marta 3: Tardeo de primavera',
        'Por ser Marta 3 podés reservar antes que nadie durante las próximas 48 hs.', 1, 0, null,
        time.toSql(new Date(now - 10 * 60 * 60 * 1000)));
    }
  }
})();

/* ---------- Resumen ---------- */

console.log('\nDatos de ejemplo cargados.\n');
console.log(`Admin:   ${config.adminUser} / (ADMIN_PASSWORD del .env)`);
console.log('Cajero:  caja / caja1234');
console.log(`Clientes (contraseña ${PASSWORD_CLIENTES}):`);
for (const c of created) {
  const stamps = c.visits % stampsPerCard;
  console.log(`  ${c.phone}  ${(c.first + ' ' + c.last).padEnd(20)} ${c.level.padEnd(8)} ${String(c.visits).padStart(2)} visitas, ${stamps}/${stampsPerCard} sellos`);
}
console.log('');
