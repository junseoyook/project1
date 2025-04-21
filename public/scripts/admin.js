// API 기본 URL 설정
const API_BASE_URL = window.location.origin;

// DOM이 로드되면 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    const generateTokenBtn = document.querySelector('#token button.btn-primary');
    if (generateTokenBtn) {
        generateTokenBtn.addEventListener('click', generateToken);
    }
});

// 토큰 생성 함수
async function generateToken() {
    const phoneInput = document.getElementById('phoneNumber');
    const phoneNumber = phoneInput.value.replace(/[^0-9]/g, '');
    
    if (!phoneNumber || phoneNumber.length !== 11) {
        alert('올바른 휴대폰 번호를 입력해주세요.');
        return;
    }

    const generateBtn = document.getElementById('generateToken');
    const originalText = generateBtn.textContent;
    generateBtn.disabled = true;
    generateBtn.textContent = '생성 중...';

    try {
        const response = await fetch('/api/generate-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phoneNumber })
        });

        const data = await response.json();

        if (data.success) {
            alert('토큰이 생성되었으며 알림톡이 발송되었습니다.');
            phoneInput.value = '';
        } else {
            throw new Error(data.error || '토큰 생성에 실패했습니다.');
        }
    } catch (error) {
        alert(error.message);
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = originalText;
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