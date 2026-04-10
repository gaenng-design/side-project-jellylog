-- 가계 ID로 직접 재참여 (가계에 멤버가 없어도 가능)
-- 가계를 만든 뒤 연결 해제한 경우, 또는 상대방이 아직 가입하지 않은 경우 활용.

-- household_members 에 username 컬럼 추가 (없는 경우)
alter table public.household_members
  add column if not exists username text;

-- 가계 ID + 내 아이디로 가계에 재참여
-- 이미 멤버인 경우: 그대로 반환 (멱등)
-- 아직 멤버가 아닌 경우: 삽입 (최대 2명 트리거가 막음)
create or replace function public.rejoin_household_by_id(
  p_household_id uuid,
  p_my_username text
)
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

  -- 가계 존재 확인
  select id into hid from public.households where id = p_household_id;
  if hid is null then
    raise exception '가계 ID가 올바르지 않습니다. 연결된 가계가 없습니다.';
  end if;

  -- 이미 다른 가계에 속해 있는 경우
  if exists (
    select 1 from public.household_members
    where user_id = auth.uid() and household_id <> p_household_id
  ) then
    raise exception '이미 다른 가계에 속해 있습니다. 먼저 현재 가계 연결을 해제하세요.';
  end if;

  -- 이미 이 가계의 멤버인 경우: 멱등 반환
  if exists (
    select 1 from public.household_members
    where user_id = auth.uid() and household_id = p_household_id
  ) then
    -- username 업데이트
    update public.household_members
    set username = p_my_username
    where user_id = auth.uid() and household_id = p_household_id;
    return p_household_id;
  end if;

  -- 최대 2명 확인
  select count(*)::int into cnt
  from public.household_members
  where household_id = p_household_id;

  if cnt >= 2 then
    raise exception '이 가계는 이미 2명이 참여 중입니다.';
  end if;

  -- 멤버 추가
  insert into public.household_members (household_id, user_id, username)
  values (p_household_id, auth.uid(), p_my_username);

  return p_household_id;
end;
$fn$;

grant execute on function public.rejoin_household_by_id(uuid, text) to authenticated;
