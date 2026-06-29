# Google Sheets API 설정 가이드

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성
1. https://console.cloud.google.com/ 접속
2. 우상단 프로젝트 선택 → "새 프로젝트" 클릭
3. 프로젝트 이름 입력 (예: "Nanuhm-Angels-Website")
4. "만들기" 클릭

### 1.2 Google Sheets API 활성화
1. 좌측 메뉴 → "API 및 서비스" → "라이브러리"
2. 검색창에 "Google Sheets API" 입력
3. "Google Sheets API" 선택 → "사용 설정" 클릭

### 1.3 API 키 생성
1. 좌측 메뉴 → "API 및 서비스" → "사용자 인증 정보"
2. 상단 "+ 사용자 인증 정보 만들기" → "API 키" 선택
3. API 키가 생성되면 복사해서 안전한 곳에 저장
4. (선택) "키 제한" → "API 제한사항" → "Google Sheets API"만 선택 (보안 강화)

## 2. Google Sheets 설정

### 2.1 스프레드시트 공유 설정
1. Google Sheets 스프레드시트 열기
2. 우상단 "공유" 버튼 클릭
3. "일반 액세스" → "링크가 있는 모든 사용자"로 변경
4. 권한: "뷰어" 선택
5. "완료" 클릭

### 2.2 스프레드시트 ID 추출
- URL 예시: `https://docs.google.com/spreadsheets/d/1abc123XYZ456-7890/edit`
- 스프레드시트 ID: `1abc123XYZ456-7890` (중간 부분)

## 3. 코드에 설정 적용

### script.js 파일 수정
```javascript
// 3-4번째 줄 수정
const SHEET_ID = '여기에_스프레드시트_ID_입력'; 
const API_KEY = '여기에_API_키_입력';
```

### 예시
```javascript
const SHEET_ID = '1abc123XYZ456-7890';
const API_KEY = 'AIzaSyB1a2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q';
```

## 4. Google Form 응답 시트 구조

### 필수 컬럼 순서 (A열부터):
| 컬럼 | 필드명 | 예시 |
|------|--------|------|
| A | Timestamp | 2026-01-24 14:30:00 |
| B | Startup Name | FinTech Innovators |
| C | Industry | Fintech, AI/Data |
| D | Primary Business Model | B2B, SaaS |
| E | Stage | MVP built |
| F | Product Status | Live product |
| G | Primary Customer | SMEs |
| H | Core Problem | Cost reduction, Operational efficiency |
| I | Solution Type | Software |
| J | Core Technologies | AI/Machine Learning, Cloud infrastructure |
| K | Founding Team | Balanced technical & business |
| L | Team Size | 6-20 |
| M | Funding Status | Seed-stage |
| N | Currently Open To | Investment, Partnerships |
| O | Light IR Deck (URL) | https://drive.google.com/file/d/.../view |
| P | Profile Picture (URL) | https://drive.google.com/file/d/.../view |

**중요:** 
- 다중 선택 항목은 쉼표(,)로 구분됩니다
- Google Form에서 파일 업로드시 자동으로 Google Drive 링크가 생성됩니다

## 5. Google Drive 파일 링크 공유 설정

### 5.1 IR Deck PDF 파일
1. Google Drive에서 파일 우클릭 → "공유"
2. "일반 액세스" → "링크가 있는 모든 사용자" (뷰어)
3. Google Form 응답에 자동으로 링크가 기록됩니다

### 5.2 프로필 이미지 파일
- 위와 동일한 방식으로 공유 설정
- 지원 형식: JPG, PNG, GIF, WEBP

## 6. 테스트

### 6.1 Mock 데이터로 먼저 테스트
```javascript
// script.js에서 loadStartupsFromSheets() 함수가 실패하면
// 자동으로 loadMockData()를 호출합니다
```

### 6.2 실제 데이터 테스트
1. `index.html` 파일을 브라우저에서 열기
2. 개발자 도구 (F12) → Console 탭 확인
3. 에러 메시지가 있는지 확인

### 일반적인 에러
- **403 Forbidden**: API 키가 잘못되었거나 Google Sheets API가 활성화되지 않음
- **404 Not Found**: 스프레드시트 ID가 잘못되었거나 공유 설정이 안됨
- **CORS Error**: 로컬에서 파일을 열 때 발생 → Live Server 사용 필요

## 7. 배포 (선택사항)

### 7.1 GitHub Pages (무료)
1. GitHub 저장소 생성
2. 파일 업로드
3. Settings → Pages → Source: main branch 선택
4. URL: `https://username.github.io/repository-name/`

### 7.2 Netlify (무료)
1. https://www.netlify.com/ 접속
2. "Add new site" → "Deploy manually"
3. 파일 드래그 앤 드롭
4. 자동으로 URL 생성

### 7.3 Vercel (무료)
1. https://vercel.com/ 접속
2. "New Project" → Import Git Repository
3. 자동 배포

## 8. 자동 새로고침 (선택사항)

스프레드시트 데이터가 업데이트될 때 자동으로 웹사이트를 새로고침하려면:

```javascript
// script.js 하단에 추가
function startAutoRefresh(intervalMinutes = 5) {
    setInterval(async () => {
        console.log('Auto-refreshing data...');
        await loadStartupsFromSheets();
        
        if (window.location.pathname.includes('startups.html')) {
            applyFilters();
        }
    }, intervalMinutes * 60 * 1000);
}

// 페이지 로드시 자동 새로고침 시작 (5분마다)
startAutoRefresh(5);
```

## 9. 보안 주의사항

### 9.1 API 키 보호
- API 키는 클라이언트 측에서 노출됩니다
- Google Cloud Console에서 API 키 제한 설정 권장:
  - "API 제한사항" → "Google Sheets API"만 선택
  - "애플리케이션 제한사항" → "HTTP 리퍼러" 추가 (배포 URL)

### 9.2 스프레드시트 권한
- "뷰어" 권한만 부여 (편집 권한 절대 안됨)
- 민감한 개인정보는 스프레드시트에 저장하지 않기

## 10. 문제 해결

### 데이터가 로드되지 않을 때
1. 브라우저 개발자 도구 (F12) → Console 확인
2. Network 탭에서 Google Sheets API 요청 확인
3. 응답 코드 확인:
   - 200: 성공
   - 403: 권한 문제
   - 404: 잘못된 ID

### 이미지/PDF가 표시되지 않을 때
1. Google Drive 링크 공유 설정 확인
2. 링크 형식 확인:
   ```
   잘못된 형식: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
   올바른 형식: https://drive.google.com/uc?export=view&id=FILE_ID
   ```
3. script.js의 `convertDriveUrl()` 함수가 자동으로 변환해줍니다

## 11. 추가 기능 제안

### 11.1 검색 기능
- 스타트업 이름으로 검색
- 키워드 검색

### 11.2 정렬 기능
- 최신순/오래된순
- 이름순

### 11.3 페이지네이션
- 스타트업이 많아지면 페이지 나누기

## 12. 지원

문제가 발생하면:
1. 개발자 도구 콘솔에서 에러 메시지 확인
2. Google Cloud Console에서 API 사용량 확인
3. 스프레드시트 공유 설정 재확인

---

**마지막 업데이트:** 2026-01-24
