const express = require('express');
const { query } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Descobre o tipo real pelo conteúdo do arquivo (não confia no que o navegador diz). SVG fica de fora de propósito.
function sniff(b) {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.slice(0, 4).toString() === 'GIF8') return 'image/gif';
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

// Administrativo: envia uma imagem (corpo = bytes da imagem). Fica salva no banco, então não some quando o Render reinicia.
router.post('/uploads', requireAuth, requireRole('administrativo'),
  express.raw({ type: () => true, limit: '6mb' }),
  async (req, res) => {
    try {
      const buf = req.body;
      if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
      const mime = sniff(buf);
      if (!mime) return res.status(400).json({ error: 'Formato não aceito. Use PNG, JPG, WEBP ou GIF.' });
      const r = await query('INSERT INTO images (mime, data) VALUES ($1,$2) RETURNING id', [mime, buf]);
      res.status(201).json({ url: '/api/images/' + r.rows[0].id });
    } catch (e) {
      if (e.type === 'entity.too.large') return res.status(413).json({ error: 'Imagem muito grande (máx. 6 MB).' });
      console.error(e); res.status(500).json({ error: 'Erro interno.' });
    }
  });

// Público: devolve a imagem
router.get('/images/:id(\\d+)', async (req, res) => {
  try {
    const r = await query('SELECT mime, data FROM images WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).end();
    res.set({ 'Content-Type': r.rows[0].mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    res.send(r.rows[0].data);
  } catch (e) { console.error(e); res.status(500).end(); }
});

module.exports = router;
