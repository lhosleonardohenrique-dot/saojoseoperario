const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Pensamento do dia: gira entre os cadastrados, um por dia (horário de Brasília)
router.get('/today', async (req, res) => {
  try {
    const r = await query('SELECT text, reference FROM thoughts ORDER BY id');
    if (!r.rowCount) return res.json({ thought: null });
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    res.json({ thought: r.rows[day % r.rowCount] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.get('/', requireAuth, requireRole('administrativo'), async (req, res) => {
  const r = await query('SELECT id, text, reference FROM thoughts ORDER BY id');
  res.json({ thoughts: r.rows });
});

router.post('/', requireAuth, requireRole('administrativo'), async (req, res) => {
  const { text, reference } = req.body;
  if (!text) return res.status(400).json({ error: 'Informe o texto.' });
  const r = await query('INSERT INTO thoughts (text, reference) VALUES ($1,$2) RETURNING id', [text, reference || null]);
  res.status(201).json({ id: r.rows[0].id });
});

router.delete('/:id', requireAuth, requireRole('administrativo'), async (req, res) => {
  await query('DELETE FROM thoughts WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
