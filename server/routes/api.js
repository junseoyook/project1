const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
// const Reservation = require('../models/Reservation');
// const EntryLog = require('../models/EntryLog');

// 디바이스 인증 미들웨어
const authenticateDevice = (req, res, next) => {
  const deviceId = req.headers['x-device-id'];
  const deviceSecret = req.headers['x-device-secret'];
  console.log('[인증 시도] deviceId:', deviceId, 'deviceSecret:', deviceSecret);
  
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
  console.log('[명령 요청] deviceId:', req.params.deviceId);
  if (!device) {
    console.log('[명령 응답] 등록되지 않은 디바이스:', req.params.deviceId);
    return res.json({ command: null });
  }
  const now = Date.now();
  if (device.lastCommand && (now - device.lastCommandTime < 3000)) {
    console.log('[명령 응답]', device.lastCommand, 'to', req.params.deviceId);
    res.json({ command: device.lastCommand });
  } else {
    device.lastCommand = null;
    res.json({ command: null });
  }
});

// 토큰 유효성 검증 (임시: 항상 성공)
router.post('/tokens/validate', (req, res) => {
  res.json({ success: true, valid: true });
});

/*
// 예약 생성
router.post('/reservations', async (req, res) => {
  try {
    const reservation = new Reservation(req.body);
    await reservation.save();
    res.status(201).json(reservation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 예약 조회
router.get('/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find();
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 차량 번호판으로 예약 조회
router.get('/reservations/license-plate/:licensePlate', async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      licensePlate: req.params.licensePlate,
      status: 'active'
    });
    if (!reservation) {
      return res.status(404).json({ error: '유효한 예약을 찾을 수 없습니다.' });
    }
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 입차 기록
router.post('/entry-logs', async (req, res) => {
  try {
    const { licensePlate } = req.body;
    const reservation = await Reservation.findOne({
      licensePlate,
      status: 'active'
    });

    if (!reservation) {
      const log = new EntryLog({
        licensePlate,
        entryTime: new Date(),
        type: 'entry',
        status: 'failed',
        reason: '유효한 예약이 없습니다.'
      });
      await log.save();
      return res.status(403).json({ error: '유효한 예약이 없습니다.' });
    }

    const log = new EntryLog({
      reservationId: reservation._id,
      licensePlate,
      entryTime: new Date(),
      type: 'entry',
      status: 'success'
    });
    await log.save();

    if (reservation.usageType === 'single') {
      reservation.status = 'completed';
    } else {
      reservation.remainingUses -= 1;
      if (reservation.remainingUses <= 0) {
        reservation.status = 'completed';
      }
    }
    await reservation.save();

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출차 기록
router.post('/exit-logs', async (req, res) => {
  try {
    const { licensePlate } = req.body;
    const log = new EntryLog({
      licensePlate,
      entryTime: new Date(),
      type: 'exit',
      status: 'success'
    });
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/

module.exports = router; 