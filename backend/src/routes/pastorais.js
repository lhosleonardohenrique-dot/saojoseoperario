const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const okImg = (u) => !u || /^https?:\/\//i.test(u) || (String(u).startsWith('imagens/') || String(u).startsWith('/api/images/'));

// Público: lista (logo + nome)
router.get('/', async (req, res) => {
  try {
    const r = await query('SELECT id, name, logo_url, description FROM pastorais ORDER BY sort_order, id');
    res.json({ pastorais: r.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

// Público: uma pastoral (página pastoral.html)
router.get('/:id(\\d+)', async (req, res) => {
  try {
    const r = await query('SELECT id, name, logo_url, description FROM pastorais WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Pastoral não encontrada.' });
    res.json({ pastoral: r.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 120);
    const logo_url = String(req.body.logo_url || '').trim();
    if (!name) return res.status(400).json({ error: 'Informe o nome da pastoral.' });
    if (!okImg(logo_url)) return res.status(400).json({ error: 'A logo precisa ser um link http(s):// ou imagens/arquivo.png.' });
    const next = await query('SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM pastorais');
    const r = await query('INSERT INTO pastorais (name, logo_url, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, logo_url || null, String(req.body.description || ''), next.rows[0].n]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.put('/:id(\\d+)', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 120);
    const logo_url = String(req.body.logo_url || '').trim();
    if (!name) return res.status(400).json({ error: 'Informe o nome da pastoral.' });
    if (!okImg(logo_url)) return res.status(400).json({ error: 'A logo precisa ser um link http(s):// ou imagens/arquivo.png.' });
    const r = await query('UPDATE pastorais SET name=$1, logo_url=$2, description=$3 WHERE id=$4',
      [name, logo_url || null, String(req.body.description || ''), req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Pastoral não encontrada.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.delete('/:id', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const r = await query('DELETE FROM pastorais WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Pastoral não encontrada.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

module.exports = router;
