const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { isAllowed } = require('../moderation');

const router = express.Router();
const hits = new Map(); // limite simples: 3 velas por hora por IP

router.get('/', async (req, res) => {
  try {
    const r = await query(
      `SELECT id, name, intention, created_at FROM candles
        WHERE created_at > now() - interval '24 hours' ORDER BY created_at DESC LIMIT 40`
    );
    const c = await query(`SELECT count(*)::int AS total FROM candles WHERE created_at > now() - interval '24 hours'`);
    res.json({ total: c.rows[0].total, candles: r.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/', async (req, res) => {
  try {
    const ip = req.ip;
    const recent = (hits.get(ip) || []).filter((t) => Date.now() - t < 3600000);
    if (recent.length >= 3) return res.status(429).json({ error: 'Você já acendeu algumas velas. Tente novamente mais tarde.' });
    const name = String(req.body.name || '').trim().slice(0, 30);
    const intention = String(req.body.intention || '').trim().slice(0, 140);
    if (!(await isAllowed(name, intention)))
      return res.status(422).json({ error: 'Não foi possível acender essa vela. Revise o nome e a intenção.' });
    const r = await query('INSERT INTO candles (name, intention) VALUES ($1,$2) RETURNING id', [name, intention]);
    recent.push(Date.now()); hits.set(ip, recent);
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

// Moderação (secretaria)
router.delete('/:id', requireAuth, requireRole('administrativo'), async (req, res) => {
  await query('DELETE FROM candles WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
