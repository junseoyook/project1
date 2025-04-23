require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

// 환경변수 디버깅
console.log('==== 환경변수 디버깅 시작 ====');
console.log('process.env:', {
  SOLAPI_API_KEY: process.env.SOLAPI_API_KEY || '없음',
  SOLAPI_API_SECRET: process.env.SOLAPI_API_SECRET ? '설정됨' : '없음',
  SOLAPI_PFID: process.env.SOLAPI_PFID || '없음',
  BASE_URL: process.env.BASE_URL || '없음',
  NODE_ENV: process.env.NODE_ENV || '없음'
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 필수 환경변수 확인 및 설정
const requiredEnvVars = {
  SOLAPI_API_KEY: process.env.SOLAPI_API_KEY,
  SOLAPI_API_SECRET: process.env.SOLAPI_API_SECRET,
  SOLAPI_PFID: process.env.SOLAPI_PFID,
  BASE_URL: process.env.BASE_URL
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

// 토큰 검증 함수
function validateToken(token) {
  const tokenData = tokens.get(token);
  if (!tokenData) {
    return { isValid: false, reason: '존재하지 않는 토큰입니다.' };
  }

  const now = new Date();
  const expiryTime = new Date(tokenData.createdAt);
  expiryTime.setHours(expiryTime.getHours() + TOKEN_EXPIRY_HOURS);

  if (now > expiryTime) {
    return { isValid: false, reason: '만료된 토큰입니다.' };
  }

  if (tokenData.useCount >= MAX_TOKEN_USES) {
    return { isValid: false, reason: '사용 횟수를 초과했습니다.' };
  }

  return { isValid: true };
}

// 토큰 저장 함수
async function saveToken(token, phoneNumber) {
  const timestamp = new Date();
  const tokenData = {
    phoneNumber,
    createdAt: timestamp,
    useCount: 0,
    lastUsed: null
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
  
  console.log('토큰 저장됨:', { token, phoneNumber });
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

// 알림톡 발송 함수
async function sendKakaoNotification(phoneNumber, token) {
  try {
    const messageData = {
      message: {
        to: phoneNumber,
        from: SENDER_PHONE,
        kakaoOptions: {
          pfId: SOLAPI_PFID,
          templateId: "KA01TP250418063541272b3uS4NHhfLo",
          variables: {
            "#{customerName}": "고객님",
            "#{parking Url}": token.url,
            "#{entry Url}": token.url
          }
        }
      }
    };

    console.log('알림톡 요청 데이터:', JSON.stringify(messageData, null, 2));

    const headers = getAuthHeader();
    const response = await axios({
      method: 'post',
      url: 'https://api.solapi.com/messages/v4/send',
      headers,
      data: messageData,
      timeout: 10000
    });

    console.log('Solapi 응답:', response.data);
    return response.data;
  } catch (error) {
    console.error('알림톡 발송 실패:', {
      message: error.message,
      response: error.response?.data,
      requestData: error.config?.data
    });
    throw error;
  }
}

// 토큰 검증 API 엔드포인트
app.get('/api/validate-token/:token', (req, res) => {
  const { token } = req.params;
  const validation = validateToken(token);
  
  if (validation.isValid) {
    useToken(token);
    res.json({ success: true });
  } else {
    res.status(400).json({ 
      success: false, 
      error: validation.reason 
    });
  }
});

// 토큰 생성 API 엔드포인트
app.post('/api/generate-token', async (req, res) => {
  try {
    console.log('토큰 생성 요청 수신:', {
      body: req.body,
      headers: req.headers
    });

    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      console.error('전화번호 누락');
      return res.status(400).json({ 
        success: false, 
        error: '전화번호가 필요합니다.' 
      });
    }

    // 환경변수 확인
    if (!BASE_URL) {
      console.error('BASE_URL 환경변수 누락');
      return res.status(500).json({
        success: false,
        error: '서버 설정 오류가 발생했습니다.'
      });
    }

    // 토큰 생성
    const token = generateToken();
    const tokenUrl = `${BASE_URL}/customer/${token}`;
    console.log('토큰 생성됨:', { token, tokenUrl });

    try {
      // 토큰 저장
      await saveToken(token, phoneNumber);
      console.log('토큰 저장 완료');

      // 알림톡 발송
      console.log('알림톡 발송 시도:', { phoneNumber, tokenUrl });
      const result = await sendKakaoNotification(phoneNumber, { url: tokenUrl });
      console.log('알림톡 발송 결과:', result);

      return res.json({
        success: true,
        message: '토큰이 생성되었으며 알림톡이 발송되었습니다.',
        expiresIn: `${TOKEN_EXPIRY_HOURS}시간`,
        maxUses: MAX_TOKEN_USES
      });
    } catch (innerError) {
      console.error('토큰 처리 중 오류:', {
        phase: innerError.phase || 'unknown',
        error: innerError.message,
        stack: innerError.stack,
        response: innerError.response?.data
      });
      
      return res.status(500).json({
        success: false,
        error: '토큰 처리 중 오류가 발생했습니다: ' + innerError.message
      });
    }
  } catch (error) {
    console.error('토큰 생성 실패:', {
      error: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    return res.status(500).json({
      success: false,
      error: '토큰 생성 중 오류가 발생했습니다: ' + error.message
    });
  }
});

// 고객 페이지 라우트 핸들러 추가
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

  // 토큰이 유효하면 customer.html 페이지 제공
  res.sendFile('customer.html', { root: './public' });
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`서버 실행 중: 포트 ${PORT}`);
  console.log('환경변수 상태:');
  console.log('BASE_URL:', process.env.BASE_URL);
  console.log('SOLAPI_API_KEY:', process.env.SOLAPI_API_KEY ? '설정됨' : '미설정');
  console.log('SOLAPI_API_SECRET:', process.env.SOLAPI_API_SECRET ? '설정됨' : '미설정');
  console.log('SOLAPI_PFID:', process.env.SOLAPI_PFID ? '설정됨' : '미설정');
}); 