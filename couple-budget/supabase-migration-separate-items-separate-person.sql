-- → 통합본: supabase-migration-separate-items-columns.sql (separate_person + is_separate)
alter table public.separate_items add column if not exists separate_person text;
