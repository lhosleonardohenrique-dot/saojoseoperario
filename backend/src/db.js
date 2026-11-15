const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
const local = !url || /localhost|127\.0\.0\.1/.test(url);

// DATABASE_URL vem do .env (Neon, Supabase ou qualquer Postgres)
const pool = new Pool({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false },
});

const query = (text, params) => pool.query(text, params);

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'membro',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT,
      image_url TEXT,
      category TEXT NOT NULL DEFAULT 'noticia',   -- 'noticia' ou 'evento'
      event_date DATE,
      registration_url TEXT,
      published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by INTEGER REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS candles (
      id SERIAL PRIMARY KEY,
      name TEXT,
      intention TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      event_date DATE,
      description TEXT,
      image_url TEXT,
      registration_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by INTEGER REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS pastorais (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS priests (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      photo_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE news ADD COLUMN IF NOT EXISTS permanent BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS candles_created_at_idx ON candles (created_at DESC);
    CREATE TABLE IF NOT EXISTS thoughts (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      reference TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Primeira execução: cadastra os padres que já estavam no site
  const c = await query('SELECT count(*)::int AS n FROM priests');
  if (c.rows[0].n === 0) {
    const seed = [
      ['Pe. Orestes Monteiro de Melo', 'imagens/orestes.png'],
      ['Pe. Giovanni Battista Erittu', 'imagens/giovanni.png'],
      ['Pe. John Mark Sebuc Comia', 'imagens/john.png'],
      ['Pe. Chinaka Justin Mbaeri', 'imagens/chinaka.png'],
    ];
    for (let i = 0; i < seed.length; i++) {
      await query('INSERT INTO priests (name, photo_url, sort_order) VALUES ($1,$2,$3)', [seed[i][0], seed[i][1], i]);
    }
  }
}

// Limpeza automática: notícias com mais de 2 meses (eventos futuros ficam)
// e velas com mais de 48h.
async function cleanup() {
  const n = await query(
    `DELETE FROM news WHERE published_at < now() - interval '2 months'
       AND NOT permanent AND (event_date IS NULL OR event_date < CURRENT_DATE)`
  );
  await query(`DELETE FROM candles WHERE created_at < now() - interval '48 hours'`);
  if (n.rowCount) console.log(`Limpeza: ${n.rowCount} notícia(s) antiga(s) removida(s).`);
}

module.exports = { pool, query, initDb, cleanup };
