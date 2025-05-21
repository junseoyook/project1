const API_URL = '';
const DEVICE_ID = 'ESP32_001';
let isConnected = false;
let token = null;
const CONTROL_KEY = 'your-control-key';  // 실제 운영시에는 안전한 방법으로 관리 필요
const ledIndicator = document.getElementById('ledIndicator');

// URL에서 토큰 추출
function getTokenFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
}

async function sendCommand(command, buttonElement) {
    if (!isConnected) {
        showConnectionStatus('서버에 연결중...');
        return;
    }

    try {
        ledIndicator.classList.add('active');
        const response = await fetch(`/api/device/command/${DEVICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-access-token': token
            },
            body: JSON.stringify({ command })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showConnectionStatus(data.message || '명령 전송됨');
            // 버튼 애니메이션 적용
            if (buttonElement) {
                buttonElement.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    buttonElement.style.transform = 'scale(1)';
                }, 200);
            }
            
            // LED 상태 업데이트
            setTimeout(() => {
                if (isConnected) {
                    ledIndicator.style.backgroundColor = '#00ff00';
                    ledIndicator.style.boxShadow = '0 0 5px #00ff00';
                }
                ledIndicator.classList.remove('active');
            }, 1000);
        } else {
            throw new Error(data.error || '오류가 발생했습니다');
        }
    } catch (error) {
        showConnectionStatus(error.message);
        ledIndicator.classList.remove('active');
        // 연결 상태 재확인
        checkConnection();
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
        const response = await fetch(`/api/device/command/${DEVICE_ID}`, {
            method: 'GET',
            headers: {
                'x-access-token': token
            }
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            isConnected = true;
            ledIndicator.style.backgroundColor = '#00ff00';
            ledIndicator.style.boxShadow = '0 0 5px #00ff00';
            document.querySelectorAll('.remote-button').forEach(btn => {
                btn.disabled = false;
            });
            showConnectionStatus('연결됨');
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
        showConnectionStatus('서버 연결 실패');
        setTimeout(checkConnection, 5000); // 5초 후 재시도
    }
}

// 페이지 로드시 연결 확인 시작
document.addEventListener('DOMContentLoaded', () => {
    // 토큰 가져오기
    token = getTokenFromUrl();
    if (!token) {
        showConnectionStatus('유효하지 않은 접근입니다.');
        return;
    }

    // 버튼 초기 비활성화
    document.querySelectorAll('.remote-button').forEach(btn => {
        btn.disabled = true;
        
        // 버튼 클릭 이벤트 핸들러 추가
        btn.addEventListener('click', function() {
            const command = this.dataset.command;  // data-command 속성에서 명령어 가져오기
            sendCommand(command, this);  // 버튼 요소 전달
        });
    });
    
    // 연결 확인 시작
    checkConnection();
}); 