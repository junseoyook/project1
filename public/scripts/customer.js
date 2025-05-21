// API 기본 URL 설정
const API_BASE_URL = window.location.origin;
const deviceId = 'ESP32_001';  // 실제 운영 환경에서는 설정 파일이나 환경변수에서 가져와야 함

// 페이지 로드 시 연결 상태 확인
document.addEventListener('DOMContentLoaded', () => {
    checkConnection();
});

// 연결 상태 확인 함수
async function checkConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/device/command/${deviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: 'status',
                key: 'your-control-key'  // 실제 운영 환경에서는 토큰 값을 사용
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'connected') {
                showConnectionStatus('연결됨', 'success');
                enableButtons();
            } else {
                showConnectionStatus('연결 끊김', 'danger');
                disableButtons();
            }
        } else {
            throw new Error('서버 응답 오류');
        }
    } catch (error) {
        console.error('연결 확인 오류:', error);
        showConnectionStatus('연결 실패', 'danger');
        disableButtons();
        // 5초 후 재시도
        setTimeout(checkConnection, 5000);
    }
}

// 명령 전송 함수
async function sendCommand(command) {
    const statusDiv = document.getElementById('connectionStatus');
    const buttons = document.querySelectorAll('button');
    
    try {
        // 버튼 비활성화
        buttons.forEach(btn => btn.disabled = true);
        showConnectionStatus('명령 전송 중...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/api/device/command/${deviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: command,
                key: 'your-control-key'  // 실제 운영 환경에서는 토큰 값을 사용
            })
        });

        if (response.ok) {
            const data = await response.json();
            showConnectionStatus(data.message, 'success');
        } else {
            throw new Error('명령 전송 실패');
        }
    } catch (error) {
        console.error('명령 전송 오류:', error);
        showConnectionStatus('명령 전송 실패', 'danger');
    } finally {
        // 3초 후 상태 확인 및 버튼 활성화
        setTimeout(() => {
            checkConnection();
        }, 3000);
    }
}

// 연결 상태 표시 함수
function showConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.className = `alert alert-${type}`;
    statusDiv.textContent = message;
}

// 버튼 활성화 함수
function enableButtons() {
    document.getElementById('openButton').disabled = false;
    document.getElementById('closeButton').disabled = false;
}

// 버튼 비활성화 함수
function disableButtons() {
    document.getElementById('openButton').disabled = true;
    document.getElementById('closeButton').disabled = true;
} 