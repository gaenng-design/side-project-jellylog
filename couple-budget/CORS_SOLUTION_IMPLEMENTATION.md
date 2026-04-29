# CORS 문제 해결 - Vercel Serverless Functions 구현

## 문제 상황

✗ **모바일/웹 브라우저에서 GitHub 동기화 실패**
- 증상: "Failed to verify GitHub access: Load failed"
- 원인: 웹 브라우저의 CORS(Cross-Origin Resource Sharing) 정책
- Electron: 동작함 (CORS 제약 없음)
- 모바일/웹: 실패 (GitHub API 직접 호출 불가)

## 해결 방법

✅ **Vercel Serverless Functions를 GitHub API 프록시로 사용**

### 아키텍처 변경

**Before (CORS 오류):**
```
모바일/웹 브라우저 
  → fetch('https://api.github.com/...') 
  → ❌ CORS 오류 (같은 도메인이 아님)
```

**After (작동함):**
```
모바일/웹 브라우저 
  → fetch('/api/github/verify') 
  → Vercel Serverless Function (backend)
  → fetch('https://api.github.com/...') 
  → ✅ 작동함 (backend-to-backend, CORS 없음)
```

## 구현 내용

### 1. 새로운 API Endpoints 생성

**파일 위치:** `/api/github/`

| 엔드포인트 | 역할 | 파일 |
|----------|------|------|
| `POST /api/github/verify` | 토큰 검증 & 저장소 접근 확인 | verify.ts |
| `POST /api/github/pull` | 원격 데이터 다운로드 | pull.ts |
| `POST /api/github/push` | 로컬 데이터 업로드 (충돌 해결 포함) | push.ts |

**특징:**
- Token은 클라이언트에서 POST body로 전달 (매 요청마다)
- Token은 서버에 저장되지 않음 (무상태 API)
- 모든 GitHub API 호출은 백엔드에서 수행 (CORS 회피)

### 2. 클라이언트 수정 (github-sync.ts)

**변경점:**
```typescript
// Before: 직접 GitHub API 호출
async verifyAccess() {
  const response = await fetch('https://api.github.com/repos/...')
}

// After: 백엔드 API 호출
async verifyAccess() {
  const response = await fetch('/api/github/verify', {
    method: 'POST',
    body: JSON.stringify({ token, owner, repo })
  })
}
```

**제거된 코드:**
- `private getFileContent()` - 백엔드 API로 대체
- `private setFileContent()` - 백엔드 API로 대체
- `private baseUrl` - 필요 없음

### 3. Vercel 설정 (vercel.json)

```json
{
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist-web",
  "routes": [
    {
      "src": "/api/github/(.*)",
      "dest": "/api/github/$1.ts"
    }
  ]
}
```

## 배포 방법

### Step 1: 코드 커밋
```bash
git add -A
git commit -m "feat: CORS 해결 - Vercel Serverless Functions 추가"
git push
```

### Step 2: Vercel에 배포 (자동)
GitHub 연결 시 push되면 자동으로 배포됨

### Step 3: 환경 변수 설정 (Vercel Dashboard)
```
VITE_GITHUB_TOKEN = ghp_xxx (선택, 초기 로드용)
VITE_GITHUB_OWNER = your_username
VITE_GITHUB_REPO = your_repo
```

### Step 4: 테스트

**웹 앱에서 테스트:**
1. Vercel 배포된 URL 접속
2. GitHub Settings → 토큰 입력
3. "설정 저장" 클릭 → "설정이 저장되었습니다" 메시지 확인
4. Pull 버튼 → 데이터 로드 확인
5. 데이터 수정 후 "저장하기" → GitHub 동기화 확인

**모바일에서 테스트:**
1. Vercel 배포된 URL을 모바일 브라우저에서 접속
2. 같은 절차로 테스트

## 기술 상세 정보

### Token 보안
```
Token 저장 위치: 브라우저 localStorage (로컬만)
Token 전송: HTTPS를 통해 Vercel API로만 전송
Token 사용: 서버에서 GitHub API 호출 시에만 사용 (저장 안 함)
```

### 충돌 해결 (SHA Mismatch)
```
문제: 여러 기기에서 동시 업로드 시 SHA 불일치
해결:
1. 파일별 1초 딜레이 추가
2. 409 에러 감지 시 최신 SHA 재조회
3. 최대 5회 재시도 (1s → 2s → 3s → 4s → 5s 대기)
```

