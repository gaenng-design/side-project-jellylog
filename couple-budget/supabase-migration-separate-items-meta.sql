-- 별도 지출(separate_items): ↗ 별도 정산 태그(is_separate) — 앱 칩 상태 동기화
-- 이미 household-auth / normalized-full 반영 후면 생략 가능

alter table public.separate_items add column if not exists is_separate boolean default true;
