const express = require('express');
const db = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const cliente = requireRole('cliente');

const levelQ = db.prepare('SELECT * FROM levels WHERE id = ?');

router.get('/inicio', cliente, (req, res) => {
  res.page('cliente/home', { title: 'Inicio', level: levelQ.get(req.user.level_id) });
});

module.exports = router;
