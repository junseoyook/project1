// API 기본 URL 설정
const API_BASE_URL = window.location.origin;

// 토큰 생성 함수
async function generateToken() {
    const button = document.querySelector('#token button.btn-primary');
    const tokenDisplay = document.getElementById('tokenDisplay');
    
    try {
        // 버튼 비활성화 및 로딩 상태 표시
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 생성 중...';
        
        const response = await fetch(`${API_BASE_URL}/api/generate-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('토큰 생성에 실패했습니다');
        }

        const data = await response.json();
        const fullUrl = `${API_BASE_URL}/customer/${data.url}`;
        
        // 토큰 URL 표시
        tokenDisplay.value = fullUrl;
        
        // 복사 버튼 활성화
        const copyButton = document.getElementById('copyToken');
        copyButton.disabled = false;
        
        // 성공 메시지와 함께 QR 코드 생성 옵션 표시
        showSuccessMessage(`
            토큰이 생성되었습니다.<br>
            1. "복사" 버튼을 눌러 URL을 복사하고 고객에게 전달하세요.<br>
            2. 고객은 이 URL을 통해 24시간 동안 최대 10회까지 원격으로 차단기를 제어할 수 있습니다.<br>
            3. URL은 고객 한 명당 새로 생성해야 합니다.
        `);
    } catch (error) {
        console.error('토큰 생성 오류:', error);
        showErrorMessage('토큰 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
        // 버튼 상태 복원
        button.disabled = false;
        button.textContent = '토큰 생성';
    }
}

// 토큰 URL 복사 함수
function copyTokenUrl() {
    const tokenDisplay = document.getElementById('tokenDisplay');
    if (!tokenDisplay || !tokenDisplay.value) return;
    
    tokenDisplay.select();
    tokenDisplay.setSelectionRange(0, 99999); // 모바일 지원
    
    try {
        navigator.clipboard.writeText(tokenDisplay.value)
            .then(() => {
                showSuccessMessage('URL이 클립보드에 복사되었습니다.');
            })
            .catch(err => {
                // 구형 브라우저 지원
                document.execCommand('copy');
                showSuccessMessage('URL이 클립보드에 복사되었습니다.');
            });
    } catch (err) {
        // 구형 브라우저 지원
        document.execCommand('copy');
        showSuccessMessage('URL이 클립보드에 복사되었습니다.');
    }
}

// 메시지 표시 함수
function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-success mt-3';
    messageDiv.innerHTML = message;
    
    const cardBody = document.querySelector('#token .card-body');
    // 기존 알림 제거
    const existingAlert = cardBody.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    cardBody.appendChild(messageDiv);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-danger mt-3';
    messageDiv.textContent = message;
    
    const cardBody = document.querySelector('#token .card-body');
    // 기존 알림 제거
    const existingAlert = cardBody.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    cardBody.appendChild(messageDiv);
} 