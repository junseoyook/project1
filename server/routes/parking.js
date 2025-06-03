const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// 차단기 열기
router.post('/open', (req, res) => {
  const device = deviceController.getDevice('ESP32_001');
  if (!device) return res.status(404).json({ success: false, message: '디바이스 없음' });
  deviceController.openGate(device);
  res.json({ success: true, message: '차단기 열기 명령 전송됨' });
});

// 차단기 닫기
router.post('/close', (req, res) => {
  const device = deviceController.getDevice('ESP32_001');
  if (!device) return res.status(404).json({ success: false, message: '디바이스 없음' });
  deviceController.closeGate(device);
  res.json({ success: true, message: '차단기 닫기 명령 전송됨' });
});

// 차단기 상태 확인
router.get('/status', (req, res) => {
  res.json({ status: '닫힘' });
});

module.exports = router; 