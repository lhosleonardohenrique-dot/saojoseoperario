-- Conteúdo que antes era fixo no index.html (notícias, eventos e padres).
-- Pode ser rodado mais de uma vez: só insere o que ainda não existe (compara pelo título/nome).
-- Rode no SQL Editor do Neon (depois de as tabelas existirem — o servidor cria ao iniciar).

-- Notícias antigas não devem ser apagadas pela limpeza automática de 2 meses
ALTER TABLE news ADD COLUMN IF NOT EXISTS permanent BOOLEAN NOT NULL DEFAULT false;

-- ---------- NOTÍCIAS ----------
-- "content" (texto completo da página da notícia) fica vazio: a página mostra um texto
-- provisório até você escrever na Área Administrativa (botão "Editar" em Gerenciar publicados).
INSERT INTO news (title, excerpt, content, image_url, category, published_at, permanent)
SELECT v.title, '', '', v.image_url, 'noticia', v.published_at::timestamptz, true
FROM (VALUES
  ('Visita do provincial dos Oblatos de São José Marello', 'imagens/visita.png', '2026-05-06 12:00:00-03'),
  ('Início do tríduo em honra a São José Operário',        'imagens/triduo.png', '2026-04-28 12:00:00-03'),
  ('Celebrações do Sábado Santo na Paróquia',              'imagens/sabado.png', '2026-04-04 12:00:00-03'),
  ('Missa e Procissão no Domingo de Ramos',                'imagens/ramos.png',  '2026-03-29 12:00:00-03')
) AS v(title, image_url, published_at)
WHERE NOT EXISTS (SELECT 1 FROM news n WHERE n.title = v.title);

-- ---------- EVENTOS ----------
-- Datas ainda "a definir" (event_date NULL), como estava no site.
INSERT INTO events (title, event_date, description, image_url)
SELECT v.title, NULL, v.description, ''
FROM (VALUES
  ('Festa do Padroeiro',   'Celebração em honra a São José Operário, com missa, tríduo e confraternização da comunidade. Local: Paróquia São José Operário.'),
  ('Jantar Paroquial',     'Uma noite de partilha e fraternidade. A renda é revertida para as obras da paróquia. Local: Salão paroquial.'),
  ('Encontro de Famílias', 'Tarde de oração, convivência e formação para as famílias da comunidade. Local: Paróquia São José Operário.')
) AS v(title, description)
WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.title = v.title);

-- ---------- PADRES ----------
INSERT INTO priests (name, photo_url, sort_order)
SELECT v.name, v.photo_url, v.ord
FROM (VALUES
  ('Pe. Orestes Monteiro de Melo', 'imagens/orestes.png',  0),
  ('Pe. Giovanni Battista Erittu', 'imagens/giovanni.png', 1),
  ('Pe. John Mark Sebuc Comia',    'imagens/john.png',     2),
  ('Pe. Chinaka Justin Mbaeri',    'imagens/chinaka.png',  3)
) AS v(name, photo_url, ord)
WHERE NOT EXISTS (SELECT 1 FROM priests p WHERE p.name = v.name);

-- ---------- PASTORAIS ----------
-- A tabela "pastorais" é criada pelo servidor (ou pelo schema.sql). Cadastre pela Área Administrativa
-- ou descomente e ajuste o exemplo abaixo:
-- INSERT INTO pastorais (name, logo_url, description, sort_order)
-- SELECT 'Pastoral da Juventude', 'imagens/pastoral-juventude.png', 'Breve descrição.', 0
-- WHERE NOT EXISTS (SELECT 1 FROM pastorais WHERE name = 'Pastoral da Juventude');
