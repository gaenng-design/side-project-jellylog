-- Phase 1: Remove plan_snapshots table (derived/redundant state)
-- The snapshots are recalculated from fixed_templates + overrides + invest_templates + overrides
-- This migration safely removes the redundant table

DROP TABLE IF EXISTS public.plan_snapshots CASCADE;
