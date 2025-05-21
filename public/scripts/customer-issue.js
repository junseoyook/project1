// customer-issue.js

document.addEventListener('DOMContentLoaded', () => {
    const issueBtn = document.getElementById('issueBtn');
    const phoneInput = document.getElementById('customerPhone');
    const issueMsg = document.getElementById('issueMsg');
    const issueForm = document.getElementById('issueForm');
    const remoteUI = document.getElementById('remoteUI');

    if (!issueBtn) return;

    issueBtn.addEventListener('click', async () => {
        const phoneNumber = phoneInput.value.trim();
        issueMsg.textContent = '';
        if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phoneNumber)) {
            issueMsg.textContent = '올바른 휴대폰 번호를 입력하세요.';
            return;
        }
        issueBtn.disabled = true;
        issueMsg.textContent = '발급 중...';
        try {
            const response = await fetch('/api/generate-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phoneNumber
                })
            });

            const data = await response.json();
            
            if (response.ok && data.success && data.parkingUrl) {
                // 올바른 토큰만 추출
                const urlObj = new URL(data.parkingUrl, window.location.origin);
                const token = urlObj.searchParams.get('token');
                window.location.href = `/parking.html?token=${token}`;
            } else {
                issueMsg.textContent = data.message || data.error || '토큰 발급에 실패했습니다.';
            }
        } catch (error) {
            console.error('Error:', error);
            issueMsg.textContent = '서버 오류가 발생했습니다.';
        } finally {
            issueBtn.disabled = false;
        }
    });
}); 