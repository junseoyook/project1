const deviceId = "ESP32_001";
const deviceSecret = "esp32-secret-key";
const apiUrl = "https://pariking-system-production.up.railway.app";

async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-device-id': deviceId,
    'x-device-secret': deviceSecret,
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  
  if (!response.ok) throw new Error(data.error || '오류가 발생했습니다');
  return data;
}

async function openGate() {
  const button = document.getElementById('openButton');
  const message = document.getElementById('message');
  
  button.disabled = true;
  message.textContent = '처리중...';
  message.className = '';
  
  try {
    const data = await fetchWithAuth(`${apiUrl}/api/open`, { method: 'POST' });
    message.textContent = data.message || '차단기가 열렸습니다';
    message.className = 'success';
  } catch (error) {
    message.textContent = error.message;
    message.className = 'error';
  } finally {
    button.disabled = false;
  }
}

async function closeGate() {
  const button = document.getElementById('closeButton');
  const message = document.getElementById('message');
  
  button.disabled = true;
  message.textContent = '처리중...';
  message.className = '';
  
  try {
    const data = await fetchWithAuth(`${apiUrl}/api/close`, { method: 'POST' });
    message.textContent = data.message || '차단기가 닫혔습니다';
    message.className = 'success';
  } catch (error) {
    message.textContent = error.message;
    message.className = 'error';
  } finally {
    button.disabled = false;
  }
}

// 페이지 전환 함수
function showPage(pageId) {
    // # 제거
    pageId = pageId.replace('#', '');
    
    console.log('Switching to page:', pageId); // 디버깅용 로그
    
    // 모든 페이지 숨기기
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    
    // 모든 네비게이션 링크의 active 클래스 제거
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 선택된 페이지 표시
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.style.display = 'block';
        console.log('Page displayed:', pageId); // 디버깅용 로그
    } else {
        console.warn('Page not found:', pageId); // 디버깅용 로그
    }
    
    // 해당 네비게이션 링크 활성화
    const activeLink = document.querySelector(`.nav-link[href="#${pageId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded'); // 디버깅용 로그
    
    // 네비게이션 링크에 이벤트 리스너 추가
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = e.currentTarget.getAttribute('href');
            console.log('Navigation clicked:', href); // 디버깅용 로그
            showPage(href);
        });
    });

    // URL의 해시가 있으면 해당 페이지를, 없으면 대시보드를 표시
    const hash = window.location.hash || '#dashboard';
    console.log('Initial hash:', hash); // 디버깅용 로그
    showPage(hash);
}); 