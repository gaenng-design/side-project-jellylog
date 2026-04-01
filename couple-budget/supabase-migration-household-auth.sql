-- [최종] 가계·16자 접속 코드(bcrypt)·RLS 한 파일. 패치 SQL은 따로 둘 필요 없음.
-- 순서: (1) supabase-migration-normalized-full.sql 로 기본 테이블 생성 후 (2) 이 파일 전체를 Supabase SQL Editor 에서 실행.
-- 대시보드: Authentication → Sign In / Providers → Allow anonymous sign-ins 켜기.
-- 복사 시 줄 맨 앞은 -- (하이픈 두 개) 또는 SQL 키워드만 쓰기. 마크다운 목록처럼 - 한 개로 시작하는 줄 넣지 마세요.

-- Supabase: pgcrypto 함수(crypt, gen_salt)는 대부분 schema extensions 에 있음.
-- security definer 함수는 search_path 에 extensions 를 넣지 않으면 gen_salt 를 못 찾음.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.households add column if not exists access_code_hash text;
comment on column public.households.access_code_hash is '가계 접속 코드(평문 16자)의 bcrypt 해시. 평문은 DB에 저장하지 않음.';

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create unique index if not exists household_members_one_user_mvp
  on public.household_members (user_id);

create or replace function public.enforce_max_two_members()
returns trigger
language plpgsql
as $fn$
begin
  if (
    select count(*)::int from public.household_members hm
    where hm.household_id = new.household_id
  ) >= 2 then
    raise exception '가계는 최대 2명까지 참여할 수 있습니다 (MVP).';
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_household_members_max2 on public.household_members;
create trigger trg_household_members_max2
  before insert on public.household_members
  for each row execute function public.enforce_max_two_members();

-- 16자(hex) 접속 코드 1회 표시, DB에는 bcrypt 해시만 저장. invite_code 컬럼은 기존 스키마용 난수 8자로 채움.
create or replace function public.create_household_with_access_code()
returns table (household_id uuid, access_code text)
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  new_id uuid;
  plain text;
  legacy_inv text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception '이미 가계에 속해 있습니다.';
  end if;
  plain := upper(substr(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 1, 16));
  legacy_inv := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.households (invite_code, access_code_hash)
  values (legacy_inv, crypt(plain, gen_salt('bf'::text)))
  returning id into new_id;
  insert into public.household_members (household_id, user_id) values (new_id, auth.uid());
  return query select new_id, plain;
end;
$fn$;

-- 16자 접속 코드로 참여(또는 이미 멤버면 같은 가계 id 반환)
create or replace function public.join_household_by_access_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  hid uuid;
  cnt int;
  normalized text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  normalized := upper(trim(p_code));
  if length(normalized) < 16 then
    raise exception '접속 코드는 16자입니다.';
  end if;
  select h.id into hid
  from public.households h
  where h.access_code_hash is not null
    and crypt(normalized, h.access_code_hash) = h.access_code_hash
  limit 1;
  if hid is null then
    raise exception '접속 코드가 올바르지 않습니다.';
  end if;
  if exists (
    select 1 from public.household_members hm
    where hm.user_id = auth.uid() and hm.household_id = hid
  ) then
    return hid;
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception '이미 다른 가계에 속해 있습니다.';
  end if;
  select count(*)::int into cnt from public.household_members where household_id = hid;
  if cnt >= 2 then
    raise exception '이 가계는 이미 2명이 참여 중입니다.';
  end if;
  insert into public.household_members (household_id, user_id) values (hid, auth.uid());
  return hid;
end;
$fn$;

-- 예전 8자 초대 코드 전용( access_code_hash 없는 옛 가계 )
create or replace function public.join_household_by_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  hid uuid;
  cnt int;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception '이미 가계에 속해 있습니다.';
  end if;
  select h.id into hid
  from public.households h
  where h.invite_code = upper(trim(p_code))
  limit 1;
  if hid is null then
    raise exception '유효하지 않은 초대 코드입니다.';
  end if;
  select count(*)::int into cnt from public.household_members where household_id = hid;
  if cnt >= 2 then
    raise exception '이 가계는 이미 2명이 참여 중입니다.';
  end if;
  insert into public.household_members (household_id, user_id) values (hid, auth.uid());
  return hid;
end;
$fn$;

grant execute on function public.create_household_with_access_code() to authenticated;
grant execute on function public.join_household_by_access_code(text) to authenticated;
grant execute on function public.join_household_by_invite(text) to authenticated;

-- [관리/초기화용] 가계(households 행·접속 코드 해시)는 유지하고, 멤버·동기화 데이터 전부 삭제.
-- 앱의 "연결 해제"에는 쓰지 말 것 — `leave_my_household_membership` 사용. 같은 코드로 재참여 시 빈 가계.
create or replace function public.delete_my_household()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  select hm.household_id into hid
  from public.household_members hm
  where hm.user_id = auth.uid()
  limit 1;
  if hid is null then
    raise exception '가계에 속해 있지 않습니다.';
  end if;
  delete from public.fixed_template_overrides where household_id = hid;
  delete from public.invest_template_overrides where household_id = hid;
  delete from public.plan_snapshots where household_id = hid;
  delete from public.settlement_data where household_id = hid;
  delete from public.fixed_expenses where household_id = hid;
  delete from public.investments where household_id = hid;
  delete from public.incomes where household_id = hid;
  delete from public.separate_items where household_id = hid;
  delete from public.fixed_templates where household_id = hid;
  delete from public.invest_templates where household_id = hid;
  delete from public.app_snapshot where household_id = hid;
  delete from public.household_members where household_id = hid;
  -- households.id, invite_code, access_code_hash 유지
