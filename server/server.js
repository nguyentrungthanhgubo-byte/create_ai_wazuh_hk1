require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const routes = require('./routes/chat.route');
const { initDB } = require('./config/db');
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', routes);
(async () => {
  await initDB();
  app.listen(Number(process.env.PORT || 3001), '0.0.0.0', () =>
    console.log('Wazuh AI Node API listening on port ' + (process.env.PORT || 3001)));
})().catch(err => { console.error(err); process.exit(1); });
