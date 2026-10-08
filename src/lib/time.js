const config = require('../config');

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: config.tz, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function localParts(date = new Date()) {
  return Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
}

/** Fecha de hoy en la zona horaria del local (YYYY-MM-DD). */
function today(date = new Date()) {
  const p = localParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Suma días a una fecha YYYY-MM-DD. */
function addDays(ymd, days) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Día de la semana de una fecha YYYY-MM-DD (0 = domingo). */
function weekday(ymd) {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

/** Convierte un datetime SQLite UTC ("YYYY-MM-DD HH:MM:SS") a Date. */
function fromSql(s) {
  if (!s) return null;
  return new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
}

/** Date -> datetime SQLite UTC. */
function toSql(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const isYmd = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const ymdFmt = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const ymdShortFmt = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'long' });
const dateFmt = new Intl.DateTimeFormat('es-AR', { timeZone: config.tz, day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('es-AR', {
  timeZone: config.tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
});

function fmtDate(v) {
  if (!v) return '';
  return isYmd(v) ? ymdFmt.format(new Date(`${v}T12:00:00Z`)) : dateFmt.format(fromSql(v));
}

/** "12 de marzo" (sin año) para cumpleaños. */
function fmtDayMonth(ymd) {
  return ymd ? ymdShortFmt.format(new Date(`${ymd}T12:00:00Z`)) : '';
}

function fmtDateTime(v) {
  return v ? dateTimeFmt.format(fromSql(v)) : '';
}

module.exports = { today, addDays, weekday, fromSql, toSql, fmtDate, fmtDayMonth, fmtDateTime, localParts };
