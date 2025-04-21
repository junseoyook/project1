// API 기본 URL 설정
const API_BASE_URL = window.location.origin;

// DOM이 로드되면 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    const tokenForm = document.getElementById('tokenForm');
    const resultMessage = document.getElementById('resultMessage');

    if (tokenForm) {
        tokenForm.addEventListener('submit', handleTokenGeneration);
    }

    async function handleTokenGeneration(e) {
        e.preventDefault();
        
        const phoneInput = document.getElementById('phoneNumber');
        const submitButton = document.getElementById('generateToken');
        const phoneNumber = phoneInput.value.replace(/[^0-9]/g, '');
        
        if (!phoneNumber || phoneNumber.length !== 11) {
            showMessage('올바른 휴대폰 번호를 입력해주세요.', 'danger');
            return;
        }

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>처리 중...';
            
            const response = await fetch('/api/generate-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phoneNumber })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('토큰이 생성되었으며 알림톡이 발송되었습니다.', 'success');
                phoneInput.value = '';
            } else {
                throw new Error(data.error || '토큰 생성에 실패했습니다.');
            }
        } catch (error) {
            showMessage(error.message, 'danger');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '토큰 생성 및 알림톡 발송';
        }
    }

    function showMessage(message, type) {
        resultMessage.textContent = message;
        resultMessage.className = `alert alert-${type} mt-3`;
        resultMessage.style.display = 'block';
        
        // 3초 후 메시지 숨기기
        setTimeout(() => {
            resultMessage.style.display = 'none';
        }, 3000);
    }
});

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