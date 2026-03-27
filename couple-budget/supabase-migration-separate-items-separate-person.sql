-- 기존 separate_items 테이블에 별도 지출 담당(A/B) 컬럼 추가 (이미 있으면 무시)
alter table public.separate_items add column if not exists separate_person text;
