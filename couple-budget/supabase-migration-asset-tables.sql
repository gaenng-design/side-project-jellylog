-- 자산 항목 테이블
CREATE TABLE IF NOT EXISTS asset_items (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE asset_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can manage asset_items"
  ON asset_items
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- 자산 항목별 월 적립 금액 테이블
CREATE TABLE IF NOT EXISTS asset_entries (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  year_month TEXT NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (household_id, item_id, year_month)
);

ALTER TABLE asset_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can manage asset_entries"
  ON asset_entries
  FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );
