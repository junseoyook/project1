require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

// 환경변수 디버깅
console.log('==== 환경변수 디버깅 시작 ====');
console.log('process.env:', {
  SOLAPI_API_KEY: process.env.SOLAPI_API_KEY || '없음',
  SOLAPI_API_SECRET: process.env.SOLAPI_API_SECRET ? '설정됨' : '없음',
  SOLAPI_PFID: process.env.SOLAPI_PFID || '없음',
  SWITCHBOT_TOKEN: process.env.SWITCHBOT_TOKEN ? '설정됨' : '없음',
  SWITCHBOT_SECRET: process.env.SWITCHBOT_SECRET ? '설정됨' : '없음',
  SWITCHBOT_DEVICE_ID: process.env.SWITCHBOT_DEVICE_ID || '없음',
  BASE_URL: process.env.BASE_URL || '없음',
  NODE_ENV: process.env.NODE_ENV || '없음'
});

const app = express();
app.use(cors());
app.use(express.json());

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// 정적 파일 제공 설정
app.use(express.static('public'));

// 메인 페이지 라우트
app.get('/', (req, res) => {
  res.render('index', {
    API_KEY: process.env.API_KEY
  });
});

// 필수 환경변수 확인 및 설정
const requiredEnvVars = {
  SOLAPI_API_KEY: process.env.SOLAPI_API_KEY,
  SOLAPI_API_SECRET: process.env.SOLAPI_API_SECRET,
  SOLAPI_PFID: process.env.SOLAPI_PFID,
  BASE_URL: process.env.BASE_URL
};

// 선택적 환경변수
const optionalEnvVars = {
  SWITCHBOT_TOKEN: process.env.SWITCHBOT_TOKEN,
  SWITCHBOT_SECRET: process.env.SWITCHBOT_SECRET,
  SWITCHBOT_DEVICE_ID: process.env.SWITCHBOT_DEVICE_ID
};

// 환경변수 유효성 검사
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('필수 환경변수가 설정되지 않았습니다:', missingVars.join(', '));
  process.exit(1); // 필수 환경변수가 없으면 서버 실행 중단
}

// 환경변수 설정
const {
  SOLAPI_API_KEY,
  SOLAPI_API_SECRET,
  SOLAPI_PFID,
  BASE_URL
} = requiredEnvVars;

// 선택적 환경변수 설정
const SENDER_PHONE = process.env.SENDER_PHONE || '01029949608';
const TOKEN_EXPIRY_HOURS = parseInt(process.env.TOKEN_EXPIRY_HOURS || '24', 10);
const MAX_TOKEN_USES = parseInt(process.env.MAX_TOKEN_USES || '10', 10);

// 설정된 환경변수 로깅
console.log('=== 환경변수 설정 상태 ===');
console.log('SOLAPI_API_KEY:', SOLAPI_API_KEY);
console.log('SOLAPI_API_SECRET: [설정됨]');
console.log('SOLAPI_PFID:', SOLAPI_PFID);
console.log('BASE_URL:', BASE_URL);
console.log('SENDER_PHONE:', SENDER_PHONE);
console.log('TOKEN_EXPIRY_HOURS:', TOKEN_EXPIRY_HOURS);
console.log('MAX_TOKEN_USES:', MAX_TOKEN_USES);

// 토큰 저장소
const tokens = new Map();

// 토큰 히스토리 저장소
const tokenHistory = new Map();

// 환경변수에 API 키 추가
const API_KEY = process.env.API_KEY || 'your-secret-api-key';

// API 키 검증 미들웨어
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  console.log('받은 API 키:', apiKey);
  console.log('설정된 API 키:', API_KEY);
  
  if (!apiKey || apiKey !== API_KEY) {
    console.log('API 키 검증 실패');
    return res.status(401).json({
      success: false,
      error: '유효하지 않은 API 키입니다.'
    });
  }
  console.log('API 키 검증 성공');
  next();
};

