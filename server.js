const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 健康檢查
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API Proxy — API Key 安全地存在伺服器環境變數，外部看不到
app.post('/api/analyze', (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: '伺服器未設定 ANTHROPIC_API_KEY，請到 Railway Variables 設定' } });
  }

  const body = JSON.stringify(req.body);

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        res.status(apiRes.statusCode).json(JSON.parse(data));
      } catch (e) {
        res.status(500).json({ error: { message: '回應解析失敗' } });
      }
    });
  });

  apiReq.on('error', (err) => {
    res.status(500).json({ error: { message: err.message } });
  });

  apiReq.write(body);
  apiReq.end();
});

app.listen(PORT, () => {
  console.log(`✅ StockAI 已啟動：http://localhost:${PORT}`);
