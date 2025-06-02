const express = require('express');
const router = express.Router();

// 셀프 발급 예시 엔드포인트
router.post('/issue', (req, res) => {
  res.json({ success: true, message: '리모컨 URL 발급됨', url: '/customer/index.html' });
});

module.exports = router; 