-- separate_items: 앱이 upsert 하는 확장 컬럼 (없으면 schema cache / NOT NULL 오류)
-- Supabase → SQL Editor 에서 한 번 실행 (IF NOT EXISTS 이라 중복 실행 안전)

alter table public.separate_items add column if not exists separate_person text;
alter table public.separate_items add column if not exists is_separate boolean default true;
