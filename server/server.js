console.log('🔥 server.js가 실행되고 있습니다!');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const AccessToken = require('./models/AccessToken');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// 환경 변수 체크
const checkRequiredEnvVars = () => {
    const required = ['MONGO_URL', 'SMS_API_KEY', 'SMS_SECRET_KEY', 'SMS_SENDER_NUMBER'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('필수 환경 변수가 설정되지 않았습니다:', missing.join(', '));
        return false;
    }
    return true;
};

// MongoDB 연결 설정
const connectDB = async () => {
    try {
        if (!checkRequiredEnvVars()) {
            throw new Error('필수 환경 변수 누락');
        }

        const mongoURL = process.env.MONGO_URL;
        console.log('MongoDB 연결 시도...');
        
        await mongoose.connect(mongoURL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('MongoDB 연결 성공');
        
    } catch (err) {
        console.error('MongoDB 연결 실패:', err.message);
        throw err; // 에러를 상위로 전파
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

// SMS 설정
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_SECRET_KEY = process.env.SMS_SECRET_KEY;
const SMS_SENDER_NUMBER = process.env.SMS_SENDER_NUMBER;

// SMS 전송 함수
async function sendSMS(phoneNumber, message) {
    try {
        const timestamp = Date.now().toString();
        const response = await axios({
            method: 'POST',
            url: 'https://api-sms.cloud.toast.com/sms/v3.0/appKeys/{APP_KEY}/sender/sms',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'X-Secret-Key': SMS_SECRET_KEY
            },
            data: {
                body: message,
                sendNo: SMS_SENDER_NUMBER,
                recipientList: [{recipientNo: phoneNumber}]
            }
        });
        
        console.log('SMS 전송 성공:', response.data);
        return true;
    } catch (error) {
        console.error('SMS 전송 실패:', error);
        return false;
    }
}

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());

// 디바이스 데이터 (메모리에 임시 저장)
const devices = new Map();
devices.set('ESP32_001', {
  secret: 'esp32-secret-key',
  command: '',  // 'open' 또는 'close'
  lastUpdate: Date.now()
});
devices.set('ESP32_002', {
  secret: 'esp32-secret-key',
  command: '',
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

// 관리자 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 임시 토큰 저장소
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

// 고객 페이지 라우트
app.get('/customer/:uniqueId/:token', validateToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'customer.html'));
});

// 정적 파일 서빙은 마지막에 위치
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  console.log('요청:', req.method, req.url);
  next();
});

// 테스트 라우터는 유지
app.all('/api/test', (req, res) => {
  res.json({ success: true, message: 'API 라우터 정상 동작!' });
});

// 실제 명령 처리 라우터만 남김
const CONTROL_KEY = 'your-control-key';
app.post('/api/control/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const { command, key } = req.body;
  const device = devices.get(deviceId);
  if (!device) {
    return res.status(404).json({ error: '디바이스를 찾을 수 없음' });
  }
  if (key !== CONTROL_KEY) {
    return res.status(401).json({ error: '잘못된 제어 키' });
  }
  if (command !== 'open' && command !== 'close') {
    return res.status(400).json({ error: '잘못된 명령' });
  }
  device.command = command;
  device.lastUpdate = Date.now();
  res.json({ success: true, message: `${command === 'open' ? '열기' : '닫기'} 명령이 전송되었습니다` });
});

// 서버 시작
const startServer = async () => {
    try {
        await connectDB();
        
        // SMS 서비스 설정 확인
        console.log('SMS 서비스 설정 확인...');
        if (SMS_API_KEY && SMS_SECRET_KEY && SMS_SENDER_NUMBER) {
            console.log('SMS 서비스 설정 완료');
        } else {
            console.warn('SMS 서비스가 비활성화됨 - 환경 변수 누락');
        }
        
        app.listen(port, () => {
            console.log(`서버 실행 중: 포트 ${port}`);
            console.log('환경:', process.env.NODE_ENV || 'development');
        });
    } catch (error) {
        console.error('서버 시작 실패:', error);
        process.exit(1);
    }
};

// 서버 시작
console.log('서버 시작 중...');
startServer(); 