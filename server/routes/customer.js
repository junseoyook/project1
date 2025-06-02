const express = require('express');
const router = express.Router();

// 셀프 발급 예시 엔드포인트
router.post('/issue', (req, res) => {
  // 실제로는 동적으로 토큰을 생성해야 하지만, 예시로 고정값 사용
  const token = 'testtoken123';
  res.json({
    success: true,
    message: '리모컨 URL 발급됨',
    parkingUrl: `/parking.html?token=${token}`
  });
});

module.exports = router; 