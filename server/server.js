const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const AccessToken = require('./models/AccessToken');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB 연결 설정
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('MongoDB 연결 시도...');
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다.');
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB 연결 성공');
  } catch (err) {
    console.error('MongoDB 연결 실패:', err.message);
    // 연결 실패 시 1분 후 재시도
    setTimeout(connectDB, 60000);
  }
};

// MongoDB 연결 시도
connectDB();

// MongoDB 연결 이벤트 리스너
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB 연결이 끊어졌습니다. 재연결 시도...');
  setTimeout(connectDB, 60000);
});

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

// 관리자 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 토큰 생성 엔드포인트
app.post('/api/generate-token', async (req, res) => {
    try {
        console.log('토큰 생성 시작');
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB 연결이 끊어졌습니다');
        }
        
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const token = crypto.randomBytes(32).toString('hex');
        
        console.log('토큰 생성됨:', { uniqueId, token });
        
        const accessToken = new AccessToken({
            uniqueId,
            token,
            usageCount: 0,
            createdAt: new Date(),
            lastUsed: null
        });
        
        console.log('AccessToken 모델 생성됨:', accessToken);
        
        const savedToken = await accessToken.save();
        console.log('토큰 저장 완료:', savedToken);
        
        res.json({
            url: `${uniqueId}/${token}`
        });
    } catch (error) {
        console.error('토큰 생성 상세 오류:', error);
        res.status(500).json({ 
            error: '토큰 생성 실패',
            details: error.message,
            stack: error.stack
        });
    }
});

// 토큰 검증 미들웨어
const validateToken = async (req, res, next) => {
    const { uniqueId, token } = req.params;
    
    try {
        const accessToken = await AccessToken.findOne({ uniqueId });
        
        if (!accessToken) {
            return res.status(404).send('잘못된 접근입니다.');
        }
        
        if (accessToken.token !== token) {
            return res.status(403).send('잘못된 토큰입니다.');
        }
        
        if (accessToken.usageCount >= 10) {
            return res.status(403).send('사용 횟수를 초과했습니다.');
        }
        
        // 사용 횟수 증가 및 마지막 사용 시간 업데이트
        accessToken.usageCount += 1;
        accessToken.lastUsed = new Date();
        await accessToken.save();
        
        next();
    } catch (error) {
        console.error('토큰 검증 오류:', error);
        res.status(500).send('서버 오류');
    }
};

// 토큰 기반 고객 페이지 라우트
app.get('/customer/:uniqueId/:token', validateToken, (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '..', 'public', 'customer.html'));
    } catch (error) {
        console.error('고객 페이지 로드 오류:', error);
        res.status(500).send('페이지를 불러올 수 없습니다.');
    }
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
}); 