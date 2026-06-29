// ===========================
// 전역 변수 및 설정
// ===========================

let currentLanguage = 'ko';
let allStartups = []; // Google Sheets에서 가져온 전체 데이터
let filteredStartups = []; // 필터링된 데이터

// ===========================
// 다국어 시스템
// ===========================

function initLanguageToggle() {
    const langToggle = document.getElementById('langToggle');
    if (!langToggle) return;

    langToggle.addEventListener('click', () => {
        currentLanguage = currentLanguage === 'ko' ? 'en' : 'ko';
        updateLanguage();
    });
}

function updateLanguage() {
    const elements = document.querySelectorAll('[data-ko][data-en]');
    
    elements.forEach(element => {
        const text = element.getAttribute(`data-${currentLanguage}`);
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = text;
        } else {
            element.textContent = text;
        }
    });

    // HTML lang 속성 업데이트
    document.documentElement.lang = currentLanguage;
}

// ===========================
// Google Sheets 데이터 로드 (Mock 데이터)
// ===========================

// 실제 구현시 Google Sheets API 사용
// API 키: https://developers.google.com/sheets/api/quickstart/js
// 스프레드시트 ID는 URL에서 추출

async function loadStartupsData() {
    // Mock 데이터 - 실제로는 Google Sheets API에서 가져옴
    // fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${API_KEY}`)
    
    const mockData = [
        {
            id: 1,
            name: "테크스타트업 A",
            name_en: "TechStartup A",
            businessModel: "B2B",
            industry: "FinTech",
            stage: "Seed",
            productStatus: "MVP 완료",
            productStatus_en: "MVP Completed",
            description: "핀테크 솔루션을 제공하는 혁신적인 스타트업입니다.",
            description_en: "An innovative startup providing fintech solutions.",
            imageUrl: "https://via.placeholder.com/300x200/2563eb/ffffff?text=TechStartup+A",
            irDeckUrl: "#"
        },
        {
            id: 2,
            name: "헬스케어 B",
            name_en: "Healthcare B",
            businessModel: "B2C",
            industry: "HealthTech",
            stage: "Pre-Seed",
            productStatus: "프로토타입",
            productStatus_en: "Prototype",
            description: "AI 기반 건강관리 플랫폼을 개발하고 있습니다.",
            description_en: "Developing an AI-based healthcare platform.",
            imageUrl: "https://via.placeholder.com/300x200/22c55e/ffffff?text=Healthcare+B",
            irDeckUrl: "#"
        },
        {
            id: 3,
            name: "에듀테크 C",
            name_en: "EduTech C",
            businessModel: "SaaS",
            industry: "EdTech",
            stage: "Series A",
            productStatus: "시장 출시",
            productStatus_en: "Market Launch",
            description: "온라인 교육 플랫폼으로 수천명의 학생들이 사용중입니다.",
            description_en: "An online education platform used by thousands of students.",
            imageUrl: "https://via.placeholder.com/300x200/f59e0b/ffffff?text=EduTech+C",
            irDeckUrl: "#"
        },
        {
            id: 4,
            name: "이커머스 D",
            name_en: "E-commerce D",
            businessModel: "Marketplace",
            industry: "E-commerce",
            stage: "Growth",
            productStatus: "확장 중",
            productStatus_en: "Scaling",
            description: "지속 가능한 제품을 판매하는 마켓플레이스입니다.",
            description_en: "A marketplace selling sustainable products.",
            imageUrl: "https://via.placeholder.com/300x200/8b5cf6/ffffff?text=E-commerce+D",
            irDeckUrl: "#"
        },
        {
            id: 5,
            name: "AI 솔루션 E",
            name_en: "AI Solutions E",
            businessModel: "B2B2C",
            industry: "AI/ML",
            stage: "Seed",
            productStatus: "베타 테스트",
            productStatus_en: "Beta Testing",
            description: "기업과 소비자를 위한 AI 솔루션을 제공합니다.",
            description_en: "Provides AI solutions for businesses and consumers.",
            imageUrl: "https://via.placeholder.com/300x200/ec4899/ffffff?text=AI+Solutions+E",
            irDeckUrl: "#"
        },
        {
            id: 6,
            name: "플랫폼 F",
            name_en: "Platform F",
            businessModel: "Platform",
            industry: "FinTech",
            stage: "Pre-Seed",
            productStatus: "개발 중",
            productStatus_en: "In Development",
            description: "금융 서비스를 연결하는 플랫폼을 구축하고 있습니다.",
            description_en: "Building a platform connecting financial services.",
            imageUrl: "https://via.placeholder.com/300x200/06b6d4/ffffff?text=Platform+F",
            irDeckUrl: "#"
        }
    ];

    allStartups = mockData;
    filteredStartups = [...allStartups];
    return mockData;
}

// ===========================
// 스타트업 목록 렌더링
// ===========================

