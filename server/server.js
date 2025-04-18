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
        // Railway가 제공하는 MongoDB URL 사용
        const mongoURL = process.env.MONGO_URL || 'mongodb://yamabiko.proxy.rlwy.net:port';
        
        console.log('MongoDB 연결 시도...');
        console.log('연결 주소:', mongoURL.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://****:****@'));
        
        await mongoose.connect(mongoURL);
        console.log('MongoDB 연결 성공');
        
        // 데이터베이스 정보 출력
        const dbName = mongoose.connection.db.databaseName;
        console.log('연결된 데이터베이스:', dbName);
        
        // 컬렉션 생성 확인
        const collections = await mongoose.connection.db.listCollections().toArray();
        if (!collections.find(c => c.name === 'accesstokens')) {
            console.log('accesstokens 컬렉션 생성 중...');
            await mongoose.connection.db.createCollection('accesstokens');
            console.log('accesstokens 컬렉션 생성 완료');
        }

    } catch (err) {
        console.error('MongoDB 연결 실패:', err.message);
        // 연결 실패 시 30초 후 재시도
        setTimeout(connectDB, 30000);
    }
};

// MongoDB 연결 시도
connectDB();

// MongoDB 연결 이벤트 리스너
mongoose.connection.on('connected', () => {
    console.log('MongoDB 연결 상태: 활성');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB 오류 발생:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB 연결 끊김, 재연결 시도...');
    setTimeout(connectDB, 30000);
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

// 임시 토큰 저장소 (메모리에 저장)
const tokens = new Map();

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

// 고객 페이지 라우트
app.get('/customer/:uniqueId/:token', validateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'customer.html'));
});

// 서버 시작
app.listen(port, () => {
    console.log(`서버 실행 중: http://localhost:${port}`);
}); 