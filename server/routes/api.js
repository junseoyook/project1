const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
// const Reservation = require('../models/Reservation');
// const EntryLog = require('../models/EntryLog');

// 디바이스 인증 미들웨어
const authenticateDevice = (req, res, next) => {
  const deviceId = req.headers['x-device-id'];
  const deviceSecret = req.headers['x-device-secret'];
  
  if (!deviceId || !deviceSecret) {
    return res.status(401).json({ error: '디바이스 ID와 시크릿이 필요합니다' });
  }
  
  const device = deviceController.getDevice(deviceId);
  if (!device) {
    return res.status(404).json({ error: '등록되지 않은 디바이스입니다' });
  }
  
  if (device.secret !== deviceSecret) {
    return res.status(401).json({ error: '잘못된 시크릿 키입니다' });
  }
  
  req.device = device;
  next();
};

// 상태 확인 엔드포인트
router.get('/status/:deviceId', authenticateDevice, (req, res) => {
  res.json({ 
    shouldOpen: req.device.shouldOpen,
    shouldClose: req.device.shouldClose
  });
});

// 차단기 열기 요청
router.post('/open', authenticateDevice, (req, res) => {
  deviceController.openGate(req.device);
  res.json({ 
    success: true,
    message: '차단기 열기 신호가 전송되었습니다'
  });
});

// 차단기 닫기 요청
router.post('/close', authenticateDevice, (req, res) => {
  deviceController.closeGate(req.device);
  res.json({ 
    success: true,
    message: '차단기 닫기 신호가 전송되었습니다'
  });
});

// 차단기 명령 상태 조회 (연결 확인용)
router.get('/command/:deviceId', (req, res) => {
  const device = deviceController.getDevice(req.params.deviceId);
  if (!device) {
    return res.json({ command: null });
  }
  const now = Date.now();
  if (device.lastCommand && (now - device.lastCommandTime < 3000)) {
    res.json({ command: device.lastCommand });
  } else {
    device.lastCommand = null;
    res.json({ command: null });
  }
});

// 토큰