# GitHub Sync via Vercel API Routes

## 개요

웹 브라우저에서 GitHub API에 직접 접근할 수 없는 CORS(Cross-Origin Resource Sharing) 문제를 해결하기 위해 Vercel Serverless Functions을 프록시로 사용합니다.

## 아키텍처

```
웹 브라우저/모바일
    ↓
Vercel Hosted Web App
    ↓
/api/github/* (Serverless Functions)
    ↓
GitHub API
    ↓
Private GitHub Repository
```

## API Endpoints

### 1. `POST /api/github/verify`
GitHub 저장소 접근 권한 확인

**요청:**
```json
{
  "token": "ghp_xxx",
  "owner": "your_username",
  "repo": "your_repo"
}
```

**응답:**
```json
{
  "ok": true,
  "message": "GitHub access verified"
}
```

### 2. `POST /api/github/pull`
GitHub에서 데이터 파일 다운로드

**요청:**
```json
{
  "token": "ghp_xxx",
  "owner": "your_username",
  "repo": "your_repo",
  "branch": "main"
}
```

**응답:**
```json
{
  "ok": true,
  "message": "Data pulled from GitHub",
  "data": {
    "assets": {...},
    "expenses": {...},
    "incomes": {...},
    "settlements": {...},
    "metadata": {...}
  }
}
```

### 3. `POST /api/github/push`
로컬 데이터를 GitHub에 업로드 (충돌 해결 포함)

**요청:**
```json
{
  "token": "ghp_xxx",
  "owner": "your_username",
  "repo": "your_repo",
  "branch": "main",
  "data": {
    "assets": {...},
    "expenses": {...},
    ...
  },
  "message": "Update expenses for April"
}
```

**응답:**
```json
{
  "ok": true,
  "message": "Data pushed to GitHub"
}
```

## 클라이언트 구현 (github-sync.ts)

클라이언트는 직접 GitHub API를 호출하는 대신 이 API 엔드포인트들을 호출합니다:

```typescript
// Before: Direct GitHub API call (CORS 문제)
const response = await fetch('https://api.github.com/repos/...')

// After: Vercel API route (CORS 문제 없음)
const response = await fetch('/api/github/verify', {
  method: 'POST',
  body: JSON.stringify({ token, owner, repo })
})
```

## 배포

### Vercel에 배포하기

1. **GitHub 저장소를 Vercel에 연결**
   - Vercel Dashboard → New Project → GitHub 저장소 선택

2. **환경 변수 설정** (Vercel Dashboard)
   ```
   VITE_GITHUB_TOKEN = ghp_xxx (옵션 - 초기 로드용)
   VITE_GITHUB_OWNER = your_username
   VITE_GITHUB_REPO = your_repo
   ```

3. **Build Settings**
   - Build Command: `npm run build:web`
   - Output Directory: `dist-web`

4. **Deploy**
   - 자동으로 배포됨 (git push 시)

### 로컬에서 테스트

```bash
# 웹 앱 개발 모드
npm run dev:web

# 또는 프로덕션 빌드 후 미리보기
npm run build:web
npm run preview:web
```

**주의:** 로컬에서 API 엔드포인트는 작동하지 않습니다. 로컬 테스트를 위해서는 Electron 앱을 사용하거나 Vercel에 배포된 버전을 테스트하세요.

## 주요 기능

### 1. SHA 충돌 해결 (Conflict Resolution)
여러 기기에서 동시에 데이터를 업로드할 때:
- 파일별 1초 딜레이 추가 (동시성 문제 방지)
- SHA 미스매치 감지 시 자동 재시도 (최대 5회)
- 재시도 전 최신 SHA 재조회

### 2. 에러 처리
- 네트워크 오류 → 클라이언트가 로컬 데이터 사용 (오프라인 지원)
- 토큰 만료 → 사용자에게 새 토큰 입력 요청
- 저장소 접근 불가 → 명확한 에러 메시지 표시

### 3. 보안
- **Token 저장 위치:** 브라우저 localStorage (로컬에만 저장)
- **Token 전송:** HTTPS를 통해 Vercel API로만 전송
- **데이터 저장:** Private GitHub 저장소에만 저장
- **Token 노출 시:** 즉시 GitHub에서 revoke 후 새로 생성 가능

## 주의사항

### 1. Electron에서는 직접 GitHub API 호출 가능
- CORS 제약이 없으므로 API 엔드포인트 불필요
- 현재 코드는 `/api/github/*`을 호출하므로, Electron에서 동작하려면:
  - Electron에서 localhost API 프록시 추가 (선택사항), 또는
  - github-sync.ts에 환경 감지 로직 추가

### 2. Token 보안
- Token은 절대 코드에 하드코딩하면 안 됨
- GitHub 저장소가 Public이어도 데이터는 Private 저장소에만 저장됨
- Token만 있으면 누구나 데이터에 접근 가능 → 잘 관리해야 함

### 3. Rate Limiting
- GitHub API 기본 한도: 인증 시 시간당 5,000 요청
- 파일별 1초 딜레이로 충분함

## 문제 해결

### "Failed to verify GitHub access"
```
원인: 토큰 만료, 저장소 삭제, 권한 부족
해결: 
1. GitHub Settings → Tokens → 토큰 재생성
2. 새 토큰 입력 후 "설정 저장" 클릭
```

### "SHA mismatch" 에러 반복
```
원인: 동시 다중 기기 접근, 수동 git push와 충돌
해결:
1. 모든 기기에서 기기에서 Pull 먼저 실행
2. 순차적으로 Push 실행 (동시 접근 피하기)
3. GitHub 웹에서 수동으로 커밋하지 않기
```

### 웹에서 API 엔드포인트 찾을 수 없음
```
원인: 로컬 dev 서버에는 /api가 없음 (Vercel 배포용)
해결: Vercel에 배포된 버전으로 테스트하기
```

## 추후 개선사항

1. **Token 암호화 저장**
   - localStorage 대신 IndexedDB + encryption

2. **자동 conflict 해결**
   - 3-way merge 전략 구현
   - 마지막 수정자 우선 대신 병합 로직

3. **Electron 최적화**
   - Electron에서 직접 GitHub API 호출
   - API 엔드포인트는 웹 전용

4. **모바일 오프라인 지원**
   - Service Worker + IndexedDB
   - 온라인 복귀 시 자동 동기화
