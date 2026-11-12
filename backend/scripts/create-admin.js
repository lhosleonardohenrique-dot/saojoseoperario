// Uso: npm run create-admin -- "Nome" email@exemplo.com senhaForte123
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, initDb, pool } = require('../src/db');

(async () => {
  const [, , name, email, password] = process.argv;
  if (!email || !password) { console.log('Uso: npm run create-admin -- "Nome" email senha'); process.exit(1); }
  await initDb();
  const mail = email.toLowerCase();
  const ex = await query('SELECT id FROM users WHERE email = $1', [mail]);
  if (ex.rowCount) {
    await query('UPDATE users SET role = $1 WHERE id = $2', ['administrativo', ex.rows[0].id]);
    console.log(`${email} promovido a administrativo.`);
  } else {
    await query('INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4)',
      [name || email, mail, bcrypt.hashSync(password, 10), 'administrativo']);
    console.log(`Administrativo ${email} criado.`);
  }
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
