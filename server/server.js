const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parking-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB 연결 성공'))
.catch(err => console.error('MongoDB 연결 실패:', err));

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// 디바이스 데이터
const devices = new Map();
devices.set('ESP32_001', {
  secret: 'esp32-secret-key',
  shouldOpen: false,
  shouldClose: false
});

// API 라우트
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// 관리자 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 고객용 리모컨 페이지
app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'customer.html'));
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
}); 