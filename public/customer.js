// DOM 요소
const openButton = document.getElementById('openButton');
const closeButton = document.getElementById('closeButton');
const statusMessage = document.getElementById('statusMessage');
const lastAction = document.getElementById('lastAction');

// 상태 메시지 업데이트
function updateStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? '#FF3B30' : '#34C759';
    lastAction.textContent = `마지막 조작: ${new Date().toLocaleTimeString()}`;
}

// 햅틱 피드백
function hapticFeedback() {
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
}

// 출입문 제어 요청
async function controlGate(action) {
    hapticFeedback();
    
    try {
        const response = await fetch(`/api/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            updateStatus(`출입문 ${action === 'open' ? '열기' : '닫기'} 요청이 전송되었습니다.`);
        } else {
            updateStatus('출입문 제어에 실패했습니다.', true);
        }
    } catch (error) {
        console.error('Error:', error);
        updateStatus('서버와의 통신에 실패했습니다.', true);
    }
}

// 버튼 클릭 이벤트
openButton.addEventListener('click', () => controlGate('open'));
closeButton.addEventListener('click', () => controlGate('close'));

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    if (e.key === 'o' || e.key === 'O') {
        controlGate('open');
    } else if (e.key === 'c' || e.key === 'C') {
        controlGate('close');
    }
}); 