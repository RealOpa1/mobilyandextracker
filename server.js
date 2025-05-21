const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/track', (req, res) => {
  const { url, timeSpent, timestamp } = req.body;
  const logEntry = `${new Date(timestamp).toISOString()} - ${url} - Time spent: ${timeSpent}ms\n`;

  fs.appendFile('tracking.log', logEntry, (err) => {
    if (err) {
      console.error('Ошибка записи в лог:', err);
      res.status(500).send('Ошибка записи в лог');
    } else {
      console.log('Запись в лог:', logEntry);
      res.status(200).send('OK');
    }
  });
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
