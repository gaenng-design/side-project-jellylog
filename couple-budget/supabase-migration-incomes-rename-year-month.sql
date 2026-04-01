-- incomes 가 초기 스크립트(supabase-migration-initial-tables)의 "yearMonth" 인 경우,
-- 정규화 앱(snake_case 기본)과 맞추려면 한 번 실행 후 .env 에서 VITE_SUPABASE_INCOMES_LEGACY_YEAR_MONTH 제거 가능.
-- (이미 year_month 가 있으면 이 스크립트는 건너뛰세요.)

alter table public.incomes rename column "yearMonth" to year_month;
