const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const isUrl = (u) => !u || /^https?:\/\//i.test(u);
const okImg = (u) => !u || isUrl(u) || (String(u).startsWith('imagens/') || String(u).startsWith('/api/images/'));

// Público: eventos que ainda vão acontecer (ou sem data), do mais próximo ao mais distante
router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT id, title, to_char(event_date,'YYYY-MM-DD') AS event_date, description, image_url, registration_url
         FROM events
        WHERE event_date IS NULL OR event_date >= CURRENT_DATE
        ORDER BY event_date ASC NULLS LAST, id DESC LIMIT 50`
    );
    res.json({ events: r.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const { title, event_date, description, image_url, registration_url } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'Título é obrigatório.' });
    if (!isUrl(registration_url) || !okImg(image_url)) return res.status(400).json({ error: 'Links precisam começar com http:// ou https://.' });
    const r = await query(
      `INSERT INTO events (title, event_date, description, image_url, registration_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [String(title).trim().slice(0, 140), event_date || null, description || '', image_url || '', registration_url || null, req.user.id]
    );
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.delete('/:id', requireAuth, requireRole('administrativo'), async (req, res) => {
  try {
    const r = await query('DELETE FROM events WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Evento não encontrado.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

module.exports = router;
