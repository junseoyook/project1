require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 환경변수 설정
const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY;
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET;
const SOLAPI_PFID = process.env.SOLAPI_PFID;
const BASE_URL = process.env.BASE_URL;

// 환경변수 확인
console.log('=== 환경변수 상태 확인 ===');
console.log('SOLAPI_API_KEY:', SOLAPI_API_KEY || '미설정');
console.log('SOLAPI_API_SECRET:', SOLAPI_API_SECRET ? '설정됨' : '미설정');
console.log('SOLAPI_PFID:', SOLAPI_PFID || '미설정');
console.log('BASE_URL:', BASE_URL || '미설정');

if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_PFID || !BASE_URL) {
  console.error('필수 환경변수가 설정되지 않았습니다!');
  console.error('다음 환경변수를 확인해주세요:');
  console.error('- SOLAPI_API_KEY');
  console.error('- SOLAPI_API_SECRET');
  console.error('- SOLAPI_PFID');
  console.error('- BASE_URL');
}

// Solapi 인증 헤더 생성 함수
function getAuthHeader() {
  if (!SOLAPI_API_SECRET) {
    console.error('SOLAPI_API_SECRET is undefined');
    throw new Error('API Secret is not configured');
  }

  const date = new Date().toISOString();
  const salt = Math.random().toString(36).substring(2, 15);
  
  console.log('인증 정보:', {
    date,
    salt,
    apiSecret: SOLAPI_API_SECRET ? 'exists' : 'missing'
  });

  const signature = crypto
    .createHmac('sha256', String(SOLAPI_API_SECRET))
    .update(date + salt)
    .digest('hex');

  return {
    Authorization: `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
    'Content-Type': 'application/json'
  };
}

// 알림톡 발송 함수
async function sendKakaoNotification(phoneNumber, token) {
  try {
    console.log('알림톡 발송 시작:', {
      phoneNumber,
      tokenUrl: token.url,
      apiKey: SOLAPI_API_KEY,
      pfId: SOLAPI_PFID
    });

    const message = {
      message: {
        to: phoneNumber,
        from: '01029949608',
        text: `[전주호텔 북 앤 타이프] 🚗

#{customerName}고객님,
아래 링크로 주차장 및 공동현관 출입이 가능합니다.

🚗 주차차단기 #{parking Url}
🔐 공동현관문 #{entry Url}

⏰ 이용 가능 시간: 24시간`,
        kakaoOptions: {
          pfId: SOLAPI_PFID,
          templateId: 'KA01TP250418063541272b3uS4NHhfLo',
          variables: {
            customerName: '고객',
            'parking Url': token.url,
            'entry Url': token.url
          }
        }
      }
    };

    console.log('Solapi 요청 데이터:', JSON.stringify(message, null, 2));

    const headers = getAuthHeader();
    console.log('인증 헤더:', headers);

    const response = await axios.post(
      'https://api.solapi.com/messages/v4/send',
      message,
      { headers }
    );

    console.log('Solapi 응답:', response.data);
    return response.data;
  } catch (error) {
    console.error('알림톡 발송 실패:', {
      error: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    throw error;
  }
}

// 토큰 생성 함수
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 토큰 저장 함수 (임시 메모리 저장)
const tokens = new Map();
async function saveToken(token, phoneNumber) {
  tokens.set(token, {
    phoneNumber,
    createdAt: new Date(),
    useCount: 0
  });
  console.log('토큰 저장됨:', { token, phoneNumber });
}

// 토큰 생성 API 엔드포인트
app.post('/api/generate-token', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    console.log('토큰 생성 요청:', { phoneNumber });

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: '전화번호가 필요합니다.' });
    }

    // 토큰 생성 로직
    const token = generateToken();
    const tokenUrl = `${process.env.BASE_URL}/customer/${token}`;
    console.log('토큰 생성됨:', { token, tokenUrl });

    // 알림톡 발송
    const result = await sendKakaoNotification(phoneNumber, { url: tokenUrl });
    console.log('알림톡 발송 결과:', result);

    // 토큰 저장
    await saveToken(token, phoneNumber);

    res.json({
      success: true,
      message: '토큰이 생성되었으며 알림톡이 발송되었습니다.',
      token: token
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