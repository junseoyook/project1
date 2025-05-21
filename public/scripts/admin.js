// API 기본 URL 설정
const API_BASE_URL = window.location.origin;
const API_KEY = 'your-secret-api-key'; // Railway에 설정한 것과 동일한 값으로 설정

// DOM이 로드되면 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    const tokenForm = document.getElementById('tokenForm');
    const resultMessage = document.getElementById('resultMessage');
    console.log('API Key:', API_KEY); // API 키 확인용 로그

    if (tokenForm) {
        tokenForm.addEventListener('submit', generateToken);
    }

    // 초기 히스토리 로드
    loadTokenHistory();

    // 페이지 로드 시 오늘 날짜로 설정
    const dailyDate = document.getElementById('dailyDate');
    if (dailyDate) {
        const today = new Date().toISOString().split('T')[0];
        dailyDate.value = today;
        loadDailyStats();
    }

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
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({ phoneNumber })
            });

            const data = await response.json();

            if (data.success) {
                // URL 결과 섹션 표시
                document.getElementById('urlResult').style.display = 'block';
                
                // 주차장 URL만 입력
                document.getElementById('parkingUrl').value = data.parkingUrl;
                
                // 성공 메시지 표시
                const alertDiv = document.querySelector('#urlResult .alert');
                alertDiv.className = 'alert alert-success';
                alertDiv.textContent = data.message;
            } else {
                throw new Error(data.error || '토큰 생성에 실패했습니다.');
            }
        } catch (error) {
            // 에러 메시지 표시
            document.getElementById('urlResult').style.display = 'block';
            const alertDiv = document.querySelector('#urlResult .alert');
            alertDiv.className = 'alert alert-danger';
            alertDiv.textContent = error.message;
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
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    
    // 복사 성공 메시지 표시
    const button = element.nextElementSibling;
    const originalText = button.textContent;
    button.textContent = '복사됨!';
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
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

// 일별 현황 로드 함수
async function loadDailyStats() {
    const date = document.getElementById('dailyDate').value;
    if (!date) {
        showMessage('날짜를 선택해주세요.', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/stats/daily?date=${date}`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 통계 업데이트
            document.getElementById('dailyTotalIssued').textContent = data.stats.totalIssued;
            document.getElementById('dailyParkingUsed').textContent = data.stats.parkingUsed;
            document.getElementById('dailyDoorUsed').textContent = data.stats.doorUsed;

            // 테이블 업데이트
            const tbody = document.getElementById('dailyTableBody');
            tbody.innerHTML = '';

            data.details.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDateTime(item.issuedAt)}</td>
                    <td>${formatPhoneNumber(item.phoneNumber)}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="text-truncate" style="max-width: 200px;">${item.parkingUrl}</span>
                            <button class="btn btn-sm btn-outline-primary ms-2" onclick="copyToClipboard('${item.parkingUrl}')">복사</button>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="text-truncate" style="max-width: 200px;">${item.doorUrl}</span>
                            <button class="btn btn-sm btn-outline-primary ms-2" onclick="copyToClipboard('${item.doorUrl}')">복사</button>
                        </div>
                    </td>
                    <td>${item.parkingUsageCount}</td>
                    <td>${item.doorUsageCount}</td>
                    <td>
                        <span class="badge ${item.isExpired ? 'bg-danger' : 'bg-success'}">
                            ${item.isExpired ? '만료' : '활성'}
                        </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            showMessage(data.error || '데이터 로드에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('일별 현황 로드 실패:', error);
        showMessage('서버 오류가 발생했습니다.', 'error');
    }
}

// 날짜/시간 포맷 함수
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// 월별 현황 로드 함수
async function loadMonthlyStats() {
    const month = document.getElementById('monthlyDate').value;
    if (!month) {
        showMessage('월을 선택해주세요.', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/stats/monthly?month=${month}`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 통계 업데이트
            document.getElementById('monthlyTotalIssued').textContent = data.stats.totalIssued;
            document.getElementById('monthlyParkingUsed').textContent = data.stats.parkingUsed;
            document.getElementById('monthlyDoorUsed').textContent = data.stats.doorUsed;

            // 그래프 업데이트
            updateMonthlyChart(data.dailyStats);

            // 테이블 업데이트
            const tbody = document.getElementById('monthlyTableBody');
            tbody.innerHTML = '';

            data.dailyStats.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(item.date)}</td>
                    <td>${item.issuedCount}</td>
                    <td>${item.parkingUsed}</td>
                    <td>${item.doorUsed}</td>
                    <td>${item.activeTokens}</td>
                    <td>${item.expiredTokens}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            showMessage(data.error || '데이터 로드에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('월별 현황 로드 실패:', error);
        showMessage('서버 오류가 발생했습니다.', 'error');
    }
}

// 월별 그래프 업데이트 함수
function updateMonthlyChart(dailyStats) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    // 기존 차트가 있다면 제거
    if (window.monthlyChart) {
        window.monthlyChart.destroy();
    }

    const dates = dailyStats.map(item => formatDate(item.date));
    const issuedCounts = dailyStats.map(item => item.issuedCount);
    const parkingUsed = dailyStats.map(item => item.parkingUsed);
    const doorUsed = dailyStats.map(item => item.doorUsed);

    window.monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '발급 건수',
                    data: issuedCounts,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: '주차장 사용',
                    data: parkingUsed,
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                },
                {
                    label: '현관문 사용',
                    data: doorUsed,
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#fff'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#fff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#fff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// 페이지 로드 시 현재 월로 설정
document.addEventListener('DOMContentLoaded', () => {
    const monthlyDate = document.getElementById('monthlyDate');
    if (monthlyDate) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        monthlyDate.value = `${year}-${month}`;
        loadMonthlyStats();
    }
}); 