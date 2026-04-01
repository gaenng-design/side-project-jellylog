-- 전체 정규화 스키마 + incomes / separate_items / app_snapshot
-- Supabase Dashboard → SQL Editor에서 실행
-- RLS: anon 전체 허용 (개발·단일 사용자용; 운영 시 정책 교체 권장)
--
-- 이 파일의 incomes 등은 snake_case 컬럼(year_month)입니다.
-- 앱 .env 에 VITE_SUPABASE_REPO_COLUMNS=snake_case 를 넣어 주세요.
-- (기존 initial-tables.sql 처럼 "yearMonth" 컬럼이면 설정 생략 = camelCase 기본)

-- ============================================================
-- app_snapshot (로컬 couple-budget:* 백업용, saveAll 경로 유지)
-- ============================================================
create table if not exists public.app_snapshot (
  id text primary key,
  body jsonb not null,
  updated_at timestamptz default now()
);

alter table public.app_snapshot enable row level security;
drop policy if exists "Allow all for anon" on public.app_snapshot;
create policy "Allow all for anon" on public.app_snapshot for all using (true) with check (true);

-- ============================================================
-- incomes (수입 — MemoryAdapter couple-budget:repo:incomes)
-- ============================================================
create table if not exists public.incomes (
  id text primary key,
  year_month text not null,
  person text not null,
  category text not null,
  description text default '',
  amount numeric not null default 0
);

alter table public.incomes enable row level security;
drop policy if exists "Allow all for anon" on public.incomes;
create policy "Allow all for anon" on public.incomes for all using (true) with check (true);

-- ============================================================
-- separate_items (별도 지출 행 — plan-extra separateExpenseRowsByMonth 동기화)
-- ============================================================
create table if not exists public.separate_items (
  id text primary key,
  year_month text not null,
  person text not null,
  category text not null,
  description text default '',
  amount numeric not null default 0,
  separate_person text,
  is_separate boolean not null default true
);

-- 예전 initial-tables 등으로 테이블만 먼저 생긴 경우 "yearMonth" 만 있고 create 는 스킵됨 → 컬럼명 통일
do $si$
begin
  if exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'separate_items'
      and a.attname = 'yearMonth'
      and not a.attisdropped
      and a.attnum > 0
  ) and not exists (
    select 1
    from pg_attribute a2
    join pg_class c2 on c2.oid = a2.attrelid
    join pg_namespace n2 on n2.oid = c2.relnamespace
    where n2.nspname = 'public'
      and c2.relname = 'separate_items'
      and a2.attname = 'year_month'
      and not a2.attisdropped
      and a2.attnum > 0
  ) then
    execute 'alter table public.separate_items rename column "yearMonth" to year_month';
  end if;
end $si$;

alter table public.separate_items enable row level security;
drop policy if exists "Allow all for anon" on public.separate_items;
create policy "Allow all for anon" on public.separate_items for all using (true) with check (true);

-- ============================================================
-- 1. fixed_templates (고정지출 템플릿)
-- ============================================================
create table if not exists public.fixed_templates (
  id text primary key,
  person text not null,
  category text not null,
  description text not null default '',
  default_amount numeric not null default 0,
  sort_order integer default 0,
  person_order integer default 0,
  pay_day integer,
  default_separate boolean default false,
  default_separate_person text
);

alter table public.fixed_templates enable row level security;
drop policy if exists "Allow all for anon" on public.fixed_templates;
create policy "Allow all for anon" on public.fixed_templates for all using (true) with check (true);

-- ============================================================
-- 2. fixed_template_overrides (고정지출 월별 override)
-- ============================================================
create table if not exists public.fixed_template_overrides (
  template_id text not null,
  year_month text not null,
  amount numeric,
  is_excluded boolean default false,
  is_separate boolean default false,
  primary key (template_id, year_month)
);

alter table public.fixed_template_overrides enable row level security;
drop policy if exists "Allow all for anon" on public.fixed_template_overrides;
create policy "Allow all for anon" on public.fixed_template_overrides for all using (true) with check (true);

-- ============================================================
-- 3. invest_templates (투자·저축 템플릿)
-- ============================================================
create table if not exists public.invest_templates (
  id text primary key,
  person text not null,
  category text not null,
  description text not null default '',
  default_amount numeric not null default 0,
  sort_order integer default 0,
  person_order integer default 0,
  pay_day integer,
  maturity_date text
);

alter table public.invest_templates enable row level security;
drop policy if exists "Allow all for anon" on public.invest_templates;
create policy "Allow all for anon" on public.invest_templates for all using (true) with check (true);

-- ============================================================
-- 4. invest_template_overrides (투자·저축 월별 override)
-- ============================================================
create table if not exists public.invest_template_overrides (
  template_id text not null,
  year_month text not null,
  amount numeric,
  is_excluded boolean default false,
  primary key (template_id, year_month)
);

alter table public.invest_template_overrides enable row level security;
drop policy if exists "Allow all for anon" on public.invest_template_overrides;
create policy "Allow all for anon" on public.invest_template_overrides for all using (true) with check (true);

-- ============================================================
-- 5. plan_snapshots (월별 템플릿 스냅샷)
-- ============================================================
create table if not exists public.plan_snapshots (
  year_month text primary key,
  fixed_snapshot jsonb not null default '[]',
  invest_snapshot jsonb not null default '[]'
);

alter table public.plan_snapshots enable row level security;
drop policy if exists "Allow all for anon" on public.plan_snapshots;
create policy "Allow all for anon" on public.plan_snapshots for all using (true) with check (true);

-- ============================================================
-- 6. settlement_data (월별 정산)
-- ============================================================
create table if not exists public.settlement_data (
  year_month text primary key,
  summary_json jsonb not null default '{}',
  full_settlement_json jsonb default '{}',
  transfers_json jsonb not null default '{}',
  settled_at timestamptz
);

alter table public.settlement_data enable row level security;
drop policy if exists "Allow all for anon" on public.settlement_data;
create policy "Allow all for anon" on public.settlement_data for all using (true) with check (true);

-- ============================================================
-- 7. fixed_expenses (월별 추가 고정지출 행 — plan-extra fixed, is_separate 아님)
-- ============================================================
create table if not exists public.fixed_expenses (
  id text primary key,
  year_month text not null,
  person text not null,
  category text not null,
  description text default '',
  amount numeric not null default 0,
  is_separate boolean default false,
  separate_person text,
  pay_day integer
);

alter table public.fixed_expenses enable row level security;
drop policy if exists "Allow all for anon" on public.fixed_expenses;
create policy "Allow all for anon" on public.fixed_expenses for all using (true) with check (true);

-- ============================================================
-- 8. investments (월별 추가 투자·저축 행)
-- ============================================================
create table if not exists public.investments (
  id text primary key,
  year_month text not null,
  person text not null,
  category text not null,
  description text default '',
  amount numeric not null default 0
);

alter table public.investments enable row level security;
drop policy if exists "Allow all for anon" on public.investments;
create policy "Allow all for anon" on public.investments for all using (true) with check (true);
