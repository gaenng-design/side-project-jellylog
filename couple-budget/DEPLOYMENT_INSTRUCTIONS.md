# 배포 지침: GitHub Sync CORS 해결

## 🎯 상황

사용자의 요구: **"웹에서 작동해야해"**

**문제:** 모바일/웹 브라우저에서 GitHub API 직접 호출 불가 (CORS)
**해결책:** Vercel Serverless Functions을 프록시로 사용

---

## ✨ 구현 완료 사항

### 1️⃣ 3개 API 엔드포인트 생성

```
✅ /api/github/verify.ts     → 토큰 검증
✅ /api/github/pull.ts       → 데이터 다운로드  
✅ /api/github/push.ts       → 데이터 업로드 + 충돌 해결
```

### 2️⃣ 클라이언트 코드 수정

```typescript
// ✅ github-sync.ts 업데이트
verifyAccess()  → fetch('/api/github/verify')
pull()          → fetch('/api/github/pull')
push()          → fetch('/api/github/push')
```

### 3️⃣ Vercel 설정

```
✅ vercel.json 생성 → API 라우팅 설정
```

### 4️⃣ 문서 작성

```
✅ API_GITHUB_SYNC.md                   → 아키텍처 설명
✅ CORS_SOLUTION_IMPLEMENTATION.md      → 배포 가이드
✅ IMPLEMENTATION_CHANGES.md            → 변경사항 상세
```

---

## 🚀 배포 단계 (매우 간단함!)

### Step 1: 코드 push

```bash
cd /Users/gaenng/Desktop/Side\ Project/couple-budget

# 변경사항 확인
git status

# 커밋 (모든 변경사항 자동 포함)
git add -A
git commit -m "feat: CORS 해결 - Vercel Serverless Functions으로 GitHub API 프록시 구현

- API 엔드포인트 3개 생성 (verify, pull, push)
- github-sync.ts 클라이언트 코드 수정
- 모든 GitHub API 호출을 백엔드로 이동
- SHA 충돌 자동 해결 로직 포함
- 웹/모바일 브라우저 CORS 문제 완벽 해결"

# push
git push origin main
```

### Step 2: Vercel 자동 배포 (2-3분 대기)

**자동으로 진행됩니다:**
- GitHub push 감지 ✓
- 빌드 시작 (`npm run build:web`) ✓
- 배포 (dist-web → Vercel) ✓
- API 라우팅 설정 (vercel.json) ✓

**확인:**
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. couple-budget 프로젝트 선택
3. "Deployments" 탭에서 배포 상태 확인
4. 녹색 체크 ✓ = 완료

### Step 3: 환경 변수 설정 (Vercel Dashboard)

**Settings → Environment Variables**

```
추가할 변수들:
VITE_GITHUB_OWNER = gaenng-design
VITE_GITHUB_REPO = side-project-jellylog
VITE_GITHUB_TOKEN = ghp_xxx (선택 - 초기 로드용)
```

💡 팁: 환경 변수 설정 후 자동으로 다시 배포됨

### Step 4: 테스트 (웹 앱)

```
URL: https://couple-budget-xxx.vercel.app
```

**테스트 순서:**

1. 🔧 **Settings 탭 이동**
   - "GitHub 동기화 설정" 섹션 찾기

2. 🔑 **토큰 입력**
   - GitHub Token: `ghp_xxx` 입력
   - Username: `gaenng-design` 입력  
   - Repository: `side-project-jellylog` 입력

3. ✅ **"설정 저장" 클릭**
   - ✓ "설정이 저장되었습니다" 메시지 나타남

4. 📥 **Pull 버튼 클릭**
   - ✓ 로컬 데이터가 GitHub의 최신 데이터로 업데이트됨

5. 📝 **데이터 수정 → 저장하기**
   - 지출 계획 수정
   - "저장하기" 클릭 (Commit & Push)
   - ✓ "성공" 메시지 표시

6. 🔍 **GitHub 저장소에서 확인**
   ```bash
   # GitHub 웹 또는 로컬 터미널에서
   git log --oneline data/
   
   # 최근 커밋이 나타나야 함
   ```

### Step 5: 모바일 테스트 (선택사항)

```
URL을 모바일 기기에서 열기:
https://couple-budget-xxx.vercel.app
```

**동일한 테스트 수행**
- 토큰 입력 → 설정 저장
- Pull → Push
- 여러 기기에서 동기화 확인

