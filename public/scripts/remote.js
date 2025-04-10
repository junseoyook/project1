const API_URL = 'https://project1-production-f338.up.railway.app';
const DEVICE_ID = 'ESP32_001';
const ledIndicator = document.getElementById('ledIndicator');

async function sendCommand(command) {
    try {
        ledIndicator.classList.add('active');
        const response = await fetch(`${API_URL}/api/device/command/${DEVICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
        });

        if (response.ok) {
            showConnectionStatus('명령 전송됨');
            const button = event.currentTarget;
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 200);
        } else {
            showConnectionStatus('오류 발생');
            ledIndicator.classList.remove('active');
        }
    } catch (error) {
        showConnectionStatus('연결 실패');
        ledIndicator.classList.remove('active');
        console.error('Error:', error);
    }

    setTimeout(() => {
        ledIndicator.classList.remove('active');
    }, 1000);
}

function showConnectionStatus(message) {
    const status = document.getElementById('connectionStatus');
    status.textContent = message;
    status.classList.remove('show');
    void status.offsetWidth;
    status.classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
    showConnectionStatus('연결됨');
}); 