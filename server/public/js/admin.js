// 상태 표시 요소
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

// 초기 상태 확인
checkStatus();

// 주기적으로 상태 확인 (5초마다)
setInterval(checkStatus, 5000);

// 상태 확인 함수
async function checkStatus() {
    try {
        const response = await fetch('/api/barrier/status');
        const data = await response.json();
        
        updateStatus(data.status);
    } catch (error) {
        console.error('상태 확인 실패:', error);
        statusText.textContent = '상태 확인 실패';
        statusIndicator.className = 'status-indicator';
    }
}

// 상태 표시 업데이트
function updateStatus(status) {
    statusIndicator.className = 'status-indicator status-' + status;
    statusText.textContent = status === 'open' ? '열림' : '닫힘';
}

// 차단기 제어 함수
async function controlBarrier(action) {
    try {
        const response = await fetch('/api/barrier/control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action })
        });

        const data = await response.json();
        
        if (data.success) {
            updateStatus(data.status);
        } else {
            alert('제어 실패: ' + data.message);
        }
    } catch (error) {
        console.error('제어 요청 실패:', error);
        alert('제어 요청 실패');
    }
} 