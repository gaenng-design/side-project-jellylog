# 전체 데이터 Supabase 보관 — 다음 단계

## 현재 상태

- **수입**: 지출 계획 페이지에서 Supabase `incomes` 테이블에 저장됩니다. 해당 월에 항목이 없으면 설정의 유저 1/2 기본 수입으로 2건이 자동 생성됩니다.
- **Supabase 미설정 시**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 없으면 `MemoryAdapter`(localStorage)를 사용합니다.

## Supabase 테이블 생성

Supabase를 사용하려면 `supabase-migration-initial-tables.sql`을 Supabase Dashboard → SQL Editor에서 실행하세요.  
컬럼명은 앱의 camelCase(`yearMonth`, `isSeparate` 등)와 일치해야 합니다.
- **고정지출 / 투자·저축 / 별도 정산**: 아직 로컬 상태(설정·템플릿 store + 페이지 state)만 사용 중이며, Supabase에는 저장되지 않습니다.

## 이미 적용된 것

1. **Income 타입**: `description` 필드 추가 (항목명 저장).
2. **Supabase 스키마**: `incomes` 테이블에 `description` 컬럼 포함. 기존에 테이블을 만든 경우 아래 마이그레이션 실행.
3. **지출 계획 — 수입**: `useIncomes(currentYearMonth)` 사용, 추가/수정/삭제 시 repository를 통해 Supabase에 반영.

## 해야 할 작업 (순서대로)

### 1. 기존 DB에 `description` 추가 (이미 테이블이 있는 경우)

Supabase Dashboard → SQL Editor에서 실행:

```sql
alter table incomes add column if not exists description text;
```

### 2. 고정지출을 Supabase에 저장

- **개념**: 템플릿 행(설정의 고정지출 템플릿)은 그대로 store 기반으로 두고, **사용자가 “+ 항목 추가”로 넣은 행만** `fixed_expenses` 테이블에 저장.
- **구현**: `ExpensePlanPage`에서 `useFixedExpenses(currentYearMonth)` 사용.  
  - 표시할 행 = 설정의 고정지출 템플릿 목록 + `fixed_expenses`에서 `yearMonth` 일치하고 `isExtra === true`인 목록.  
  - “항목 추가” 시 `create({ yearMonth, person, category, description, amount, isExtra: true, isSeparate })` 호출.  
  - 추가한 행 수정/삭제 시 `update` / `remove` 호출.  
  - 템플릿 행의 금액/제외 여부는 기존처럼 설정 store만 사용 (필요하면 나중에 월별 override용 테이블 추가 가능).

### 3. 투자·저축을 Supabase에 저장

- 고정지출과 동일한 방식: 템플릿은 store, “+ 항목 추가”로 추가한 것만 `investments` 테이블에 저장.
- `useInvestments(currentYearMonth)` 사용.  
- “별도 정산” 체크를 DB에 남기려면 `investments` 테이블에 `isSeparate` 컬럼 추가 후 타입/어댑터 반영.

### 4. 별도 정산 카드

- 현재는 고정지출/투자·저축 행 중 `isSeparate === true`인 것만 모아서 표시.
- 원하면 `separate_items` 테이블도 활용해 “별도 정산 전용” 항목을 추가하는 UI를 넣고, `useSeparateItems(currentYearMonth)`로 표시/추가/수정/삭제할 수 있음.

### 5. (선택) 백업·복구

- 주기적으로 Supabase에서 중요 테이블을 export하거나, 앱 내 “데이터 내보내기” 버튼으로 JSON/CSV 다운로드 기능을 넣을 수 있음.

---

요약: 수입은 이미 Supabase에 저장되며, 같은 패턴으로 고정지출·투자·저축의 “추가 항목”을 repository 훅으로 연결하면 전체 데이터를 안전하게 보관할 수 있습니다.
