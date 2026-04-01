-- 기존 프로젝트에만 실행하면 됩니다. (household-auth 마이그레이션 전체를 다시 돌리지 않을 때)
-- "가계 연결 해제"가 delete_my_household 를 쓰던 버그 수정: 멤버십만 제거하고 서버 예산 데이터는 유지.

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
