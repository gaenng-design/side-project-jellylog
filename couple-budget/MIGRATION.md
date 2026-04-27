# Data Migration Guide: Supabase to GitHub

This guide explains how to migrate your existing data from Supabase to the new GitHub-based storage system.

## Overview

The new system stores data as JSON files in a private GitHub repository instead of using Supabase. This provides:
- **Lower cost**: No Supabase subscription needed
- **Transparency**: All data is version-controlled in Git
- **Simplicity**: No complex RLS rules or authentication layer

## Prerequisites

1. A GitHub account and a private repository for your data
2. A Personal Access Token with `repo` scope (https://github.com/settings/tokens)
3. The new version of couple-budget app installed
4. Access to your Supabase database (to export data)

## Step 1: Export Data from Supabase (Optional)

If you have existing data in Supabase that you want to migrate:

### Option A: Using SQL Export

1. Go to your Supabase dashboard
2. Use the SQL editor to export each table as JSON:

```sql
-- Assets
SELECT json_agg(row_to_json(t)) FROM asset_items t WHERE household_id = 'your-household-id';

-- Expenses (Fixed Templates)
SELECT json_agg(row_to_json(t)) FROM fixed_items t WHERE household_id = 'your-household-id';

-- Investments
SELECT json_agg(row_to_json(t)) FROM invest_items t WHERE household_id = 'your-household-id';

-- Settlements
SELECT json_agg(row_to_json(t)) FROM settlements t WHERE household_id = 'your-household-id';

-- Incomes
SELECT json_agg(row_to_json(t)) FROM incomes t WHERE household_id = 'your-household-id';
```

3. Copy the results and save them to the corresponding JSON files

### Option B: Using Data Browser

1. Go to each table in Supabase Data Browser
2. Use the export function (if available) to download as JSON
3. Restructure the JSON to match the expected format

## Step 2: Prepare Your GitHub Repository

1. Create or use an existing private GitHub repository
2. Create a `data/` folder
3. Add the following template files (copy from the app's `data/` folder):
   - `assets.json`
   - `expenses.json`
   - `incomes.json`
   - `settlements.json`
   - `metadata.json`

4. Commit and push to your repository

## Step 3: Update the App Configuration

1. Open couple-budget (Electron version)
2. Go to **Settings** (⚙️) tab
3. Scroll to **GitHub 동기화** section
4. Enter your GitHub details:
   - **GitHub Token**: Your Personal Access Token
   - **GitHub Username**: Your GitHub username
   - **Repository Name**: Your repository name
5. Click **설정 저장**

## Step 4: Load Your Existing Data

If you exported data from Supabase:

1. Go back to Settings → GitHub 동기화
2. Click **Commit & Push** to save any local changes
3. The app will now use your GitHub repository for all future changes

## Step 5: Verify Data is Correct

1. Check that all your data appears in the app:
   - Dashboard shows correct month data
   - Asset tab shows all assets
   - Expense Plan shows all templates
   - Settlements shows all settlements
2. Make a small test edit (e.g., add a note)
3. Click **Commit & Push**
4. Go to GitHub and verify the `data/*.json` files were updated

## Troubleshooting

### Data doesn't appear after loading

1. Verify the JSON files are in the correct format
2. Check the browser console (F12 → Console) for error messages
3. Try clicking **Pull** to reload data from GitHub
4. If needed, manually restructure your JSON to match the expected format

### GitHub authentication fails

1. Verify your Personal Access Token has `repo` scope
2. Check that your token hasn't expired
3. Make sure your token is entered exactly as shown in GitHub
4. Create a new token if the old one is invalid

### Data looks incomplete

1. Some data fields might not be exported from Supabase
2. Manual data entry might be needed for missing information
3. The new system uses different data structures than Supabase

## Data Structure Reference

Here's the expected structure for each JSON file:

### assets.json
```json
{
  "items": [
    {
      "id": "asset-xxx",
      "name": "Asset Name",
      "category": "저축",
      "order": 0,
      "default_amount": 0
    }
  ],
  "entries": [
    {
      "id": "entry-xxx",
      "itemId": "asset-xxx",
      "yearMonth": "2026-04",
      "amount": 1000000
    }
  ]
}
```

### expenses.json
```json
{
  "fixedTemplates": [...],
  "investTemplates": [...],
  "planExtra": { ... }
}
```

### incomes.json
```json
[
  {
    "id": "income-xxx",
    "yearMonth": "2026-04",
    "person": "A",
    "category": "salary",
    "amount": 3000000,
    "day": 25
  }
]
```

### settlements.json
```json
{
  "settlements": [...],
  "transfers": { ... }
}
```

### metadata.json
```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-04-20T00:00:00Z",
  "app": { ... }
}
```

## Rollback Plan

If you need to go back to Supabase:

1. The Supabase version of the app is still available on the `supabase` branch
2. Switch back to the Electron app using that branch
3. Your Supabase data is still there (if you didn't delete your Supabase instance)

## Next Steps

- Set up the web app on GitHub Pages for browser access
- Share your GitHub repository (with token) between devices
- Enjoy managing your budget without Supabase!
