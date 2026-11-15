const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const isUrl = (u) => !u || /^https?:\/\//i.test(u); // bloqueia "javascript:" etc.

// Público. Só mostra notícias dos últimos 2 meses (+ eventos que ainda vão acontecer)
router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT id, title, excerpt, image_url, category, to_char(event_date,'YYYY-MM-DD') AS event_date, registration_url, published_at
         FROM news
        WHERE permanent OR published_at > now() - interval '2 months' OR event_date >= CURRENT_DATE
        ORDER BY published_at DESC LIMIT 50`
    );
    res.json({ news: r.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

// Público: uma notícia completa (página noticia.html)
router.get('/:id(\\d+)', async (req, res) => {
  try {
    const r = await query(
      `SELECT id, title, excerpt, content, image_url, category, to_char(event_date,'YYYY-MM-DD') AS event_date, registration_url, published_at
         FROM news WHERE id = $1`, [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Notícia não encontrada.' });
    res.json({ news: r.rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const { title, excerpt, content, image_url, category, event_date, registration_url } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório.' });
    const imgOk = !image_url || isUrl(image_url) || String(image_url).startsWith('imagens/') || String(image_url).startsWith('/api/images/');
    if (!isUrl(registration_url) || !imgOk)
      return res.status(400).json({ error: 'Links precisam começar com http:// ou https://.' });
    const r = await query(
      `INSERT INTO news (title, excerpt, content, image_url, category, event_date, registration_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [title, excerpt || '', content || '', image_url || '',
       category === 'evento' ? 'evento' : 'noticia', event_date || null, registration_url || null, req.user.id]
    );
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.put('/:id(\\d+)', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const { title, excerpt, content, image_url } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'Título é obrigatório.' });
    if (!(!image_url || isUrl(image_url) || String(image_url).startsWith('imagens/') || String(image_url).startsWith('/api/images/')))
      return res.status(400).json({ error: 'Links precisam começar com http:// ou https://.' });
    const r = await query(
      `UPDATE news SET title=$1, excerpt=$2, content=$3, image_url=$4 WHERE id=$5`,
      [String(title).trim().slice(0, 140), excerpt || '', content || '', image_url || '', req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Notícia não encontrada.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.delete('/:id', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const r = await query('DELETE FROM news WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Notícia não encontrada.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

module.exports = router;
