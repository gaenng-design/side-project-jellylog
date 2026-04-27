-- Phase 3: Normalize all column names to snake_case
-- This migration renames remaining camelCase columns across all tables

-- Rename columns in incomes table
ALTER TABLE IF EXISTS public.incomes RENAME COLUMN yearMonth TO year_month;

-- Rename columns in fixed_templates table
ALTER TABLE IF EXISTS public.fixed_templates RENAME COLUMN defaultAmount TO default_amount;
ALTER TABLE IF EXISTS public.fixed_templates RENAME COLUMN personOrder TO person_order;
ALTER TABLE IF EXISTS public.fixed_templates RENAME COLUMN payDay TO pay_day;
ALTER TABLE IF EXISTS public.fixed_templates RENAME COLUMN defaultSeparate TO default_separate;
ALTER TABLE IF EXISTS public.fixed_templates RENAME COLUMN defaultSeparatePerson TO default_separate_person;

-- Rename columns in fixed_template_overrides table
ALTER TABLE IF EXISTS public.fixed_template_overrides RENAME COLUMN overrideAmount TO override_amount;
ALTER TABLE IF EXISTS public.fixed_template_overrides RENAME COLUMN yearMonth TO year_month;
ALTER TABLE IF EXISTS public.fixed_template_overrides RENAME COLUMN overrideSeparate TO override_separate;
ALTER TABLE IF EXISTS public.fixed_template_overrides RENAME COLUMN overrideSeparatePerson TO override_separate_person;

-- Rename columns in invest_templates table
ALTER TABLE IF EXISTS public.invest_templates RENAME COLUMN defaultAmount TO default_amount;
ALTER TABLE IF EXISTS public.invest_templates RENAME COLUMN personOrder TO person_order;
ALTER TABLE IF EXISTS public.invest_templates RENAME COLUMN payDay TO pay_day;
ALTER TABLE IF EXISTS public.invest_templates RENAME COLUMN maturityDate TO maturity_date;

-- Rename columns in invest_template_overrides table
ALTER TABLE IF EXISTS public.invest_template_overrides RENAME COLUMN overrideAmount TO override_amount;
ALTER TABLE IF EXISTS public.invest_template_overrides RENAME COLUMN yearMonth TO year_month;

-- Rename columns in asset_items table
ALTER TABLE IF EXISTS public.asset_items RENAME COLUMN defaultAmount TO default_amount;

-- Rename columns in fixed_expenses table (deprecated but kept during transition)
ALTER TABLE IF EXISTS public.fixed_expenses RENAME COLUMN yearMonth TO year_month;
ALTER TABLE IF EXISTS public.fixed_expenses RENAME COLUMN isSeparate TO is_separate;
ALTER TABLE IF EXISTS public.fixed_expenses RENAME COLUMN separatePerson TO separate_person;
ALTER TABLE IF EXISTS public.fixed_expenses RENAME COLUMN payDay TO pay_day;

-- Rename columns in separate_items table (deprecated but kept during transition)
ALTER TABLE IF EXISTS public.separate_items RENAME COLUMN yearMonth TO year_month;
ALTER TABLE IF EXISTS public.separate_items RENAME COLUMN isSeparate TO is_separate;
ALTER TABLE IF EXISTS public.separate_items RENAME COLUMN separatePerson TO separate_person;

-- monthly_expenses already has snake_case from Phase 2 migration
-- No changes needed for monthly_expenses, asset_entries (they use snake_case already)
