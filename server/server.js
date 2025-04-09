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

// 디바이스 데이터 (메모리에 임시 저장)
const devices = new Map();
devices.set('ESP32_001', {
  secret: 'esp32-secret-key',
  command: '',  // 'open' 또는 'close'
  lastUpdate: Date.now()
});

// 디바이스 인증 미들웨어
const authenticateDevice = (req, res, next) => {
  const deviceId = req.params.deviceId;
  const authHeader = req.headers.authorization;
  
  if (!deviceId || !authHeader) {
    return res.status(401).json({ error: '인증 정보 없음' });
  }

  const device = devices.get(deviceId);
  if (!device || device.secret !== authHeader) {
    return res.status(401).json({ error: '잘못된 인증 정보' });
  }

  req.device = device;
  next();
};

// ESP32 상태 확인 엔드포인트
app.get('/api/device/command/:deviceId', authenticateDevice, (req, res) => {
  const device = req.device;
  res.json({ 
    command: device.command,
    timestamp: device.lastUpdate
  });
});

// ESP32 상태 업데이트 엔드포인트
app.post('/api/device/status/:deviceId', authenticateDevice, (req, res) => {
  const device = req.device;
  const { status } = req.body;
  
  device.lastStatus = status;
  device.lastUpdate = Date.now();
  
  res.json({ success: true });
});

// 리모컨 제어 엔드포인트
app.post('/api/control/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const { command, key } = req.body;
  
  const device = devices.get(deviceId);
  if (!device) {
    return res.status(404).json({ error: '디바이스를 찾을 수 없음' });
  }
  
  // 여기에 실제 인증 로직 추가 필요
  if (key !== 'your-control-key') {
    return res.status(401).json({ error: '잘못된 제어 키' });
  }
  
  if (command !== 'open' && command !== 'close') {
    return res.status(400).json({ error: '잘못된 명령' });
  }
  
  device.command = command;
  device.lastUpdate = Date.now();
  
  res.json({ success: true });
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