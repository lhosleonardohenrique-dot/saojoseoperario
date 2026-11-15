require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDb, cleanup } = require('./db');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', paroquia: 'São José Operário' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/news', require('./routes/news'));
app.use('/api/events', require('./routes/events'));
app.use('/api/priests', require('./routes/priests'));
app.use('/api', require('./routes/uploads'));
app.use('/api/pastorais', require('./routes/pastorais'));
app.use('/api/candles', require('./routes/candles'));
app.use('/api/thoughts', require('./routes/thoughts'));

// Serve o site (somente index.html e imagens — o código do backend nunca fica exposto)
const root = path.join(__dirname, '..', '..');
app.use('/imagens', express.static(path.join(root, 'imagens')));
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(root, 'index.html')));
app.get(['/pastoral', '/pastoral.html'], (req, res) => res.sendFile(path.join(root, 'pastoral.html')));
app.get(['/noticia', '/noticia.html'], (req, res) => res.sendFile(path.join(root, 'noticia.html')));

const PORT = process.env.PORT || 3000;
initDb()
  .then(() => {
    cleanup().catch(console.error);
    setInterval(() => cleanup().catch(console.error), 6 * 60 * 60 * 1000);
    app.listen(PORT, () => console.log(`Servidor da Paróquia ativo na porta ${PORT}`));
  })
  .catch((e) => { console.error('Falha ao conectar no banco (confira DATABASE_URL):', e.message); process.exit(1); });
