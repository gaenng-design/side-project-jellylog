-- 가계 연결 해제: 멤버십만 제거(동기화 데이터 유지). 앱 RPC leave_my_household_membership
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

-- PostgREST 스키마 캐시 갱신(함수 추가 직후 "schema cache" 오류 방지)
notify pgrst, 'reload schema';
