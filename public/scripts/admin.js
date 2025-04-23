// API 기본 URL 설정
const API_BASE_URL = window.location.origin;
const API_KEY = process.env.API_KEY || 'your-secret-api-key';

// DOM이 로드되면 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    const tokenForm = document.getElementById('tokenForm');
    const resultMessage = document.getElementById('resultMessage');

    if (tokenForm) {
        tokenForm.addEventListener('submit', generateToken);
    }

    // 초기 히스토리 로드
    loadTokenHistory();

    async function generateToken(event) {
        event.preventDefault();
        
        const phoneNumber = document.getElementById('phoneNumber').value;
        console.log('전화번호 입력값:', phoneNumber);

        if (!phoneNumber) {
            showError('전화번호를 입력해주세요.');
            return;
        }

        try {
            const response = await fetch('/api/generate-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phoneNumber })
            });

            const data = await response.json();
            console.log('서버 응답:', data);
            
            if (data.success) {
                showSuccess(data.message);
                
                // 생성된 URL을 화면에 표시
                const urlsContainer = document.getElementById('generatedUrls');
                urlsContainer.innerHTML = `
                    <div class="url-item">
                        <p><strong>주차장 리모컨:</strong></p>
                        <div class="url-box">
                            <span class="url-text">${data.parkingUrl}</span>
                            <button class="copy-btn" onclick="copyToClipboard('${data.parkingUrl}')">복사</button>
                        </div>
                    </div>
                `;
                urlsContainer.style.display = 'block';
            } else {
                showError(data.error || '토큰 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('에러:', error);
            showError('서버 오류가 발생했습니다.');
        }
    }

    function showSuccess(message) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = 'mt-3 alert alert-success';
        statusDiv.style.display = 'block';
    }

    function showError(message) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = 'mt-3 alert alert-danger';
        statusDiv.style.display = 'block';
    }
});

// 토큰 히스토리 로드 함수
async function loadTokenHistory() {
    const historyTableBody = document.getElementById('historyTableBody');
    if (!historyTableBody) return;

    try {
        const response = await fetch('/api/token-history');
        const data = await response.json();

        if (data.success) {
            historyTableBody.innerHTML = ''; // 테이블 초기화
            
            if (data.history.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="6" class="text-center">발송된 토큰이 없습니다.</td>';
                historyTableBody.appendChild(tr);
                return;
            }

            data.history.forEach(entry => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(entry.createdAt)}</td>
                    <td>${formatPhoneNumber(entry.phoneNumber)}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="text-truncate" style="max-width: 200px;">${entry.url}</span>
                            <button onclick="copyToClipboard('${entry.url}')" class="btn btn-sm btn-success ms-2">복사</button>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${entry.status === 'active' ? 'bg-success' : 'bg-danger'}">
                            ${entry.status === 'active' ? '활성' : '만료'}
                        </span>
                    </td>
                    <td>${entry.useCount}</td>
                    <td>${entry.lastUsed ? formatDate(entry.lastUsed) : '-'}</td>
                `;
                historyTableBody.appendChild(tr);
            });
        } else {
            showMessage('히스토리 로드에 실패했습니다.', 'danger');
        }
    } catch (error) {
        showMessage('서버 연결 오류가 발생했습니다.', 'danger');
    }
}

// 날짜 포맷 함수
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// 전화번호 포맷 함수
function formatPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
}

// URL 복사 함수
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showMessage('URL이 클립보드에 복사되었습니다.', 'success');
    } catch (err) {
        showMessage('URL 복사에 실패했습니다.', 'danger');
    }
}

// 히스토리 새로고침 함수
function refreshHistory() {
    loadTokenHistory();
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

// URL 복사 함수
function copyUrl(inputId) {
    const input = document.getElementById(inputId);
    input.select();
    input.setSelectionRange(0, 99999);
    
    try {
        navigator.clipboard.writeText(input.value)
            .then(() => {
                showMessage('URL이 클립보드에 복사되었습니다.', 'success');
            })
            .catch(err => {
                // 구형 브라우저 지원
                document.execCommand('copy');
                showMessage('URL이 클립보드에 복사되었습니다.', 'success');
            });
    } catch (err) {
        // 구형 브라우저 지원
        document.execCommand('copy');
        showMessage('URL이 클립보드에 복사되었습니다.', 'success');
    }
} 