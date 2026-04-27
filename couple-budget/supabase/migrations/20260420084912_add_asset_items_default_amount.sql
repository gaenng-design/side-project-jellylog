-- Add default_amount column to asset_items table
-- 자산 항목의 정기입금액(선택사항) 필드 추가

alter table asset_items
add column default_amount bigint;

comment on column asset_items.default_amount is '정기입금액(선택사항) - 각 항목의 기본/대표 입금액';
