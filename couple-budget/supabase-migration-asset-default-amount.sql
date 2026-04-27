-- Add default_amount column to asset_items
-- 정기입금액(선택사항) 필드 추가
ALTER TABLE asset_items
ADD COLUMN default_amount BIGINT;

COMMENT ON COLUMN asset_items.default_amount IS '정기입금액(선택사항) - 각 항목의 기본/대표 입금액';
