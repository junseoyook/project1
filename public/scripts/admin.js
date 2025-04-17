// 토큰 생성 기능
async function generateToken() {
    try {
        const response = await fetch('/api/generate-token', {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('토큰 생성 실패');
        }
        
        const data = await response.json();
        const fullUrl = `${window.location.origin}${data.url}`;
        
        // 토큰 URL 표시
        const tokenDisplay = document.getElementById('tokenDisplay');
        tokenDisplay.textContent = fullUrl;
        
        // 복사 버튼 활성화
        const copyButton = document.getElementById('copyToken');
        copyButton.disabled = false;
        
        alert('토큰이 생성되었습니다. URL을 복사하여 고객에게 전달하세요.');
    } catch (error) {
        console.error('토큰 생성 오류:', error);
        alert('토큰 생성에 실패했습니다.');
    }
}

// 토큰 URL 복사 기능
function copyTokenUrl() {
    const tokenDisplay = document.getElementById('tokenDisplay');
    navigator.clipboard.writeText(tokenDisplay.textContent)
        .then(() => {
            alert('URL이 클립보드에 복사되었습니다.');
        })
        .catch(err => {
            console.error('URL 복사 실패:', err);
            alert('URL 복사에 실패했습니다.');
        });
} 