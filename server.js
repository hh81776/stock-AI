const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// ★★★ 把你的 API Key 貼在這裡 ★★★


const API_KEY = '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';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/debug', (req, res) => {
  res.json({
    hasKey: !!API_KEY && API_KEY !== '在這裡貼上你的sk-ant-api03-開頭的Key',
    keyLength: API_KEY.length,
    port: PORT
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/analyze', (req, res) => {
  const key = API_KEY;
  if (!key || key.includes('在這裡')) {
    return res.status(500).json({ error: { message: '請在 server.js 第8行填入 API Key' } });
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
      'x-api-key': key,
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
  apiReq.setTimeout(60000, () => { apiReq.destroy(); res.status(504).json({ error: { message: '超時請重試' } }); });
  apiReq.write(body);
  apiReq.end();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('StockAI port=' + PORT);
});


