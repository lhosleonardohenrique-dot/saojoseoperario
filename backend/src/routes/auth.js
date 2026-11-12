const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const sign = (u) => jwt.sign(u, process.env.JWT_SECRET, { expiresIn: '7d' });

// Cadastro público cria apenas "membro". Administrativo só via scripts/create-admin.js
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Preencha nome, e-mail e senha.' });
    if (password.length < 8) return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres.' });
    const mail = email.toLowerCase();
    const exists = await query('SELECT id FROM users WHERE email = $1', [mail]);
    if (exists.rowCount) return res.status(409).json({ error: 'Já existe uma conta com esse e-mail.' });
    const r = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, mail, bcrypt.hashSync(password, 10), 'membro']
    );
    const user = { id: r.rows[0].id, name, email: mail, role: 'membro' };
    res.status(201).json({ token: sign(user), user });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Preencha e-mail e senha.' });
    const r = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const row = r.rows[0];
    if (!row || !bcrypt.compareSync(password, row.password_hash))
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    res.json({ token: sign(user), user });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
