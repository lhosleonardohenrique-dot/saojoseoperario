-- Opcional: o servidor já cria tudo sozinho ao iniciar.
-- Use este arquivo se preferir criar as tabelas manualmente no SQL Editor do Neon.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'membro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vela virtual: o site mostra só as das últimas 24h; o servidor apaga as de +48h
CREATE TABLE IF NOT EXISTS candles (
  id SERIAL PRIMARY KEY,
  name TEXT,
  intention TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS candles_created_at_idx ON candles (created_at DESC);

-- Padres: nome + foto
CREATE TABLE IF NOT EXISTS priests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pastorais: logo + nome + descrição
CREATE TABLE IF NOT EXISTS pastorais (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notícias: título + foto + descrição (excerpt)
CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'noticia',
  event_date DATE,
  registration_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by INTEGER REFERENCES users(id),
  permanent BOOLEAN NOT NULL DEFAULT false   -- true = nunca é apagada pela limpeza de 2 meses
);
ALTER TABLE news ADD COLUMN IF NOT EXISTS permanent BOOLEAN NOT NULL DEFAULT false;

-- Eventos: título + data + descrição
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

CREATE TABLE IF NOT EXISTS thoughts (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
