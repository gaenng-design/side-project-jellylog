# 디자인 시스템

앱의 색·글꼴·간격·모서리·그림자는 모두 `tokens.ts` 한 곳에서 정의한다. 분위기는 **차분한 핀테크**(밝은 캔버스, 흰 카드, 은은한 그림자, 대비가 분명한 회색).

## 규칙
1. 화면 코드에 `#RRGGBB`를 직접 쓰지 않는다 → `DS.color.*` 토큰을 쓴다.
2. 같은 의미는 같은 색이다: 이익 `positive`, 손실 `negative`, 주의 `warning`.
3. 글자는 `text.*`, 면은 `bg.*`, 선은 `border.*` 에서만 고른다.
4. 새 색이 필요하면 화면에 쓰지 말고 먼저 `tokens.ts`에 이름을 붙여 추가한다.
5. `styles/jellyGlass.ts`, `styles/formControls.ts`, `ds.css` 는 `tokens.ts`에서 파생된다. 값은 여기서만 바꾼다.

## 색 토큰
| 종류 | 토큰 | 값 | 쓰임 |
|---|---|---|---|
| 면 | `bg.primary` | #F5F7FA | 앱 캔버스 |
| | `bg.secondary` | #FFFFFF | 카드·모달 |
| | `bg.tertiary` | #F0F2F5 | 입력 주변 |
| | `bg.subtle` / `bg.muted` | #F9FAFB / #F3F4F6 | 표 머리글 / 칩·구분 면 |
| 글자 | `text.primary` | #1A1D1F | 제목·본문 (대비 16.9) |
| | `text.body` | #374151 | 일반 글자 (10.3) |
| | `text.secondary` | #6B7280 | 보조 설명 (4.8) |
| | `text.muted` | #8590A2 | 축 라벨·빈 값 (3.3) |
| | `text.inverse` | #FFFFFF | 색 면 위 글자 |
| 선 | `border.subtle` / `default` / `strong` | #E5E7EB / #D1D5DB / #B3B8C1 | 카드 안 구분 / 입력 / 강조 |
| 주 색 | `primary` / `primarySoft` / `primaryDark` | #4F8CFF / #EAF2FF / #3B6FD9 | CTA·포인트 / 연한 면 / 작은 글자 |
| 이익 | `positive.main / soft / border` | #059669 / #ECFDF5 / #A7F3D0 | 증가·수익 |
| 손실 | `negative.main / strong / soft / border` | #DC2626 / #B91C1C / #FEF2F2 / #FCA5A5 | 감소·오류·삭제 |
| 주의 | `warning.main / text / soft / border` | #F59E0B / #D97706 / #FFFBEB / #FED7AA | 임박·경고 |
| 카테고리 | `category.savings / invest / realEstate` | #3B82F6 / #8B5CF6 / #F59E0B | 자산 카테고리 |

모서리: `radius.card` 16 · `control` 12 · `chip` 999. 그림자: `shadow[1..3]`.

## 공용 컴포넌트 (`components/`)
`Card` · `Button`(primary / secondary / danger / soft) · `Switch` · `Chip` · `DeltaText` · `InfoRow` · `StatCard`

## 데이터로 남겨 둔 색
차트 팔레트, 사용자 칩 색 프리셋(`PersonUI`), 공동 생활비 카테고리 팔레트(`lib/categoryColors.ts`)는 사용자가 고르는 값이므로 토큰으로 바꾸지 않았다.
