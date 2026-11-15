const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { normalize, clearWordsCache } = require('../moderation');

const router = express.Router();
router.use(requireAuth, requireRole('administrativo'));

router.get('/', async (req, res) => {
  try {
    const r = await query('SELECT id, word FROM banned_words ORDER BY word');
    res.json({ words: r.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/', async (req, res) => {
  try {
    const word = String(req.body.word || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const normalized = normalize(word).trim();
    if (normalized.length < 2) return res.status(400).json({ error: 'Digite uma palavra com pelo menos 2 letras.' });
    const r = await query(
      'INSERT INTO banned_words (word, normalized) VALUES ($1,$2) ON CONFLICT (normalized) DO NOTHING RETURNING id',
      [word, normalized]);
    if (!r.rowCount) return res.status(409).json({ error: 'Essa palavra já está na lista.' });
    clearWordsCache();
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.delete('/:id(\\d+)', async (req, res) => {
  try {
    const r = await query('DELETE FROM banned_words WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Palavra não encontrada.' });
    clearWordsCache();
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

module.exports = router;
