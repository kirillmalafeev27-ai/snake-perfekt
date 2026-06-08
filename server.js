const express = require('express');
const path = require('path');
const { installSnakeRoutes } = require('./snake-generation');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
installSnakeRoutes(app);
app.use(express.static(__dirname));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`Snake Perfekt running on http://localhost:${PORT}`);
});
