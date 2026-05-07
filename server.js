const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// ★ API Key 直接寫在這裡（之後可以改回環境變數）
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/debug', (req, res) => {
  res.json({
    hasKey: !!API_KEY,
    keyLength: API_KEY.length,
    keyPrefix: API_KEY ? API_KEY.substring(0, 14) + '...' : 'NOT FOUND',
    port: PORT,
    env_direct: !!process.env.ANTHROPIC_API_KEY
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/analyze', (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: { message: '請設定 ANTHROPIC_API_KEY' } });
  }
  const body = JSON.stringify(req.body);
  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body, 'utf8'),
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    }
  };
  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => { data += chunk; });
    apiRes.on('end', () => {
      try { res.status(apiRes.statusCode).json(JSON.parse(data)); }
      catch (e) { res.status(500).json({ error: { message: 'Parse error' } }); }
    });
  });
  apiReq.on('error', err => res.status(500).json({ error: { message: err.message } }));
  apiReq.setTimeout(60000, () => { apiReq.destroy(); res.status(504).json({ error: { message: '超時' } }); });
  apiReq.write(body);
  apiReq.end();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('StockAI port=' + PORT + ' key=' + (API_KEY ? 'SET len=' + API_KEY.length : 'NOT SET'));
});

