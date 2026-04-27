# 부부 가계부 배포 가이드

## 📱 배포 구조

```
┌─────────────────────────────────────┐
│    Supabase Backend (공유)          │
│  (DATABASE, AUTH, STORAGE)          │
└────────┬────────────┬───────────────┘
         │            │
    ┌────▼───┐   ┌────▼─────┐
    │macOS   │   │React      │
    │Electron│   │Native     │
    │ App    │   │(iOS/AND)  │
    └────────┘   └──────────┘
```

---

## 🖥️ Phase 1: macOS Electron 배포

### 1.1 현재 상태 확인
- ✅ Electron 앱 개발 완료
- ✅ 귀여운 아이콘 적용
- ✅ 기본 빌드 설정 완료

### 1.2 필요한 작업

#### A. 코드 서명 설정 (Apple Developer Account 필요)
```bash
# Apple Developer 인증서 생성
# 1. Apple Developer 포탈에서 인증서 생성
# 2. 로컬 키체인에 추가
# 3. 팀 ID 확보
```

#### B. 앱 버전 업데이트
```json
// package.json
{
  "version": "1.0.0",
  "build": {
    "appId": "com.couplebudget",
    "productName": "부부 가계부",
    "mac": {
      "target": ["dmg", "zip"],
      "signingIdentity": "Developer ID Application: ...",
      "provisioningProfile": "..."
    }
  }
}
```

#### C. 배포 빌드
```bash
npm run dist  # DMG 파일 생성
```

#### D. 배포 옵션
- **Option 1**: GitHub Releases에 DMG 파일 업로드
- **Option 2**: 자체 웹사이트에서 다운로드 제공
- **Option 3**: Mac App Store 등록 (Apple 승인 필요)

### 1.3 자동 업데이트 설정 (선택)
```bash
npm install electron-updater
```

---

## 📱 Phase 2: React Native 모바일 앱

### 2.1 프로젝트 생성

#### Option A: Expo (권장 - 가장 빠름)
```bash
npx create-expo-app couple-budget-mobile
cd couple-budget-mobile
npm install @react-navigation/native @supabase/supabase-js
```

#### Option B: React Native Bare
```bash
npx react-native init CouplebudgetMobile
```

### 2.2 Supabase 연동
```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_KEY'
)
```

### 2.3 주요 화면 이식
- 대시보드 (월별 요약)
- 지출 계획 (월 계획 입력)
- 자산 관리
- 설정

### 2.4 배포

#### iOS (App Store)
```bash
# 1. Apple Developer 등록
# 2. Xcode에서 서명 설정
# 3. 빌드 & 제출
eas build --platform ios
```

#### Android (Google Play)
```bash
# 1. Google Play Console 등록
# 2. 서명 키 생성
# 3. 빌드 & 제출
eas build --platform android
```

---

## 🔄 지속적 관리

### 업데이트 배포
- 웹 앱: Vercel/자체 서버에서 배포
- macOS: electron-updater로 자동 업데이트
- 모바일: App Store / Play Store 업데이트

### 모니터링
- Supabase 로그 모니터링
- 사용자 피드백 수집
- 에러 추적 (Sentry 등)

---

## 📋 체크리스트

### macOS 배포 전
- [ ] Apple Developer 계정 생성
- [ ] 팀 ID, 서명 인증서 확보
- [ ] 앱 버전 번호 설정
- [ ] 빌드 및 테스트
- [ ] 배포 서버/CDN 준비
- [ ] 프라이버시 정책 작성

### 모바일 배포 전
- [ ] React Native 프로젝트 생성
- [ ] UI 이식 및 테스트
- [ ] iOS 개발자 계정 생성
- [ ] Android Google Play 계정 생성
- [ ] 빌드 및 테스트
- [ ] 앱 심사 준비

---

## 🚀 다음 단계

**지금 바로 시작할 것들:**
1. [ ] Apple Developer 계정 준비
2. [ ] React Native 프로젝트 생성
3. [ ] Supabase 프로덕션 환경 설정

**우선순위:**
1. macOS DMG 배포 (1-2주)
2. React Native 기본 UI (2-3주)
3. iOS 배포 (1-2주)
4. Android 배포 (1-2주)

