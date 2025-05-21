// customer-issue.js

document.addEventListener('DOMContentLoaded', () => {
    const issueBtn = document.getElementById('issueBtn');
    const phoneInput = document.getElementById('customerPhone');
    const issueMsg = document.getElementById('issueMsg');
    const issueForm = document.getElementById('issueForm');
    const remoteUI = document.getElementById('remoteUI');

    if (!issueBtn) return;

    issueBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        issueMsg.textContent = '';
        if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone)) {
            issueMsg.textContent = '올바른 휴대폰 번호를 입력하세요.';
            return;
        }
        issueBtn.disabled = true;
        issueMsg.textContent = '발급 중...';
        try {
            const res = await fetch('/api/customer-issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone })
            });
            const data = await res.json();
            if (data.success) {
                if (data.parkingUrl) {
                    issueMsg.innerHTML = '아래 버튼을 눌러 리모컨을 바로 이용하세요.<br><a href="' + data.parkingUrl + '" target="_blank" style="display:inline-block;margin-top:10px;padding:10px 18px;background:#007AFF;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;">리모컨 바로가기</a>';
                } else {
                    issueMsg.textContent = '카카오톡으로 리모컨이 발송되었습니다!';
                }
                issueForm.style.display = 'none';
                remoteUI.style.display = 'block';
            } else {
                issueMsg.textContent = data.error || '발급에 실패했습니다.';
            }
        } catch (e) {
            issueMsg.textContent = '서버 오류. 잠시 후 다시 시도해 주세요.';
        } finally {
            issueBtn.disabled = false;
        }
    });
}); 