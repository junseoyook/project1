// 페이지 전환
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.target.dataset.page;
        
        // 활성화된 페이지 변경
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(page).classList.add('active');
        
        // 네비게이션 링크 활성화 상태 변경
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        
        // 페이지별 데이터 로드
        switch(page) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'reservations':
                loadReservations();
                break;
            case 'logs':
                loadLogs();
                break;
        }
    });
});

// 대시보드 데이터 로드
async function loadDashboard() {
    try {
        const response = await fetch('/api/entry-logs');
        const logs = await response.json();
        
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = logs.filter(log => 
            log.type === 'entry' && 
            new Date(log.entryTime).toISOString().split('T')[0] === today
        );
        const todayExits = logs.filter(log => 
            log.type === 'exit' && 
            new Date(log.entryTime).toISOString().split('T')[0] === today
        );
        
        document.getElementById('currentParking').textContent = 
            `${todayEntries.length - todayExits.length}대 주차 중`;
        document.getElementById('todayEntries').textContent = 
            `${todayEntries.length}건`;
        document.getElementById('todayExits').textContent = 
            `${todayExits.length}건`;
    } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
    }
}

// 예약 목록 로드
async function loadReservations() {
    try {
        const response = await fetch('/api/reservations');
        const reservations = await response.json();
        
        const tbody = document.getElementById('reservationList');
        tbody.innerHTML = '';
        
        reservations.forEach(reservation => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${reservation.customerName}</td>
                <td>${reservation.phoneNumber}</td>
                <td>${reservation.licensePlate}</td>
                <td>${new Date(reservation.startTime).toLocaleString()}</td>
                <td>${new Date(reservation.endTime).toLocaleString()}</td>
                <td>${reservation.usageType === 'single' ? '1회성' : '시간제'}</td>
                <td>${getStatusText(reservation.status)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="cancelReservation('${reservation._id}')">
                        취소
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('예약 목록 로드 실패:', error);
    }
}

// 입출차 기록 로드
async function loadLogs() {
    try {
        const response = await fetch('/api/entry-logs');
        const logs = await response.json();
        
        const tbody = document.getElementById('logList');
        tbody.innerHTML = '';
        
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(log.entryTime).toLocaleString()}</td>
                <td>${log.licensePlate}</td>
                <td>${log.type === 'entry' ? '입차' : '출차'}</td>
                <td>${log.status === 'success' ? '성공' : '실패'}</td>
                <td>${log.reason || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('입출차 기록 로드 실패:', error);
    }
}

// 예약 상태 텍스트 변환
function getStatusText(status) {
    switch(status) {
        case 'pending': return '대기중';
        case 'active': return '사용중';
        case 'completed': return '완료';
        case 'cancelled': return '취소';
        default: return status;
    }
}

// 예약 취소
async function cancelReservation(id) {
    if (!confirm('정말로 이 예약을 취소하시겠습니까?')) return;
    
    try {
        const response = await fetch(`/api/reservations/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadReservations();
        } else {
            alert('예약 취소에 실패했습니다.');
        }
    } catch (error) {
        console.error('예약 취소 실패:', error);
        alert('예약 취소에 실패했습니다.');
    }
}

// 새 예약 저장
document.getElementById('saveReservation').addEventListener('click', async () => {
    const form = document.getElementById('reservationForm');
    const formData = new FormData(form);
    
    const reservation = {
        customerName: formData.get('customerName'),
        phoneNumber: formData.get('phoneNumber'),
        licensePlate: formData.get('licensePlate'),
        startTime: new Date(formData.get('startTime')).toISOString(),
        endTime: new Date(formData.get('endTime')).toISOString(),
        usageType: formData.get('usageType')
    };
    
    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservation)
        });
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('reservationModal'));
            modal.hide();
            form.reset();
            loadReservations();
        } else {
            alert('예약 저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('예약 저장 실패:', error);
        alert('예약 저장에 실패했습니다.');
    }
});

// 초기 데이터 로드
loadDashboard(); 