function renderStartups(startups) {
    const grid = document.getElementById('startupsGrid');
    const noResults = document.getElementById('noResults');
    
    if (!grid) return;

    grid.innerHTML = '';

    if (startups.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    startups.forEach(startup => {
        const card = document.createElement('div');
        card.className = 'startup-card';
        card.onclick = () => goToProfile(startup.id);

        const displayName = currentLanguage === 'ko' ? startup.name : startup.name_en;

        card.innerHTML = `
            <img src="${startup.imageUrl}" alt="${displayName}" class="startup-image">
            <h3 class="startup-name">${displayName}</h3>
            <div class="startup-tags">
                <span class="tag">${startup.businessModel}</span>
                <span class="tag">${startup.industry}</span>
                <span class="tag">${startup.stage}</span>
            </div>
            <button class="btn btn-primary startup-view-btn" data-ko="프로필 보기" data-en="View Profile">${currentLanguage === 'ko' ? '프로필 보기' : 'View Profile'}</button>
        `;

        grid.appendChild(card);
    });
}

function goToProfile(startupId) {
    // URL에 스타트업 ID를 쿼리 파라미터로 전달
    window.location.href = `profile.html?id=${startupId}`;
}

// ===========================
// 필터링 시스템
// ===========================

function initFilters() {
    const checkboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
    const resetBtn = document.getElementById('resetFilters');

    if (checkboxes.length > 0) {
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', applyFilters);
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
}

function applyFilters() {
    const selectedFilters = {
        'business-model': [],
        'industry': [],
        'stage': []
    };

    // 선택된 필터 수집
    document.querySelectorAll('.filter-option input[type="checkbox"]:checked').forEach(checkbox => {
        const filterName = checkbox.name;
        const filterValue = checkbox.value;
        
        if (selectedFilters[filterName]) {
            selectedFilters[filterName].push(filterValue);
        }
    });

    // 필터 적용
    filteredStartups = allStartups.filter(startup => {
        let match = true;

        // Business Model 필터
        if (selectedFilters['business-model'].length > 0) {
            match = match && selectedFilters['business-model'].includes(startup.businessModel);
        }

        // Industry 필터
        if (selectedFilters['industry'].length > 0) {
            match = match && selectedFilters['industry'].includes(startup.industry);
        }

        // Stage 필터
        if (selectedFilters['stage'].length > 0) {
            match = match && selectedFilters['stage'].includes(startup.stage);
        }

        return match;
    });

    renderStartups(filteredStartups);
}

function resetFilters() {
    // 모든 체크박스 해제
    document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    filteredStartups = [...allStartups];
    renderStartups(filteredStartups);
}

// ===========================
// 프로필 페이지 로드
// ===========================

async function loadProfilePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const startupId = parseInt(urlParams.get('id'));

    if (!startupId) {
        window.location.href = 'startups.html';
        return;
    }

    // 데이터 로드
    await loadStartupsData();

    const startup = allStartups.find(s => s.id === startupId);

    if (!startup) {
        window.location.href = 'startups.html';
        return;
    }

    // 프로필 정보 표시
    document.getElementById('profileImage').src = startup.imageUrl;
    document.getElementById('companyName').textContent = currentLanguage === 'ko' ? startup.name : startup.name_en;
    document.getElementById('industry').textContent = startup.industry;
    document.getElementById('businessModel').textContent = startup.businessModel;
    document.getElementById('stage').textContent = startup.stage;
    document.getElementById('productStatus').textContent = currentLanguage === 'ko' ? startup.productStatus : startup.productStatus_en;
    document.getElementById('companyDescription').textContent = currentLanguage === 'ko' ? startup.description : startup.description_en;

    // IR Deck 링크
    const irDeckLink = document.getElementById('irDeckLink');
    irDeckLink.href = startup.irDeckUrl;

    // 태그 렌더링
    const tagsContainer = document.getElementById('profileTags');
    tagsContainer.innerHTML = `
        <span class="tag">${startup.businessModel}</span>
        <span class="tag">${startup.industry}</span>
        <span class="tag">${startup.stage}</span>
    `;
}

// ===========================
// Contact 폼 처리
// ===========================

function initContactForm() {
    const form = document.getElementById('contactForm');
    const successMessage = document.getElementById('successMessage');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };

        // 실제로는 서버나 Google Forms로 전송
        console.log('Form submitted:', formData);

        // 성공 메시지 표시
        form.style.display = 'none';
        successMessage.style.display = 'block';

        // 3초 후 폼 리셋
        setTimeout(() => {
            form.reset();
            form.style.display = 'block';
            successMessage.style.display = 'none';
        }, 3000);
    });
}

// ===========================
// 페이지 초기화
// ===========================

document.addEventListener('DOMContentLoaded', async () => {
    // 공통 초기화
    initLanguageToggle();

    // 페이지별 초기화
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'startups.html' || currentPage === '') {
        await loadStartupsData();
        renderStartups(filteredStartups);
        initFilters();
    }

    if (currentPage === 'profile.html') {
        await loadProfilePage();
    }

    if (currentPage === 'contact.html') {
        initContactForm();
    }
});

// ===========================
// Google Sheets API 연동 (실제 구현 예시)
// ===========================

/*
실제 Google Sheets API 사용 예시:

1. Google Cloud Console에서 프로젝트 생성
2. Google Sheets API 활성화
3. API 키 생성
4. 스프레드시트를 "누구나 링크가 있는 사용자" 읽기 권한 설정

const SHEET_ID = 'your-spreadsheet-id';
const API_KEY = 'your-api-key';
const RANGE = 'Sheet1!A2:Z'; // 헤더 제외

async function loadStartupsDataFromSheets() {
    try {
        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`
        );
        
        const data = await response.json();
        const rows = data.values;

        // 데이터 파싱
        allStartups = rows.map((row, index) => ({
            id: index + 1,
            name: row[0],
            name_en: row[1],
            businessModel: row[2],
            industry: row[3],
            stage: row[4],
            productStatus: row[5],
            productStatus_en: row[6],
            description: row[7],
            description_en: row[8],
            imageUrl: row[9] || 'https://via.placeholder.com/300x200',
            irDeckUrl: row[10] || '#'
        }));

        filteredStartups = [...allStartups];
        return allStartups;
    } catch (error) {
        console.error('Failed to load data from Google Sheets:', error);
        return [];
    }
}

// 주기적으로 데이터 새로고침 (선택사항)
setInterval(async () => {
    await loadStartupsDataFromSheets();
    applyFilters(); // 현재 필터 다시 적용
}, 60000); // 60초마다
*/
