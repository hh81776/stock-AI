const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 診斷用 — 確認環境變數有沒有被讀到
app.get('/debug', (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    hasKey: !!key,
    keyLength: key ? key.length : 0,
    keyPrefix: key ? key.substring(0, 14) + '...' : 'NOT FOUND',
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'not set'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/analyze', (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey ? apiKey.length : 0);

  if (!apiKey) {
    return res.status(500).json({
      error: { message: '請設定 ANTHROPIC_API_KEY' }
    });
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
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => { data += chunk; });
    apiRes.on('end', () => {
      try {
        res.status(apiRes.statusCode).json(JSON.parse(data));
      } catch (e) {
        res.status(500).json({ error: { message: 'Parse error: ' + e.message } });
      }
    });
  });

  apiReq.on('error', (err) => {
    console.error('Request error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  });

  apiReq.setTimeout(60000, () => {
    apiReq.destroy();
    res.status(504).json({ error: { message: '請求超時，請重試' } });
  });

  apiReq.write(body);
  apiReq.end();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const key = process.env.ANTHROPIC_API_KEY;
  console.log('StockAI running on port ' + PORT);
  console.log('API Key loaded:', !!key, '| Length:', key ? key.length : 0);
});
