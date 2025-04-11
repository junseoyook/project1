const API_URL = 'https://project1-production-f338.up.railway.app';
const DEVICE_ID = 'ESP32_001';
const CONTROL_KEY = 'your-control-key';  // 실제 운영시에는 안전한 방법으로 관리 필요
const ledIndicator = document.getElementById('ledIndicator');
let isConnected = false;

async function sendCommand(command) {
    if (!isConnected) {
        showConnectionStatus('서버에 연결중...');
        return;
    }

    try {
        ledIndicator.classList.add('active');
        const response = await fetch(`${API_URL}/api/control/${DEVICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                command: command,
                key: CONTROL_KEY
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showConnectionStatus(data.message || '명령 전송됨');
            const button = event.currentTarget;
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 200);
        } else {
            throw new Error(data.error || '오류가 발생했습니다');
        }
    } catch (error) {
        showConnectionStatus(error.message);
        ledIndicator.classList.remove('active');
    } finally {
        setTimeout(() => {
            ledIndicator.classList.remove('active');
        }, 1000);
    }
}

function showConnectionStatus(message) {
    const status = document.getElementById('connectionStatus');
    status.textContent = message;
    status.classList.remove('show');
    void status.offsetWidth;
    status.classList.add('show');
}

async function checkConnection() {
    try {
        const response = await fetch(`${API_URL}/api/control/${DEVICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                command: 'status',
                key: CONTROL_KEY
            })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            isConnected = true;
            ledIndicator.style.backgroundColor = '#00ff00';
            ledIndicator.style.boxShadow = '0 0 5px #00ff00';
            document.querySelectorAll('.remote-button').forEach(btn => {
                btn.disabled = false;
            });
        } else {
            throw new Error('서버 연결 실패');
        }
    } catch (error) {
        isConnected = false;
        ledIndicator.style.backgroundColor = '#ff0000';
        ledIndicator.style.boxShadow = '0 0 5px #ff0000';
        document.querySelectorAll('.remote-button').forEach(btn => {
            btn.disabled = true;
        });
        setTimeout(checkConnection, 5000); // 5초 후 재시도
    }
}

// 페이지 로드시 연결 확인 시작
document.addEventListener('DOMContentLoaded', () => {
    // 버튼 초기 비활성화
    document.querySelectorAll('.remote-button').forEach(btn => {
        btn.disabled = true;
    });
    
    // 연결 확인 시작
    checkConnection();
}); 