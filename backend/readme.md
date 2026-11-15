# Backend — Paróquia São José Operário

Node.js + Express + **Postgres** (banco hospedado). Também serve o site (index.html e imagens).

## Rodar
```
cd backend
npm install
cp .env.example .env     # preencha DATABASE_URL e JWT_SECRET
npm run create-admin -- "Nome" email@paroquia.com senhaForte123
npm start
```
Abra http://localhost:3000

## Banco de dados (Neon)
1. Em https://neon.tech crie um projeto (grátis) e copie a *connection string* (Dashboard → Connect).
2. Cole em `DATABASE_URL` no `.env` (veja `.env.example`). Na hospedagem (Render, Railway etc.), cadastre `DATABASE_URL` e `JWT_SECRET` como variáveis de ambiente.
3. As tabelas são criadas sozinhas na primeira execução (ou rode `schema.sql` no SQL Editor do Neon): `candles`, `priests`, `news`, `events`, `thoughts`, `users`.
O banco é **privado**: só o servidor acessa, pela senha da connection string.

**Vela em outros computadores:** a vela só é compartilhada quando o site é aberto pelo servidor (a página chama `/api/candles`). Se abrir o `index.html` direto do disco ou numa hospedagem estática sem o backend, o site cai no modo local (vela só naquele aparelho).

## Imagens
Na Área Administrativa o botão "Escolher imagem" abre o explorador de arquivos do computador; a imagem é reduzida no navegador e salva **no banco** (tabela `images`), pois o disco do Render é temporário. Rotas: `POST /api/uploads` (administrativo, corpo = bytes da imagem) e `GET /api/images/:id` (público). Aceita PNG, JPG, WEBP e GIF (máx. 6 MB).

## Moderação das velas
`src/moderation.js`: lista de palavras (edite `BLOCKED`) + modelo de IA da OpenAI (`gpt-4o-mini`, permissão *Chat completions*) que entende duplo sentido e nomes de brincadeira; se ele falhar, tenta a moderação padrão (*Moderations*). Se tudo falhar, a vela é aceita e o erro vai para o log. `GET /api/health` mostra se a IA está ativa (`filtro_velas.ia`). Nunca coloque a chave no código nem no `.env.example`.

## Limpeza automática
A cada 6h (e ao iniciar) o servidor apaga notícias com mais de 2 meses (eventos futuros ficam) e velas com mais de 48h.

## Rotas
- `POST /api/auth/login`, `/register`, `GET /api/auth/me`
- `GET /api/priests` (público) · `POST`/`DELETE /api/priests/:id` (administrativo) — nome e foto
- `GET /api/events` (público) · `POST`/`DELETE /api/events/:id` (administrativo) — título, data e descrição
- `GET /api/news` (público) · `POST`/`DELETE /api/news/:id` (administrativo) — campos: category (noticia|evento), event_date, registration_url
- `GET/POST /api/candles` (público, 3 velas/hora por IP) · `DELETE` (administrativo)
- `GET /api/thoughts/today` (público) · `GET/POST/DELETE /api/thoughts` (administrativo)

## Segurança
Nunca suba o `.env`. Use HTTPS em produção. Confira a fonte de cada pensamento antes de cadastrar.
