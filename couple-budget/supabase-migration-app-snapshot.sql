-- 선택: 설정「전체 저장하기」로 로컬 전체(couple-budget:* 키)를 JSON으로 백업하려면 실행
create table if not exists app_snapshot (
  id text primary key,
  body jsonb not null,
  updated_at timestamptz default now()
);

alter table app_snapshot enable row level security;

drop policy if exists "Allow all for anon" on app_snapshot;
create policy "Allow all for anon" on app_snapshot for all using (true) with check (true);
