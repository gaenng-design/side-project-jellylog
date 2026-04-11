-- Phase 2: Consolidate fixed_expenses + separate_items into monthly_expenses
-- Creates a unified table that replaces the dual-table expense system

CREATE TABLE IF NOT EXISTS public.monthly_expenses (
  id text PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  person text NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL,
  is_separate boolean DEFAULT false,
  separate_person text,
  source text DEFAULT 'addhoc',  -- 'template' | 'addhoc' | 'settlement'
  template_id text REFERENCES public.fixed_templates(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(household_id, year_month, id)
);

-- Create index for common queries
CREATE INDEX idx_monthly_expenses_household_id ON public.monthly_expenses(household_id);
CREATE INDEX idx_monthly_expenses_household_year_month ON public.monthly_expenses(household_id, year_month);
CREATE INDEX idx_monthly_expenses_person ON public.monthly_expenses(person);

-- Migrate data from fixed_expenses
INSERT INTO public.monthly_expenses (
  id, household_id, year_month, person, category, description, amount,
  is_separate, separate_person, source
)
SELECT
  id, household_id, year_month, person, category, description, amount,
  (is_separate OR is_separate IS NOT NULL), separate_person, 'template'
FROM public.fixed_expenses
ON CONFLICT (id) DO NOTHING;

-- Migrate data from separate_items
INSERT INTO public.monthly_expenses (
  id, household_id, year_month, person, category, description, amount,
  is_separate, separate_person, source
)
SELECT
  id, household_id, year_month, person, category, description, amount,
  (is_separate OR is_separate IS NOT NULL), separate_person, 'addhoc'
FROM public.separate_items
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policy for monthly_expenses
ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their household's monthly_expenses"
  ON public.monthly_expenses FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid()
    )
  );

-- Keep old tables for backward compatibility during transition (marked for removal)
-- ALTER TABLE public.fixed_expenses RENAME TO fixed_expenses_deprecated;
-- ALTER TABLE public.separate_items RENAME TO separate_items_deprecated;