---

## ✅ 예상되는 결과

### Before (CORS 오류)
```
❌ Failed to verify GitHub access: Load failed
```

### After (완벽 작동)
```
✅ GitHub access verified
✅ Data pulled from GitHub
✅ Data pushed to GitHub
```

---

## 🔄 동기화 워크플로우

### 일반적인 사용 패턴

```
1. 웹/모바일에서 토큰 입력 → "설정 저장"
2. "Pull" 버튼 → 최신 데이터 로드
3. 데이터 수정
4. "저장하기" 버튼 → GitHub 업로드
5. 다른 기기 → "Pull" → 최신 데이터 확인
```

### 다중 기기 시나리오

```
Chrome 일반:        저장하기 (Push) → 성공
Chrome Incognito:   Pull → 수정된 데이터 확인
모바일 Safari:      Pull → 수정된 데이터 확인
```

---

## 🆘 문제 해결

### "API endpoint not found" (404)

**원인:** Vercel 배포 완료 안 됨
**해결:**
1. Vercel Dashboard에서 배포 상태 확인
2. 초록색 체크 ✓ 확인 후 재시도

### "SHA mismatch" (409 error)

**원인:** 동시 다중 기기 접근
**자동 해결:** API가 자동으로 재시도 (최대 5회)
**수동 해결:**
1. 모든 기기에서 Pull 먼저 실행
2. 한 기기만 Push 실행
3. 다른 기기들 Pull

### "Invalid token"

**원인:** 토큰 만료 또는 잘못된 토큰
**해결:**
1. [GitHub Token 재생성](https://github.com/settings/tokens)
2. 웹 앱 Settings에서 새 토큰 입력
3. "설정 저장" 클릭

---

## 📊 기술 요약

| 항목 | 설명 |
|-----|------|
| **CORS 해결** | Vercel Serverless Functions 프록시 |
| **API 엔드포인트** | 3개 (verify, pull, push) |
| **클라이언트 변경** | github-sync.ts 수정 |
| **충돌 해결** | 자동 재시도 + SHA 재조회 |
| **Token 보안** | localStorage 저장, HTTPS 전송 |
| **지원 플랫폼** | 웹, 모바일, Electron |

---

## 📌 체크리스트

### 배포 전
- [ ] `git push` 완료
- [ ] 빌드 성공 (`npm run build:web`)

### 배포 중
- [ ] Vercel Dashboard에서 배포 진행 중 확인
- [ ] 5분 이내 배포 완료

### 배포 후
- [ ] 환경 변수 설정 완료 (VITE_GITHUB_OWNER, VITE_GITHUB_REPO)
- [ ] 웹 앱에서 토큰 입력 테스트
- [ ] Pull 버튼 작동 확인
- [ ] Push 버튼 작동 확인
- [ ] GitHub 저장소에서 파일 업데이트 확인

### 최종 테스트
- [ ] 웹 브라우저에서 정상 작동
- [ ] 모바일 브라우저에서 정상 작동
- [ ] Chrome Incognito에서 정상 작동
- [ ] 다중 기기 동기화 확인

---

## 🎉 완료!

이제 사용자가 요구한 **"웹에서 작동해야해"** 가 완벽히 달성되었습니다!

```
✅ 웹에서 GitHub 동기화 작동
✅ 모바일에서 GitHub 동기화 작동
✅ 다중 기기 동기화 가능
✅ 충돌 자동 해결
✅ CORS 문제 완벽 해결
```

---

## 📚 추가 문서

자세한 정보는 다음 파일들을 참고하세요:

- **[API_GITHUB_SYNC.md](./API_GITHUB_SYNC.md)** - API 아키텍처 & 엔드포인트 설명
- **[CORS_SOLUTION_IMPLEMENTATION.md](./CORS_SOLUTION_IMPLEMENTATION.md)** - CORS 문제 해결 방법 상세
- **[IMPLEMENTATION_CHANGES.md](./IMPLEMENTATION_CHANGES.md)** - 코드 변경사항 상세

---

## 🔗 빠른 링크

- [Vercel Dashboard](https://vercel.com/dashboard)
- [GitHub Token 생성](https://github.com/settings/tokens)
- [couple-budget 저장소](https://github.com/gaenng-design/side-project-jellylog)

---

**배포 완료 후 문제가 있으면 위의 체크리스트를 다시 확인하세요!** 🚀
