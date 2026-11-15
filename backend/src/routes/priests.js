const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const okImg = (u) => !u || /^https?:\/\//i.test(u) || (String(u).startsWith('imagens/') || String(u).startsWith('/api/images/'));

// Público: lista de padres (nome + foto)
router.get('/', async (req, res) => {
  try {
    const r = await query('SELECT id, name, photo_url FROM priests ORDER BY sort_order, id');
    res.json({ priests: r.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 120);
    const photo_url = String(req.body.photo_url || '').trim();
    if (!name) return res.status(400).json({ error: 'Informe o nome do padre.' });
    if (!okImg(photo_url)) return res.status(400).json({ error: 'A foto precisa ser um link http(s):// ou imagens/arquivo.jpg.' });
    const next = await query('SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM priests');
    const r = await query('INSERT INTO priests (name, photo_url, sort_order) VALUES ($1,$2,$3) RETURNING id',
      [name, photo_url || null, next.rows[0].n]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.delete('/:id', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const r = await query('DELETE FROM priests WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Padre não encontrado.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

module.exports = router;
