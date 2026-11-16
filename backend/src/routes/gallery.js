const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const admin = [requireAuth, requireRole('administrativo')];
const isOurImage = (u) => /^\/api\/images\/\d+$/.test(String(u || ''));

// apaga do banco as imagens enviadas (a galeria é dona delas)
async function dropImages(urls) {
  const ids = urls.filter(isOurImage).map((u) => Number(u.split('/').pop()));
  if (ids.length) await query('DELETE FROM images WHERE id = ANY($1::int[])', [ids]);
}

// Público: álbuns (mais novos primeiro) com capa = primeira foto
router.get('/albums', async (req, res) => {
  try {
    const r = await query(
      `SELECT a.id, a.name,
              (SELECT COALESCE(p.thumb_url, p.image_url) FROM album_photos p WHERE p.album_id = a.id ORDER BY p.sort_order, p.id LIMIT 1) AS cover_url,
              (SELECT COUNT(*)::int FROM album_photos p WHERE p.album_id = a.id) AS photo_count
         FROM albums a ORDER BY a.created_at DESC, a.id DESC`);
    res.json({ albums: r.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

// Público: um álbum com suas fotos
router.get('/albums/:id(\\d+)', async (req, res) => {
  try {
    const a = await query('SELECT id, name FROM albums WHERE id = $1', [req.params.id]);
    if (!a.rowCount) return res.status(404).json({ error: 'Álbum não encontrado.' });
    const p = await query('SELECT id, image_url, COALESCE(thumb_url, image_url) AS thumb_url FROM album_photos WHERE album_id = $1 ORDER BY sort_order, id', [req.params.id]);
    res.json({ album: a.rows[0], photos: p.rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/albums', ...admin, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 100);
    if (!name) return res.status(400).json({ error: 'Dê um nome para a pasta.' });
    const r = await query('INSERT INTO albums (name) VALUES ($1) RETURNING id', [name]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.put('/albums/:id(\\d+)', ...admin, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 100);
    if (!name) return res.status(400).json({ error: 'Dê um nome para a pasta.' });
    const r = await query('UPDATE albums SET name = $1 WHERE id = $2', [name, req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Álbum não encontrado.' });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.delete('/albums/:id(\\d+)', ...admin, async (req, res) => {
  try {
    const p = await query('SELECT image_url, thumb_url FROM album_photos WHERE album_id = $1', [req.params.id]);
    const r = await query('DELETE FROM albums WHERE id = $1', [req.params.id]);   // as fotos saem junto (ON DELETE CASCADE)
    if (!r.rowCount) return res.status(404).json({ error: 'Álbum não encontrado.' });
    await dropImages(p.rows.flatMap((x) => [x.image_url, x.thumb_url]));
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

// Administrativo: registra uma foto já enviada em /api/uploads
router.post('/albums/:id(\\d+)/photos', ...admin, async (req, res) => {
  try {
    const { image_url, thumb_url } = req.body;
    if (!isOurImage(image_url) || (thumb_url && !isOurImage(thumb_url)))
      return res.status(400).json({ error: 'Imagem inválida. Envie a foto pelo painel.' });
    const a = await query('SELECT 1 FROM albums WHERE id = $1', [req.params.id]);
    if (!a.rowCount) return res.status(404).json({ error: 'Álbum não encontrado.' });
    const next = await query('SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM album_photos WHERE album_id = $1', [req.params.id]);
    const r = await query('INSERT INTO album_photos (album_id, image_url, thumb_url, sort_order) VALUES ($1,$2,$3,$4) RETURNING id',
      [req.params.id, image_url, thumb_url || null, next.rows[0].n]);
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.delete('/photos/:id(\\d+)', ...admin, async (req, res) => {
  try {
    const r = await query('DELETE FROM album_photos WHERE id = $1 RETURNING image_url, thumb_url', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Foto não encontrada.' });
    await dropImages([r.rows[0].image_url, r.rows[0].thumb_url]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

module.exports = router;
