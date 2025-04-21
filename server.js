const axios = require('axios');
const crypto = require('crypto');

// Solapi 설정
const SOLAPI_API_KEY = 'YOUR_API_KEY';
const SOLAPI_API_SECRET = 'YOUR_API_SECRET';
const SOLAPI_PFID = 'YOUR_PFID';  // 카카오톡 비즈니스 채널 ID

// Solapi 인증 헤더 생성 함수
function getAuthHeader() {
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).substring(2, 15);
  const signature = crypto
    .createHmac('sha256', SOLAPI_API_SECRET)
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
    const message = {
      message: {
        to: phoneNumber,
        from: '발신번호',
        text: `[전주 1호점 주차장]
주차장 출입 URL이 생성되었습니다.
${token.url}

※ 본 URL은 24시간 동안 유효하며, 최대 10회까지 사용 가능합니다.
※ 차량 진입 후 반드시 닫기 버튼을 눌러주세요.`,
        kakaoOptions: {
          pfId: SOLAPI_PFID,
          templateId: 'KA01', // 등록된 알림톡 템플릿 ID
          disableSms: false // SMS 대체 발송 활성화
        }
      }
    };

    const response = await axios.post(
      'https://api.solapi.com/messages/v4/send',
      message,
      { headers: getAuthHeader() }
    );

    return response.data;
  } catch (error) {
    console.error('알림톡 발송 실패:', error);
    throw error;
  }
}

// 토큰 생성 API 엔드포인트 수정
app.post('/api/generate-token', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: '전화번호가 필요합니다.' });
    }

    // 토큰 생성 로직
    const token = generateToken();
    const tokenUrl = `${process.env.BASE_URL}/customer/${token}`;

    // 알림톡 발송
    await sendKakaoNotification(phoneNumber, { url: tokenUrl });

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
      error: '토큰 생성 중 오류가 발생했습니다.'
    });
  }
}); 