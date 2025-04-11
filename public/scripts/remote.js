const API_URL = 'https://project1-production-f338.up.railway.app';
const DEVICE_ID = 'ESP32_001';
const CONTROL_KEY = 'your-control-key';  // 실제 운영시에는 안전한 방법으로 관리 필요
const ledIndicator = document.getElementById('ledIndicator');

async function sendCommand(command) {
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
            showConnectionStatus('명령 전송됨');
            const button = event.currentTarget;
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 200);
        } else {
            showConnectionStatus(data.error || '오류 발생');
            ledIndicator.classList.remove('active');
        }
    } catch (error) {
        showConnectionStatus('연결 실패');
        ledIndicator.classList.remove('active');
        console.error('Error:', error);
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

// 초기 연결 상태 표시
document.addEventListener('DOMContentLoaded', () => {
    // 서버 연결 상태 확인
    fetch(`${API_URL}/api/control/${DEVICE_ID}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            command: 'status',
            key: CONTROL_KEY
        })
    })
    .then(response => {
        if (response.ok) {
            showConnectionStatus('연결됨');
        }
    })
    .catch(() => {
        showConnectionStatus('연결 대기중');
    });
}); 