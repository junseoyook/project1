// customer-issue.js

document.addEventListener('DOMContentLoaded', () => {
    const issueBtn = document.getElementById('issueBtn');
    const phoneInput = document.getElementById('customerPhone');
    const issueMsg = document.getElementById('issueMsg');
    const issueForm = document.getElementById('issueForm');
    const remoteUI = document.getElementById('remoteUI');

    if (!issueBtn) return;

    issueBtn.addEventListener('click', async () => {
        const customerPhone = phoneInput.value.trim();
        issueMsg.textContent = '';
        if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(customerPhone)) {
            issueMsg.textContent = '올바른 휴대폰 번호를 입력하세요.';
            return;
        }
        issueBtn.disabled = true;
        issueMsg.textContent = '발급 중...';
        try {
            const response = await fetch('/api/issue-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerPhone
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                issueMsg.textContent = '주차토큰이 발급되었습니다.';
                issueForm.style.display = 'none';
                remoteUI.style.display = 'block';
            } else {
                issueMsg.textContent = data.message || '토큰 발급에 실패했습니다.';
            }
        } catch (error) {
            console.error('Error:', error);
            issueMsg.textContent = '서버 오류가 발생했습니다.';
        } finally {
            issueBtn.disabled = false;
        }
    });
}); 