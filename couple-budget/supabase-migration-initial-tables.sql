-- Supabase 초기 테이블 생성
-- Supabase Dashboard → SQL Editor에서 순서대로 실행
-- VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 설정 후 사용

-- 1. 수입 (incomes) - 앱에서 yearMonth(camelCase) 사용
create table if not exists incomes (
  id text primary key,
  "yearMonth" text not null,
  person text not null,
  category text not null,
  description text,
  amount numeric not null default 0
);

-- 2. 고정지출 (fixed_expenses)
create table if not exists fixed_expenses (
  id text primary key,
  "yearMonth" text not null,
  person text not null,
  category text not null,
  description text,
  amount numeric not null default 0,
  "isSeparate" boolean default false,
  "separatePerson" text,
  "payDay" integer
);

-- 3. 투자·저축 (investments)
create table if not exists investments (
  id text primary key,
  "yearMonth" text not null,
  person text not null,
  category text not null,
  description text,
  amount numeric not null default 0
);

-- 4. 별도 정산 (separate_items)
create table if not exists separate_items (
  id text primary key,
  "yearMonth" text not null,
  person text not null,
  category text not null,
  description text,
  amount numeric not null default 0
);

-- RLS (Row Level Security) - anon 키로 접근 허용
alter table incomes enable row level security;
alter table fixed_expenses enable row level security;
alter table investments enable row level security;
alter table separate_items enable row level security;

drop policy if exists "Allow all for anon" on incomes;
create policy "Allow all for anon" on incomes for all using (true) with check (true);

drop policy if exists "Allow all for anon" on fixed_expenses;
create policy "Allow all for anon" on fixed_expenses for all using (true) with check (true);

drop policy if exists "Allow all for anon" on investments;
create policy "Allow all for anon" on investments for all using (true) with check (true);

drop policy if exists "Allow all for anon" on separate_items;
create policy "Allow all for anon" on separate_items for all using (true) with check (true);
