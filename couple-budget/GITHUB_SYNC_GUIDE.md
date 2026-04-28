# GitHub 동기화 설정 가이드

## 개요
이 앱은 GitHub 저장소를 데이터 백엔드로 사용합니다. 개인 GitHub 저장소에 JSON 형식의 데이터를 저장하고, 웹 또는 Electron 앱에서 Pull/Push를 통해 데이터를 동기화합니다.

## 설정 방법

### 1. GitHub Personal Access Token 생성

1. GitHub 로그인
2. Settings → Developer settings → Personal access tokens → Tokens (classic)
3. "Generate new token (classic)" 클릭
4. Token name: `couple-budget-sync`
5. Scopes: `repo` (전체 선택)
6. Token 생성 및 복사

### 2. 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성:

```bash
VITE_GITHUB_TOKEN=ghp_your_token_here
VITE_GITHUB_OWNER=your_github_username
VITE_GITHUB_REPO=side-project-jellylog
VITE_GITHUB_BRANCH=main  # 선택사항
VITE_APP_PASSWORD=260517  # 기본값
```

### 3. 앱 실행 및 동기화

#### Electron 앱
```bash
npm run dev
```

#### 웹앱 (개발)
```bash
npm run dev:web
```

#### 웹앱 배포
```bash
npm run build:web
```

웹앱은 GitHub Pages에 자동 배포됩니다: https://gaenng-design.github.io/side-project-jellylog/

## 사용 방법

### Pull (GitHub에서 로컬로 가져오기)
1. 앱의 "동기화" 버튼 클릭
2. 최신 데이터가 로컬에 로드됨

### Commit & Push (로컬에서 GitHub로 저장)
1. 데이터 수정
2. 앱의 "저장하기" 버튼 클릭
3. 변경사항이 GitHub에 커밋 및 푸시됨

## 데이터 구조

GitHub 저장소의 `data/` 폴더:
- `assets.json` - 자산 정보
- `expenses.json` - 지출 및 투자 템플릿
- `incomes.json` - 수입 정보
- `settlements.json` - 정산 내역
- `metadata.json` - 앱 메타데이터

## 보안

- Token은 로컬스토리지에만 저장되고 서버로 전송되지 않음
- Private 저장소이므로 Token 없이는 데이터 접근 불가
- Token 노출 시 GitHub에서 즉시 revoke 가능

## 트러블슈팅

### "Not Found" 에러
- GitHub Token이 정확한지 확인
- Repository name이 올바른지 확인
- Token이 `repo` 권한을 가지고 있는지 확인

### 네트워크 에러
- 인터넷 연결 확인
- Token이 만료되지 않았는지 확인

### 데이터 로드 안 됨
- 초기 실행 시 data/ 폴더의 파일이 없을 수 있음
- GitHub에 파일이 있는지 확인
