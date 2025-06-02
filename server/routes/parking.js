const express = require('express');
const router = express.Router();

// 차단기 열기
router.post('/open', (req, res) => {
  res.json({ success: true, message: '차단기 열기 명령 전송됨' });
});

// 차단기 닫기
router.post('/close', (req, res) => {
  res.json({ success: true, message: '차단기 닫기 명령 전송됨' });
});

// 차단기 상태 확인
router.get('/status', (req, res) => {
  res.json({ status: '닫힘' });
});

module.exports = router; 