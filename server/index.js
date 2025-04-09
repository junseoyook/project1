const express = require('express');
const cors = require('cors');
const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 현재 차단기 상태 (테스트용)
let barrierState = 'closed';

// ESP32 디바이스 인증키 (실제 운영시에는 환경변수로 관리해야 함)
const DEVICE_SECRET = 'esp32-secret-key';

// 기본 경로
app.get('/', (req, res) => {
  res.send('주차 관리 시스템 서버');
});

// 차단기 상태 확인
app.get('/api/barrier/status', (req, res) => {
  res.json({ status: barrierState });
});

// 차단기 제어 명령
app.post('/api/barrier/control', (req, res) => {
  const { action } = req.body;
  if (action === 'open' || action === 'close') {
    barrierState = action;
    res.json({ success: true, status: barrierState });
  } else {
    res.status(400).json({ success: false, message: '잘못된 명령입니다.' });
  }
});

// ESP32 명령 확인 엔드포인트
app.get('/api/device/command/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const authHeader = req.headers.authorization;

  // 디바이스 인증 확인
  if (authHeader !== DEVICE_SECRET) {
    return res.status(401).json({ error: '인증 실패' });
  }

  // 현재 상태에 따라 명령 전송
  res.json({ command: barrierState === 'open' ? 'open' : 'close' });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 