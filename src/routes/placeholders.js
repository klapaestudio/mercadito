const express = require('express');
const { requireLogin, requireRole } = require('../middleware/auth');

/** Secciones que todavía no están construidas: se completan en las próximas etapas. */
const router = express.Router();
const soon = (title) => (req, res) => res.page('soon', { title });

router.get('/mi-qr', requireRole('cliente'), soon('Mi QR'));
router.get('/beneficios', requireRole('cliente'), soon('Beneficios'));
router.get('/eventos', requireRole('cliente'), soon('Eventos'));
router.get('/notificaciones', requireRole('cliente'), soon('Notificaciones'));
router.get('/mi-cuenta', requireLogin, soon('Mi cuenta'));

router.get('/caja', requireRole('cajero', 'admin'), soon('Cargar visita'));

router.get('/admin', requireRole('admin'), soon('Resumen'));
for (const [p, t] of Object.entries({
  clientes: 'Clientes', eventos: 'Eventos', sellos: 'Sellos', niveles: 'Niveles',
  beneficios: 'Beneficios', automaticos: 'Cumpleaños y Te extrañamos', usuarios: 'Usuarios del sistema',
})) {
  router.get(`/admin/${p}`, requireRole('admin'), soon(t));
}

module.exports = router;
