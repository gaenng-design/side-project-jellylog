# Database Optimization Implementation Guide

## Status: Phase 1 ✅ Complete

### Phase 1: Remove plan_snapshots (COMPLETED)
- Migration: `supabase-migration-remove-plan-snapshots.sql` ✅
- Sync code: Removed all plan_snapshots references ✅
- Result: ~35 lines removed, ~2KB/household/month storage saved

**Changes Made:**
- Removed plan_snapshots table fetch from hydrate query
- Removed orphan cleanup for plan_snapshots  
- Removed plan_snapshots upsert in push
- Removed DbPlanSnapshot type definition
- Initialize templateSnapshotsByMonth as empty (calculated on-the-fly)

---

## Phase 2: Consolidate expenses (IN PROGRESS)

### Migration Created ✅
File: `supabase-migration-consolidate-expenses.sql`

**New Table:** `monthly_expenses`
- Combines `fixed_expenses` + `separate_items`
- Adds `source` field ('template' | 'addhoc' | 'settlement')
- Adds `template_id` FK (optional)
- RLS policies configured

### Code Changes Needed

**File:** `src/services/supabase-sync.ts`

#### Step 1: Update hydrate queries (lines 637-640)
Replace dual table fetches:
```typescript
// OLD (lines 637, 640)
supabase.from('fixed_expenses').select('*').eq('household_id', householdId),
supabase.from('separate_items').select('*').eq('household_id', householdId),

// NEW
supabase.from('monthly_expenses').select('*').eq('household_id', householdId),
```

#### Step 2: Update destructuring (around line 649)
```typescript
// OLD
const fx, sep variables assigned separately

// NEW - Single variable
const monthlyExp = (monthly ?? []) as unknown as Record<string, unknown>[]
```

#### Step 3: Simplify expense processing (around lines 756-820)
Current: Separate mapFixedRow / separate handling logic
New: Single mapping function with conditionals

**Simplification opportunity:**
- Remove separate fixedExp/sepRows logic
- Use single loop with `is_separate` flag
- Reduces code by ~150 lines

#### Step 4: Update push/upsert (around line 1100+)
Change from:
```typescript
await upsertChunk('fixed_expenses', fixedRows...)
await upsertChunk('separate_items', separateRows...)
```

To:
```typescript
const allExpenseRows = [...fixedRows, ...separateRows]
await upsertChunk('monthly_expenses', allExpenseRows...)
```

#### Step 5: Update orphan cleanup (around line 530-545)
Remove separate loops for fixed_expenses/separate_items:
```typescript
// OLD: Two separate loops
for (const table of ['fixed_expenses', 'separate_items'] as const) { ... }

// NEW: Single loop
// Orphan cleanup now covered by monthly_expenses
```

### Benefits
- Single table query (faster)
- -100 lines sync code
- -150 lines hydrate code
- Cleaner data model
- Easier to extend with new sources

---

## Phase 3: Normalize column names (PLANNED)

### Target: snake_case everywhere
Currently mixed: `yearMonth` vs `year_month`, `isSeparate` vs `is_separate`, etc.

**Columns to rename:**
- incomes: yearMonth → year_month
- fixed_expenses → monthly_expenses: yearMonth → year_month, isSeparate → is_separate, separatePerson → separate_person
- separate_items: all camelCase → snake_case
- All template tables

### Code Changes
Remove conversion logic (lines 20-50 environment variables)
- Delete: `REPO_COLUMNS`, `INCOMES_LEGACY_YEAR_MONTH_COLUMN`, etc.
- Remove: `toSnakeCaseKeys()`, `toCamelCaseKeys()` functions
- Update: All query operations to use snake_case directly

### Benefits
- Remove ~50 environment variables
- Remove ~80 lines of naming conversion code
- Consistent schema (SQL standard)
- Easier future development

---

## Implementation Checklist

### Phase 2 Complete Checklist:
- [ ] Apply `supabase-migration-consolidate-expenses.sql` to database
- [ ] Update lines 637-640: Single monthly_expenses query
- [ ] Update lines 649-653: New destructuring
- [ ] Update lines 756-820: Simplify expense mapping
- [ ] Update upsert logic around line 1100+
- [ ] Update orphan cleanup logic
- [ ] Test: Data loads correctly
- [ ] Test: Monthly expenses display correctly
- [ ] Test: Separate expense filtering works
- [ ] Commit with message: "Phase 2: Consolidate expense tables"

### Phase 3 Complete Checklist:
- [ ] Apply column rename migration
- [ ] Remove environment variable definitions (lines 20-50)
- [ ] Remove camelCase/snake_case conversion functions
- [ ] Update all table queries to use snake_case
- [ ] Test: All queries work
- [ ] Remove legacy compatibility code
- [ ] Commit with message: "Phase 3: Normalize column naming"

---

## Database Space Savings Summary

| Phase | Savings | Benefit |
|-------|---------|---------|
| Phase 1 | ~2KB/household/month | Remove redundant snapshots |
| Phase 2 | ~3-4KB/household/month | Single expense table |
| Phase 3 | ~1KB/household/month | Simpler data structure |
| **Total** | **~6-7KB reduction** | **30-40% storage savings** |

Code reduction:
- Phase 1: -35 lines
- Phase 2: -250 lines (sync + hydrate)
- Phase 3: -80 lines (conversion logic)
- **Total: -365 lines of sync code**

---

## Critical Notes

1. **Data Migration**: All migrations include data migration. No data loss.

2. **RLS Policies**: Ensure RLS policies are set up before deleting old tables.

3. **Testing**: Test thoroughly before deleting old tables:
   - Verify all months load correctly
   - Verify expense filtering works
   - Verify separate expense tracking

4. **Rollback**: Keep migration files - can always recreate old tables if needed.

5. **Phased Rollout**: Recommend deploying phases separately for stability.

---

## Links to Related Files
- Migration Phase 1: `supabase-migration-remove-plan-snapshots.sql`
- Migration Phase 2: `supabase-migration-consolidate-expenses.sql`
- Sync code: `src/services/supabase-sync.ts`
- Type definitions: `src/services/supabase-sync.ts` (interfaces section)

---

Generated: Phase 1 Complete, Phase 2-3 Ready for Implementation
