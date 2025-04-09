const deviceId = "ESP32_001";
const deviceSecret = "esp32-secret-key";
const apiUrl = "https://pariking-system-production.up.railway.app";

async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-device-id': deviceId,
    'x-device-secret': deviceSecret,
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  
  if (!response.ok) throw new Error(data.error || '오류가 발생했습니다');
  return data;
}

async function openGate() {
  const button = document.getElementById('openButton');
  const message = document.getElementById('message');
  
  button.disabled = true;
  message.textContent = '처리중...';
  message.className = '';
  
  try {
    const data = await fetchWithAuth(`${apiUrl}/api/open`, { method: 'POST' });
    message.textContent = data.message || '차단기가 열렸습니다';
    message.className = 'success';
  } catch (error) {
    message.textContent = error.message;
    message.className = 'error';
  } finally {
    button.disabled = false;
  }
}

async function closeGate() {
  const button = document.getElementById('closeButton');
  const message = document.getElementById('message');
  
  button.disabled = true;
  message.textContent = '처리중...';
  message.className = '';
  
  try {
    const data = await fetchWithAuth(`${apiUrl}/api/close`, { method: 'POST' });
    message.textContent = data.message || '차단기가 닫혔습니다';
    message.className = 'success';
  } catch (error) {
    message.textContent = error.message;
    message.className = 'error';
  } finally {
    button.disabled = false;
  }
} 