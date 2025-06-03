// 디바이스 데이터 저장소
const devices = new Map();
devices.set('ESP32_001', {
  secret: 'esp32-secret-key',
  shouldOpen: false,
  shouldClose: false,
  lastCommand: null,
  lastCommandTime: 0
});

// 디바이스 조회
const getDevice = (deviceId) => {
  return devices.get(deviceId);
};

// 차단기 열기
const openGate = (device) => {
  device.shouldOpen = true;
  device.shouldClose = false;
  device.lastCommand = 'open';
  device.lastCommandTime = Date.now();
};

// 차단기 닫기
const closeGate = (device) => {
  device.shouldOpen = false;
  device.shouldClose = true;
  device.lastCommand = 'close';
  device.lastCommandTime = Date.now();
};

module.exports = {
  getDevice,
  openGate,
  closeGate
}; 