const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Proxy
app.post('/api/analyze', (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: '請到 Railway → Variables 設定 ANTHROPIC_API_KEY' }
    });
  }

  const body = JSON.stringify(req.body);
  const bodyLen = Buffer.byteLength(body, 'utf8');

  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': bodyLen,
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.status(apiRes.statusCode).json(parsed);
      } catch (e) {
        res.status(500).json({ error: { message: 'JSON parse error: ' + e.message } });
      }
    });
  });

  apiReq.on('error', (err) => {
    console.error('API request error:', err);
    res.status(500).json({ error: { message: err.message } });
  });

  apiReq.setTimeout(60000, () => {
    apiReq.destroy();
    res.status(504).json({ error: { message: '請求超時，請重試' } });
  });

  apiReq.write(body);
  apiReq.end();
});

// 所有其他路由回傳 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ StockAI running on port ${PORT}`);
});
