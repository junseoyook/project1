const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 디바이스 데이터 (메모리에 임시 저장)
const devices = new Map();
devices.set('ESP32_001', {
  secret: 'esp32-secret-key',
  command: '',  // 'open' 또는 'close'
  lastUpdate: Date.now()
});

// 임시 토큰 저장소
const tokens = new Map();

// 리모컨 제어 엔드포인트
app.post('/api/control/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const { command, key } = req.body;
  
  const device = devices.get(deviceId);
  if (!device) {
    return res.status(404).json({ error: '디바이스를 찾을 수 없음' });
  }
  
  // 상태 확인 요청 처리
  if (command === 'status') {
    return res.json({ 
      success: true,
      status: 'connected',
      lastCommand: device.command,
      lastUpdate: device.lastUpdate
    });
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
  
  res.json({ 
    success: true,
    message: `${command === 'open' ? '열기' : '닫기'} 명령이 전송되었습니다`
  });
});

// 토큰 생성 엔드포인트
app.post('/api/generate-token', (req, res) => {
    try {
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const token = crypto.randomBytes(32).toString('hex');
        
        // 토큰 정보 저장
        tokens.set(uniqueId, {
            token,
            createdAt: new Date(),
            usageCount: 0
        });

        res.json({
            success: true,
            url: `${uniqueId}/${token}`
        });
    } catch (error) {
        console.error('토큰 생성 오류:', error);
        res.status(500).json({ error: '토큰 생성 실패' });
    }
});

// 토큰 검증 미들웨어
const validateToken = (req, res, next) => {
    const { uniqueId, token } = req.params;
    const tokenData = tokens.get(uniqueId);
    
    if (!tokenData || tokenData.token !== token) {
        return res.status(403).send('잘못된 토큰입니다.');
    }
    
    if (tokenData.usageCount >= 10) {
        return res.status(403).send('사용 횟수를 초과했습니다.');
    }
    
    // 24시간 체크
    const now = new Date();
    const diff = now - tokenData.createdAt;
    if (diff > 24 * 60 * 60 * 1000) {
        tokens.delete(uniqueId);
        return res.status(403).send('만료된 토큰입니다.');
    }
    
    // 사용 횟수 증가
    tokenData.usageCount += 1;
    next();
};

// 관리자 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 고객 페이지 라우트
app.get('/customer/:uniqueId/:token', validateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

// 서버 시작
app.listen(port, () => {
    console.log(`서버 실행 중: 포트 ${port}`);
}); 