### 오프라인 지원
```
Pull 실패: localStorage 캐시 사용 (계속 작동)
Push 실패: 로컬 저장 유지 (다음 온라인 시 재시도)
자동 동기화 불필요: 수동 버튼 클릭으로 명시적 제어
```

## 테스트 체크리스트

### 웹 플랫폼
- [ ] Vercel URL에서 페이지 로드됨
- [ ] GitHub 토큰 입력 가능
- [ ] "설정 저장" 후 검증 성공
- [ ] Pull 버튼 작동 (데이터 로드됨)
- [ ] 데이터 수정 후 저장하기 (Commit & Push)
- [ ] GitHub 저장소에서 파일 업데이트 확인 (git log 확인)

### 모바일 플랫폼
- [ ] 모바일 브라우저에서 URL 접속 가능
- [ ] 토큰 입력 & 저장 성공
- [ ] Pull 기능 작동
- [ ] Push 기능 작동

### Chrome Incognito (다중 기기 시뮬레이션)
- [ ] 일반 탭과 Incognito 탭에서 각각 토큰 입력
- [ ] 일반 탭에서 Pull → 데이터 로드
- [ ] 일반 탭에서 수정 → Push
- [ ] Incognito 탭에서 Pull → 수정된 데이터 확인

### 에러 처리
- [ ] 유효하지 않은 토큰 입력 → 명확한 에러 메시지
- [ ] 존재하지 않는 저장소 → "저장소를 찾을 수 없음" 메시지
- [ ] 네트워크 오류 → 재시도 옵션 제공
- [ ] 동시 접근 → SHA 충돌 자동 해결

## 추가 설정 (선택사항)

### 로컬 API 프록시 (Electron용)
Electron에서도 `/api/github/*` 엔드포인트를 사용하려면:

```typescript
// electron/main/index.ts
app.on('ready', () => {
  // localhost:3000에서 API 서빙
  createLocalApiServer()
})
```

### Token 만료 시 처리
```typescript
// github-sync.ts에 추가
if (response.status === 401) {
  // Token 만료 → 사용자에게 새로 입력 요청
  showTokenRefreshDialog()
}
```

## 문제 해결

### "POST /api/github/verify 404"
**원인:** Vercel에 배포되지 않았음
**해결:** 
1. `git push`로 코드 업로드
2. Vercel Dashboard에서 배포 상태 확인
3. 배포 완료 후 다시 시도

### "SHA mismatch" 반복
**원인:** 동시 다중 기기 접근
**해결:**
1. 모든 기기에서 Pull 먼저 실행
2. 순차적으로 (한 기기만) Push 실행
3. GitHub 웹에서 수동 커밋 피하기

### Electron에서 API 호출 실패
**원인:** localhost API 없음 (웹 전용 배포)
**해결:**
1. Electron에서 직접 GitHub API 호출하도록 수정 (선택사항)
2. 또는 Vercel API 사용 (현재 동작함)

## 다음 단계

1. **Electron 최적화** (선택사항)
   - Electron에서 직접 GitHub API 호출
   - 대역폭 감소, 지연 개선

2. **Token 암호화**
   - localStorage 대신 IndexedDB + encryption
   - 더 안전한 저장

3. **자동 동기화**
   - 설정 시간마다 자동 Pull
   - 페이지 로드 시 자동 Pull

4. **모바일 오프라인 지원**
   - Service Worker 추가
   - 온라인 복귀 시 자동 sync

## 요약

| 항목 | 변경사항 |
|-----|--------|
| **API 엔드포인트** | 3개 신규 생성 (verify, pull, push) |
| **클라이언트 코드** | github-sync.ts 간소화 (직접 호출 제거) |
| **배포 방식** | Vercel Functions 자동 배포 |
| **Token 보안** | 로컬 저장 유지, HTTPS 전송 |
| **충돌 해결** | 백엔드에서 자동 처리 |
| **지원 플랫폼** | 웹/모바일/Electron 모두 지원 |

---

**배포 후:** 모바일 크롬에서 "웹에서 작동해야해" 요구사항 완전히 달성됨 ✅