end;
$fn$;

grant execute on function public.delete_my_household() to authenticated;

-- 가계 연결 해제(앱): 본인 멤버십만 제거. incomes·스냅샷 등 서버 데이터는 유지 → 같은 접속 코드로 재참여 시 hydrate 로 복구.
create or replace function public.leave_my_household_membership()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  delete from public.household_members
  where user_id = auth.uid();
end;
$fn$;

grant execute on function public.leave_my_household_membership() to authenticated;

drop function if exists public.create_household_for_user();

alter table public.incomes add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.separate_items add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.separate_items add column if not exists separate_person text;
alter table public.separate_items add column if not exists is_separate boolean default true;

-- 레거시 separate_items 만 "yearMonth" 인 경우 (normalized-full 의 create if not exists 가 스킵된 DB)
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
alter table public.fixed_templates add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.invest_templates add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.fixed_template_overrides add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.invest_template_overrides add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.plan_snapshots add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.settlement_data add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.fixed_expenses add column if not exists household_id uuid references public.households (id) on delete cascade;
alter table public.investments add column if not exists household_id uuid references public.households (id) on delete cascade;

do $bf$
declare
  legacy_hid uuid;
begin
  if not exists (
    select 1 from public.fixed_template_overrides where household_id is null
    union all select 1 from public.invest_template_overrides where household_id is null
    union all select 1 from public.plan_snapshots where household_id is null
    union all select 1 from public.settlement_data where household_id is null
    union all select 1 from public.incomes where household_id is null
    union all select 1 from public.separate_items where household_id is null
    union all select 1 from public.fixed_templates where household_id is null
    union all select 1 from public.invest_templates where household_id is null
    union all select 1 from public.fixed_expenses where household_id is null
    union all select 1 from public.investments where household_id is null
  ) then
    return;
  end if;

  select h.id into legacy_hid from public.households h order by h.created_at asc limit 1;
  if legacy_hid is null then
    insert into public.households (invite_code)
    values (upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
    returning id into legacy_hid;
  end if;

  update public.fixed_template_overrides set household_id = legacy_hid where household_id is null;
  update public.invest_template_overrides set household_id = legacy_hid where household_id is null;
  update public.plan_snapshots set household_id = legacy_hid where household_id is null;
  update public.settlement_data set household_id = legacy_hid where household_id is null;
  update public.incomes set household_id = legacy_hid where household_id is null;
  update public.separate_items set household_id = legacy_hid where household_id is null;
  update public.fixed_templates set household_id = legacy_hid where household_id is null;
  update public.invest_templates set household_id = legacy_hid where household_id is null;
  update public.fixed_expenses set household_id = legacy_hid where household_id is null;
  update public.investments set household_id = legacy_hid where household_id is null;
end;
$bf$;

drop table if exists public.app_snapshot cascade;
create table public.app_snapshot (
  household_id uuid primary key references public.households (id) on delete cascade,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.fixed_template_overrides drop constraint if exists fixed_template_overrides_pkey;
alter table public.fixed_template_overrides add primary key (household_id, template_id, year_month);

alter table public.invest_template_overrides drop constraint if exists invest_template_overrides_pkey;
alter table public.invest_template_overrides add primary key (household_id, template_id, year_month);

alter table public.plan_snapshots drop constraint if exists plan_snapshots_pkey;
alter table public.plan_snapshots add primary key (household_id, year_month);

alter table public.settlement_data drop constraint if exists settlement_data_pkey;
alter table public.settlement_data add primary key (household_id, year_month);

create or replace function public.my_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select hm.household_id from public.household_members hm where hm.user_id = auth.uid();
$fn$;

grant execute on function public.my_household_ids() to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;

drop policy if exists "Allow all for anon" on public.households;
drop policy if exists "h_select_own" on public.households;
create policy "h_select_own" on public.households for select to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = id and hm.user_id = auth.uid()
    )
  );

drop policy if exists "Allow all for anon" on public.household_members;
drop policy if exists "hm_select" on public.household_members;
-- 본인 멤버십 행만 읽기 (my_household_ids()와 순환하지 않게 함 — 순환이면 tenant INSERT WITH CHECK 실패)
create policy "hm_select" on public.household_members for select to authenticated
  using (user_id = auth.uid());

do $rls$
declare
  t text;
begin
  foreach t in array array[
    'incomes','separate_items','fixed_templates','invest_templates',
    'fixed_template_overrides','invest_template_overrides','plan_snapshots',
    'settlement_data','fixed_expenses','investments','app_snapshot'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Allow all for anon" on public.%I', t);
    execute format('drop policy if exists "tenant_select" on public.%I', t);
    execute format('drop policy if exists "tenant_insert" on public.%I', t);
    execute format('drop policy if exists "tenant_update" on public.%I', t);
    execute format('drop policy if exists "tenant_delete" on public.%I', t);
    execute format(
      'create policy "tenant_select" on public.%I for select to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = household_id and hm.user_id = auth.uid()))',
      t
    );
    execute format(
      'create policy "tenant_insert" on public.%I for insert to authenticated with check (exists (select 1 from public.household_members hm where hm.household_id = household_id and hm.user_id = auth.uid()))',
      t
    );
    execute format(
      'create policy "tenant_update" on public.%I for update to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = household_id and hm.user_id = auth.uid())) with check (exists (select 1 from public.household_members hm where hm.household_id = household_id and hm.user_id = auth.uid()))',
      t
    );
    execute format(
      'create policy "tenant_delete" on public.%I for delete to authenticated using (exists (select 1 from public.household_members hm where hm.household_id = household_id and hm.user_id = auth.uid()))',
      t
    );
  end loop;
end;
$rls$;
