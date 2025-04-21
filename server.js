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

// 토큰 생성 함수
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Solapi 인증 헤더 생성 함수
function getAuthHeader() {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString('hex');
  
  try {
    const signature = crypto
      .createHmac('sha256', SOLAPI_API_SECRET)
      .update(date + salt)
      .digest('hex');

    console.log('인증 정보 생성:', {
      apiKey: SOLAPI_API_KEY,
      date,
      salt: salt.substring(0, 10) + '...',
      signature: signature.substring(0, 10) + '...'
    });

    return {
      Authorization: `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('인증 헤더 생성 실패:', error);
    throw new Error('인증 헤더 생성에 실패했습니다.');
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
  tokens.set(token, {
    phoneNumber,
    createdAt: new Date(),
    useCount: 0,
    lastUsed: null
  });
  console.log('토큰 저장됨:', { token, phoneNumber });
}

// 토큰 사용 함수
function useToken(token) {
  const tokenData = tokens.get(token);
  if (tokenData) {
    tokenData.useCount += 1;
    tokenData.lastUsed = new Date();
    tokens.set(token, tokenData);
    console.log('토큰 사용됨:', { token, useCount: tokenData.useCount });
  }
}

// 알림톡 발송 함수
async function sendKakaoNotification(phoneNumber, token) {
  try {
    console.log('알림톡 발송 시작:', {
      phoneNumber,
      tokenUrl: token.url
    });

    const message = {
      message: {
        to: phoneNumber,
        from: SENDER_PHONE,
        text: `[전주호텔 북 앤 타이프] 주차장 출입 안내`,
        kakaoOptions: {
          pfId: SOLAPI_PFID,
          templateId: 'KA01TP250418063541272b3uS4NHhfLo',
          variables: {
            고객명: "고객",
            주차URL: token.url,
            현관URL: token.url
          }
        }
      }
    };

    console.log('Solapi 요청 데이터:', JSON.stringify(message, null, 2));

    const headers = getAuthHeader();
    console.log('요청 헤더:', {
      Authorization: headers.Authorization.substring(0, 50) + '...',
      'Content-Type': headers['Content-Type']
    });

    const response = await axios.post(
      'https://api.solapi.com/messages/v4/send',
      message,
      { 
        headers,
        timeout: 10000 // 10초 타임아웃 설정
      }
    );

    console.log('Solapi 응답:', response.data);
    return response.data;
  } catch (error) {
    console.error('알림톡 발송 실패:', {
      message: error.message,
      response: error.response?.data,
      config: error.config
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
    const { phoneNumber } = req.body;
    console.log('토큰 생성 요청:', { phoneNumber });

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: '전화번호가 필요합니다.' });
    }

    // 토큰 생성
    const token = generateToken();
    const tokenUrl = `${BASE_URL}/customer/${token}`;
    console.log('토큰 생성됨:', { token, tokenUrl });

    // 토큰 저장
    await saveToken(token, phoneNumber);

    // 알림톡 발송
    const result = await sendKakaoNotification(phoneNumber, { url: tokenUrl });
    console.log('알림톡 발송 결과:', result);

    res.json({
      success: true,
      message: '토큰이 생성되었으며 알림톡이 발송되었습니다.',
      expiresIn: `${TOKEN_EXPIRY_HOURS}시간`,
      maxUses: MAX_TOKEN_USES
    });
  } catch (error) {
    console.error('토큰 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: '토큰 생성 중 오류가 발생했습니다: ' + error.message
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