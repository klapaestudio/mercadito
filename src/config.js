const path = require('path');
require('dotenv').config({ quiet: true });

const root = path.resolve(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';

const config = {
  root,
  isProd,
  port: Number(process.env.PORT) || 3000,
  dataDir: path.resolve(root, process.env.DATA_DIR || './data'),
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-no-usar-en-produccion',
  adminUser: (process.env.ADMIN_USER || 'admin').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  tz: process.env.TZ_APP || 'America/Argentina/Buenos_Aires',
};

if (isProd && !process.env.SESSION_SECRET) {
  console.warn('[config] Falta SESSION_SECRET en producción.');
}

module.exports = config;
