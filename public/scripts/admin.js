// 토큰 생성 함수
async function generateToken() {
    try {
        const response = await fetch('/api/generate-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('토큰 생성 실패');
        }

        const data = await response.json();
        const fullUrl = window.location.origin + data.url;
        
        // 토큰 URL 표시
        const tokenDisplay = document.getElementById('tokenDisplay');
        if (tokenDisplay) {
            tokenDisplay.value = fullUrl;
            
            // 복사 버튼 활성화
            const copyButton = document.getElementById('copyToken');
            if (copyButton) {
                copyButton.disabled = false;
            }
        }
        
        alert('토큰이 생성되었습니다. URL을 복사하여 고객에게 전달하세요.');
    } catch (error) {
        console.error('토큰 생성 오류:', error);
        alert('토큰 생성에 실패했습니다.');
    }
}

// 토큰 URL 복사 함수
function copyTokenUrl() {
    const tokenDisplay = document.getElementById('tokenDisplay');
    if (!tokenDisplay) return;
    
    tokenDisplay.select();
    tokenDisplay.setSelectionRange(0, 99999); // 모바일 지원
    
    try {
        navigator.clipboard.writeText(tokenDisplay.value)
            .then(() => {
                alert('URL이 클립보드에 복사되었습니다.');
            })
            .catch(err => {
                // 구형 브라우저 지원
                document.execCommand('copy');
                alert('URL이 클립보드에 복사되었습니다.');
            });
    } catch (err) {
        // 구형 브라우저 지원
        document.execCommand('copy');
        alert('URL이 클립보드에 복사되었습니다.');
    }
} 