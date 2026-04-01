-- separate_items 에 "yearMonth" 만 있고 year_month 가 없을 때 (앱은 year_month 로 upsert)
-- Supabase SQL Editor 에서 한 번 실행. normalized-full / household-auth 최신본에도 동일 블록 포함됨.

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