// 토큰 생성 함수
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Solapi 인증 헤더 생성 함수
function getAuthHeader() {
  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET) {
    throw new Error('API 키 또는 시크릿이 설정되지 않았습니다.');
  }

  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString('hex');
  
  try {
    console.log('인증 정보 생성 시도:', {
      apiKey: SOLAPI_API_KEY,
      date,
      salt: salt.substring(0, 10) + '...'
    });

    const signature = crypto
      .createHmac('sha256', SOLAPI_API_SECRET)
      .update(date + salt)
      .digest('hex');

    const authorization = `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;

    console.log('생성된 Authorization:', authorization.substring(0, 50) + '...');

    return {
      'Authorization': authorization,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('인증 헤더 생성 실패:', error);
    throw error;
  }
}

// SwitchBot API 헤더 생성 함수
function getSwitchBotHeaders() {
  const t = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const data = SWITCHBOT_TOKEN + t + nonce;
  const sign = crypto
    .createHmac('sha256', SWITCHBOT_SECRET)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  return {
    'Authorization': SWITCHBOT_TOKEN,
    'sign': sign,
    't': t.toString(),
    'nonce': nonce,
    'Content-Type': 'application/json'
  };
}

// 현관문 제어 함수 (프로토타입)
async function controlDoor(command) {
  console.log(`[프로토타입] 현관문 ${command} 요청 처리`);
  
  // 실제 API 호출 대신 성공 응답 반환
  return {
    statusCode: 200,
    body: {
      message: `현관문 ${command} 요청이 성공적으로 처리되었습니다.`,
      status: 'success'
    }
  };
}

// 토큰 검증 함수
function validateToken(token) {
  const tokenData = tokens.get(token);
  if (!tokenData) {
    return { isValid: false, reason: '존재하지 않는 토큰입니다.' };
  }

  const now = new Date();
  const expiryTime = new Date(tokenData.createdAt);
  expiryTime.setHours(expiryTime.getHours() + tokenData.expiryHours);

  if (now > expiryTime) {
    return { isValid: false, reason: '만료된 토큰입니다.' };
  }

  if (tokenData.useCount >= tokenData.maxUses) {
    return { isValid: false, reason: '사용 횟수를 초과했습니다.' };
  }

  return { 
    isValid: true,
    remainingUses: tokenData.maxUses - tokenData.useCount,
    expiresIn: Math.floor((expiryTime - now) / (1000 * 60 * 60)) + '시간'
  };
}

// 토큰 저장 함수
async function saveToken(token, phoneNumber, type, expiryHours) {
  const timestamp = new Date();
  const tokenData = {
    phoneNumber,
    type,
    createdAt: timestamp,
    expiryHours: parseInt(expiryHours, 10),
    useCount: 0,
    lastUsed: null,
    maxUses: type === 'door' ? 5 : 10 // 현관문은 5회, 주차장은 10회로 제한
  };
  
  // 토큰 데이터 저장
  tokens.set(token, tokenData);
  
  // 히스토리에 기록
  const historyEntry = {
    token,
    phoneNumber,
    createdAt: timestamp,
    url: `${BASE_URL}/customer/${token}`,
    status: 'active',
    useCount: 0,
    lastUsed: null
  };
  tokenHistory.set(token, historyEntry);
  
  console.log('토큰 저장됨:', { token, phoneNumber, type, expiryHours });
}

// 토큰 사용 함수
function useToken(token) {
  const tokenData = tokens.get(token);
  const historyEntry = tokenHistory.get(token);
  
  if (tokenData && historyEntry) {
    const now = new Date();
    tokenData.useCount += 1;
    tokenData.lastUsed = now;
    tokens.set(token, tokenData);
    
    historyEntry.useCount = tokenData.useCount;
    historyEntry.lastUsed = now;
    tokenHistory.set(token, historyEntry);
    
    console.log('토큰 사용됨:', { token, useCount: tokenData.useCount });
  }
}

// 날짜 포맷 함수 (오늘/내일)
function getTodayTomorrowTimeStrings() {
  return {
    checkInTime: '오늘 16:00',
    checkOutTime: '내일 11:00'
  };
}
const { checkInTime, checkOutTime } = getTodayTomorrowTimeStrings();

// 알림톡 발송 함수 (주차장만)
async function sendKakaoNotification(phoneNumber, parkingToken) {
  try {
    const parkingUrl = `${BASE_URL}/parking.html?token=${parkingToken}`;
    const { checkInTime, checkOutTime } = getTodayTomorrowTimeStrings();
    console.log('[알림톡] 발송 시도:', {
      phoneNumber,
      parkingUrl,
      SOLAPI_API_KEY: SOLAPI_API_KEY ? '설정됨' : '미설정',
      SOLAPI_PFID: SOLAPI_PFID,
      SENDER_PHONE: SENDER_PHONE
    });

    const messageData = {
      message: {
        to: phoneNumber,
        from: SENDER_PHONE,
        kakaoOptions: {
          pfId: SOLAPI_PFID,
          templateId: "KA01TP250418063541272b3uS4NHhfLo",
          variables: {
            "#{customerName}": ,
            "#{pariking Url}": parkingUrl,
            "#{entry Url}": "비밀번호: 1234*",
            "#{checkInTime}": checkInTime,
            "#{checkOutTime}": checkOutTime
          }
        }
      }
    };

    console.log('[알림톡] 전송할 메시지:', JSON.stringify(messageData, null, 2));

    const headers = getAuthHeader();
    console.log('[알림톡] 요청 헤더:', headers);

    const response = await axios({
      method: 'post',
      url: 'https://api.solapi.com/messages/v4/send',
      headers: headers,
      data: messageData
    });

    console.log('[알림톡] 발송 성공:', response.data);
    return true;
  } catch (error) {
    console.error('[알림톡] 발송 실패:', error.response?.data || error.message);
    return false;
  }
}

// HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server });

// WebSocket 연결 관리
wss.on('connection', (ws) => {
    console.log('새로운 WebSocket 연결');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('수신된 WebSocket 메시지:', data);

            // ESP32로 명령 전달 (실제 구현 필요)
            // 여기서는 성공 응답만 보냄
            ws.send(JSON.stringify({
                status: 'success',
                message: '명령이 전송되었습니다.',
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error('WebSocket 메시지 처리 오류:', error);
            ws.send(JSON.stringify({
                status: 'error',
                message: '명령 처리 중 오류가 발생했습니다.'
            }));
        }
    });

    ws.on('close', () => {
        console.log('WebSocket 연결 종료');
    });
});

// 고객 페이지 라우트 핸들러 수정
app.get('/customer/:token', (req, res) => {
    const { token } = req.params;
    const validation = validateToken(token);
    
    if (!validation.isValid) {
        res.status(400).send(`
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>오류</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #f5f5f5;
                        }
                        .error-container {
                            text-align: center;
                            padding: 20px;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .error-message {
                            color: #dc3545;
                            margin-bottom: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <div class="error-message">${validation.reason}</div>
                    </div>
                </body>
            </html>
        `);
        return;
    }

    const tokenData = tokens.get(token);
    
    // 토큰 타입에 따라 다른 페이지로 리다이렉션
    if (tokenData.type === 'door') {
        res.sendFile('door.html', { root: './public' });
    } else {
        res.sendFile('parking.html', { root: './public' });
    }
});

// 토큰 검증 API 엔드포인트
app.post('/api/tokens/validate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: '토큰이 제공되지 않았습니다.'
      });
    }

    const validation = validateToken(token);
    
    if (validation.isValid) {
      res.json({
        success: true,
        valid: true,
        remainingUses: validation.remainingUses,
        expiresIn: validation.expiresIn
      });
    } else {
      res.status(400).json({
        success: false,
        valid: false,
        message: validation.reason
      });
    }
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: '토큰 검증 중 오류가 발생했습니다.'
    });
  }
});

// 토큰 생성 API 엔드포인트
app.post('/api/generate-tokens', validateApiKey, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    console.log('[토큰 생성] 요청 받음:', { phoneNumber });

    if (!phoneNumber) {
      console.log('[토큰 생성] 전화번호 누락');
      return res.status(400).json({
        success: false,
        error: '전화번호는 필수입니다.'
      });
    }

    // 주차장 토큰만 생성
    const parkingToken = generateToken();
    console.log('[토큰 생성] 주차장 토큰 생성됨:', parkingToken);

    // 토큰 저장
    const timestamp = new Date();
    const parkingTokenData = {
      phoneNumber,
      type: 'parking',
      createdAt: timestamp,
      expiryHours: 24,
      useCount: 0,
      lastUsed: null,
      maxUses: 10
    };
    tokens.set(parkingToken, parkingTokenData);

    // URL 생성
    const parkingUrl = `${BASE_URL}/parking.html?token=${parkingToken}`;
    console.log('[토큰 생성] 생성된 URL:', parkingUrl);

    try {
      // 알림톡 발송
      const notificationSent = await sendKakaoNotification(phoneNumber, parkingToken);
      console.log('[토큰 생성] 알림톡 발송 결과:', notificationSent);

      const response = {
        success: true,
        parkingUrl,
        message: notificationSent ? 
          '토큰이 생성되었으며 알림톡이 발송되었습니다.' : 
          '토큰이 생성되었으나 알림톡 발송에 실패했습니다. URL을 직접 복사해주세요.'
      };

      console.log('[토큰 생성] 응답:', response);
      res.json(response);
    } catch (error) {
      console.error('[토큰 생성] 알림톡 발송 중 에러:', error);
      res.json({
        success: true,
        parkingUrl,
        message: '토큰이 생성되었으나 알림톡 발송에 실패했습니다. URL을 직접 복사해주세요.'
      });
    }
  } catch (error) {
    console.error('[토큰 생성] 치명적 에러:', error);
    res.status(500).json({
      success: false,
      error: '토큰 생성에 실패했습니다.'
    });
  }
});

// 토큰 히스토리 조회 API 엔드포인트 추가
app.get('/api/token-history', (req, res) => {
  try {
    const history = Array.from(tokenHistory.values())
      .sort((a, b) => b.createdAt - a.createdAt) // 최신순 정렬
      .map(entry => {
        const validation = validateToken(entry.token);
        return {
          ...entry,
          isValid: validation.isValid,
          status: validation.isValid ? 'active' : 'expired'
        };
      });
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('토큰 히스토리 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '토큰 히스토리 조회 중 오류가 발생했습니다.'
    });
  }
});

// 대시보드 통계 API 엔드포인트
app.get('/api/dashboard-stats', (req, res) => {
    try {
        // 현재 시간 기준으로 통계 계산
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let todayTokens = 0;
        let activeTokens = 0;
        let expiredTokens = 0;
        const tokenHistory = [];

        // 토큰 데이터 분석
        Array.from(tokens.entries()).forEach(([token, data]) => {
            const tokenUrl = `${BASE_URL}/customer/${token}`;
            const validation = validateToken(token);
            
            // 오늘 생성된 토큰 카운트
            if (data.createdAt >= today) {
                todayTokens++;
            }

            // 활성/만료 토큰 카운트
            if (validation.isValid) {
                activeTokens++;
            } else {
                expiredTokens++;
            }

            // 토큰 히스토리에 추가
            tokenHistory.push({
                timestamp: data.createdAt,
                phoneNumber: data.phoneNumber,
                url: tokenUrl,
                status: validation.isValid ? '활성' : '만료',
                usageCount: data.useCount,
                lastUsed: data.lastUsed
            });
        });

        // 최근 순으로 정렬
        tokenHistory.sort((a, b) => b.timestamp - a.timestamp);

        res.json({
            success: true,
            stats: {
                todayTokens,
                activeTokens,
                expiredTokens
            },
            recentEntries: tokenHistory.slice(0, 10) // 최근 10개만 반환
        });
    } catch (error) {
        console.error('대시보드 통계 조회 실패:', error);
        res.status(500).json({
            success: false,
            error: '대시보드 통계 조회 중 오류가 발생했습니다.'
        });
    }
});

// 일별 통계 API 엔드포인트
app.get('/api/stats/daily', validateApiKey, (req, res) => {
    try {
        const date = req.query.date;
        if (!date) {
            return res.status(400).json({
                success: false,
                error: '날짜가 제공되지 않았습니다.'
            });
        }

        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        // 해당 날짜의 토큰 필터링
        const dailyTokens = Array.from(tokens.entries())
            .filter(([_, data]) => {
                const tokenDate = new Date(data.createdAt);
                return tokenDate >= startDate && tokenDate <= endDate;
            });

        // 통계 계산
        let totalIssued = 0;
        let parkingUsed = 0;
        let doorUsed = 0;
        const details = [];

        dailyTokens.forEach(([token, data]) => {
            if (data.type === 'parking') {
                totalIssued++;
                parkingUsed += data.useCount;
            } else if (data.type === 'door') {
                doorUsed += data.useCount;
            }

            // 만료 여부 확인
            const now = new Date();
            const expiryTime = new Date(data.createdAt);
            expiryTime.setHours(expiryTime.getHours() + data.expiryHours);
            const isExpired = now > expiryTime || data.useCount >= data.maxUses;

            details.push({
                issuedAt: data.createdAt,
                phoneNumber: data.phoneNumber,
                parkingUrl: `${BASE_URL}/parking.html?token=${token}`,
                doorUrl: `${BASE_URL}/door.html?token=${token}`,
                parkingUsageCount: data.type === 'parking' ? data.useCount : 0,
                doorUsageCount: data.type === 'door' ? data.useCount : 0,
                isExpired: isExpired
            });
        });

        // 시간순 정렬
        details.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

        res.json({
            success: true,
            stats: {
                totalIssued,
                parkingUsed,
                doorUsed
            },
            details: details
        });
    } catch (error) {
        console.error('일별 통계 조회 실패:', error);
        res.status(500).json({
            success: false,
            error: '통계 조회 중 오류가 발생했습니다.'
        });
    }
});

// 월별 통계 API 엔드포인트
app.get('/api/stats/monthly', validateApiKey, (req, res) => {
    try {
        const month = req.query.month; // 형식: YYYY-MM
        if (!month) {
            return res.status(400).json({
                success: false,
                error: '월이 제공되지 않았습니다.'
            });
        }

        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

        // 해당 월의 토큰 필터링
        const monthlyTokens = Array.from(tokens.entries())
            .filter(([_, data]) => {
                const tokenDate = new Date(data.createdAt);
                return tokenDate >= startDate && tokenDate <= endDate;
            });

        // 전체 통계 계산
        let totalIssued = 0;
        let parkingUsed = 0;
        let doorUsed = 0;

        // 일별 통계를 위한 맵 초기화
        const dailyStatsMap = new Map();
        const daysInMonth = endDate.getDate();

        // 월의 모든 날짜에 대한 기본 통계 초기화
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, monthNum - 1, day);
            dailyStatsMap.set(currentDate.toISOString().split('T')[0], {
                date: currentDate,
                issuedCount: 0,
                parkingUsed: 0,
                doorUsed: 0,
                activeTokens: 0,
                expiredTokens: 0
            });
        }

        // 토큰 데이터로 통계 계산
        monthlyTokens.forEach(([token, data]) => {
            const tokenDate = new Date(data.createdAt);
            const dateKey = tokenDate.toISOString().split('T')[0];
            const dailyStats = dailyStatsMap.get(dateKey);

            if (data.type === 'parking') {
                totalIssued++;
                parkingUsed += data.useCount;
                dailyStats.issuedCount++;
                dailyStats.parkingUsed += data.useCount;
            } else if (data.type === 'door') {
                doorUsed += data.useCount;
                dailyStats.doorUsed += data.useCount;
            }

            // 만료 여부 확인
            const now = new Date();
            const expiryTime = new Date(data.createdAt);
            expiryTime.setHours(expiryTime.getHours() + data.expiryHours);
            const isExpired = now > expiryTime || data.useCount >= data.maxUses;

            if (isExpired) {
                dailyStats.expiredTokens++;
            } else {
                dailyStats.activeTokens++;
            }
        });

        // 일별 통계를 배열로 변환
        const dailyStats = Array.from(dailyStatsMap.values());

        res.json({
            success: true,
            stats: {
                totalIssued,
                parkingUsed,
                doorUsed
            },
            dailyStats: dailyStats
        });
    } catch (error) {
        console.error('월별 통계 조회 실패:', error);
        res.status(500).json({
            success: false,
            error: '통계 조회 중 오류가 발생했습니다.'
        });
    }
});

// 토큰 동시 생성 함수
async function generateBothTokens(phoneNumber, checkInDate, checkOutDate) {
  try {
    // 주차장과 현관문 토큰 생성
    const parkingToken = generateToken();
    const doorToken = generateToken();
    
    // 체크인/아웃 시간을 기반으로 유효 시간 계산
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const durationHours = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60));
    
    // 토큰 저장
    await Promise.all([
      saveToken(parkingToken, phoneNumber, 'parking', durationHours),
      saveToken(doorToken, phoneNumber, 'door', durationHours)
    ]);

    // 알림톡 발송 (두 URL을 하나의 메시지로)
    const parkingUrl = `${BASE_URL}/customer/${parkingToken}`;
    const doorUrl = `${BASE_URL}/customer/${doorToken}`;
    const { checkInTime, checkOutTime } = getTodayTomorrowTimeStrings();

    const messageData = {
      message: {
        to: phoneNumber,
        from: SENDER_PHONE,
        kakaoOptions: {
          pfId: SOLAPI_PFID,
          templateId: "KA01TP250418063541272b3uS4NHhfLo",
          variables: {
            "#{customerName}": "고객님",
            "#{parkingUrl}": parkingUrl,
            "#{doorUrl}": doorUrl,
            "#{checkInTime}": checkInTime,
            "#{checkOutTime}": checkOutTime
          }
        }
      }
    };

    const result = await axios({
      method: 'post',
      url: 'https://api.solapi.com/messages/v4/send',
      headers: getAuthHeader(),
      data: messageData
    });

    return {
      success: true,
      parkingToken,
      doorToken,
      parkingUrl,
      doorUrl,
      messageResult: result.data
    };
  } catch (error) {
    console.error('토큰 생성 실패:', error);
    throw error;
  }
}

// Make.com 연동을 위한 새로운 API 엔드포인트
app.post('/api/reservation/tokens', validateApiKey, async (req, res) => {
  try {
    const { phoneNumber, checkInDate, checkOutDate } = req.body;

    // 필수 파라미터 검증
    if (!phoneNumber || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        error: '필수 파라미터가 누락되었습니다. (phoneNumber, checkInDate, checkOutDate)'
      });
    }

    // 날짜 형식 검증
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 날짜 형식입니다.'
      });
    }

    // 토큰 생성 및 알림톡 발송
    const result = await generateBothTokens(phoneNumber, checkInDate, checkOutDate);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('예약 토큰 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: '토큰 생성 중 오류가 발생했습니다: ' + error.message
    });
  }
});

// 주차장 리모컨 페이지 라우트
app.get('/parking.html', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'parking.html'));
});

// 현관문 리모컨 페이지 라우트
app.get('/door.html', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'door.html'));
});

// ====== 디바이스 명령 저장소 및 엔드포인트 추가 ======
const deviceCommands = {};

// 명령 저장 (POST)
app.post('/api/device/command/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: '명령이 필요합니다.' });
  }
  deviceCommands[deviceId] = command;
  res.json({ success: true });
});

// 명령 조회 (GET)
app.get('/api/device/command/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const command = deviceCommands[deviceId] || null;
  res.json({ command });
});

// ====== 디바이스 상태 저장소 및 상태 조회 엔드포인트 추가 ======
const deviceStatus = {};

// 상태 저장 (기존 POST /api/device/status/:deviceId에서 추가)
app.post('/api/device/status/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const { status } = req.body;
  if (status) {
    deviceStatus[deviceId] = status;
  }
  res.json({ success: true });
});

// 상태 조회 (GET)
app.get('/api/device/status/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const status = deviceStatus[deviceId] || null;
  res.json({ status });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`서버 실행 중: 포트 ${PORT}`);
  console.log('환경변수 상태:');
  console.log('BASE_URL:', process.env.BASE_URL);
  console.log('SOLAPI_API_KEY:', process.env.SOLAPI_API_KEY ? '설정됨' : '미설정');
  console.log('SOLAPI_API_SECRET:', process.env.SOLAPI_API_SECRET ? '설정됨' : '미설정');
  console.log('SOLAPI_PFID:', process.env.SOLAPI_PFID ? '설정됨' : '미설정');
  console.log('SWITCHBOT_TOKEN:', process.env.SWITCHBOT_TOKEN ? '설정됨' : '미설정');
  console.log('SWITCHBOT_SECRET:', process.env.SWITCHBOT_SECRET ? '설정됨' : '미설정');
  console.log('SWITCHBOT_DEVICE_ID:', process.env.SWITCHBOT_DEVICE_ID ? '설정됨' : '미설정');
}); 