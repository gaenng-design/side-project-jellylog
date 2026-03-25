-- 기존에 incomes 테이블을 이미 만든 경우에만 실행하세요.
-- Supabase Dashboard → SQL Editor에서 실행

alter table incomes add column if not exists description text;
