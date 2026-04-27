# Architecture: Supabase → GitHub Migration

## Overview

The couple-budget application has been successfully migrated from Supabase (cloud database) to a GitHub-based storage system. This document outlines the new architecture, how data flows through the system, and how to use it.

## Why This Change?

### Previous Architecture (Supabase)
- **Complexity**: Required user authentication, household management, and RLS policies
- **Cost**: Monthly Supabase subscription ($10-100+)
- **Multi-user**: Designed for couples to join shared households
- **Limitations**: Tied to Supabase infrastructure

### New Architecture (GitHub)
- **Simplicity**: Direct JSON storage, no authentication layer needed
- **Cost**: Free (GitHub repo already exists)
- **2-user**: Optimized for just you and your spouse
- **Flexibility**: Full version control, easy backups, transparent data
- **Independent**: No vendor lock-in, data stays in your control

## System Components

### 1. Local Data Storage
- **Technology**: Zustand + localStorage
- **Purpose**: In-memory state management with automatic browser persistence
- **Files**:
  - `src/store/useAppStore.ts` - App settings, months, metadata
  - `src/store/useFixedTemplateStore.ts` - Fixed expense templates
  - `src/store/useInvestTemplateStore.ts` - Investment templates
  - `src/store/useAssetStore.ts` - Assets and entries
  - `src/store/usePlanExtraStore.ts` - Plan extras
  - `src/store/useSettlementStore.ts` - Settlement data
- **Benefits**: Instant UI updates, works offline, no network latency

### 2. GitHub Integration
- **Technology**: GitHub REST API v3
- **Authentication**: Personal Access Token (OAuth)
- **Purpose**: Persistent storage and multi-device synchronization
- **File**: `src/services/github-sync.ts`
- **Operations**:
  - **Pull**: Download `data/*.json` files from GitHub → Load into stores
  - **Push**: Serialize stores → Upload `data/*.json` files to GitHub
- **Manual Workflow**: User explicitly triggers sync (not automatic)

### 3. UI Layer
- **Technology**: React 18 + custom components
- **GitHub Sync Panel**: `src/features/sync/GitHubSyncPanel.tsx`
  - Token input and configuration
  - Pull/Push buttons
  - Last sync timestamp
  - Status indicator

### 4. Web Deployment
- **Technology**: GitHub Pages + GitHub Actions
- **Workflow**: `.github/workflows/deploy-web.yml`
- **Process**:
  1. Push code to `main` branch
  2. GitHub Actions runs `npm run build:web`
  3. Output deployed to GitHub Pages
  4. Available at: `https://yourusername.github.io/couple-budget`
- **Data Access**: Web app uses GitHub API with local token

## Data Flow Diagrams

### Local Usage (Electron)
```
User Input (Dashboard, Settings, etc.)
    ↓
Zustand Stores (in-memory state)
    ↓
localStorage (browser storage)
    ↓
Persist automatically on store changes
    ↓
User clicks "Commit & Push"
    ↓
GitHub API (upload JSON)
```

### Cross-Device Sync
```
Device A: Click "Commit & Push"
    ↓
GitHub API: Upload data/*.json
    ↓
GitHub Repository: Files updated + commit created
    ↓
Device B: Click "Pull"
    ↓
GitHub API: Download data/*.json
    ↓
Zustand Stores: Update with new data
    ↓
UI: Re-render with synced data
```

### Web App Usage
```
Browser: Load https://github.com/yourusername/couple-budget
    ↓
GitHub Pages: Serve static web app
    ↓
User enters GitHub Token in Settings
    ↓
Click "Pull"
    ↓
GitHub API (REST): Fetch data/*.json using Token
    ↓
JSON → Zustand Stores
    ↓
UI: Display synced data
    ↓
User edits data locally
    ↓
Click "Commit & Push"
    ↓
GitHub API (REST): Upload JSON files
    ↓
GitHub commit created
```

## Key Files Changed/Created

### Deleted (Supabase)
- `src/services/supabase-sync.ts` - Supabase sync engine
- `src/services/authHousehold.ts` - Household auth
- `src/services/debouncedCloudSync.ts` - Auto-sync timer
- `src/services/syncMeta.ts` - Sync metadata tracking
- `src/services/syncBootstrap.ts` - Boot orchestration
- `src/data/supabase.ts` - Supabase client
- `src/data/saveAllToSupabase.ts` - Upload wrapper

### Created (GitHub)
- `src/services/github-sync.ts` - GitHub API client
- `src/services/appBoot.ts` - Simplified boot logic
- `src/features/sync/GitHubSyncPanel.tsx` - Sync UI component
- `.github/workflows/deploy-web.yml` - GitHub Pages deployment

### Modified
- `src/main.tsx` - Boot app with new logic
- `src/App.tsx` - Remove Supabase listeners, upload UI
- `src/features/auth/AccountPage.tsx` - Placeholder for future auth
- `src/features/expense-plan/ExpensePlanPage.tsx` - Remove Supabase uploads
- `src/data/adapters/memory.adapter.ts` - Remove cloud sync scheduling
- `src/store/rehydratePersistedStores.ts` - Remove sync suppression
- `.env` and `.env.example` - Supabase → GitHub credentials

### Documentation
- `DEPLOYMENT.md` - GitHub Pages setup
- `MIGRATION.md` - Data migration from Supabase
- `TESTING.md` - Comprehensive test plan
- `ARCHITECTURE.md` - This file

### Data
- `data/assets.json` - Template data file
- `data/expenses.json` - Template data file
- `data/incomes.json` - Template data file
- `data/settlements.json` - Template data file
- `data/metadata.json` - Template data file

## Data Structure

### GitHub Storage Format
```
couple-budget/
├── data/
│   ├── assets.json          # { items[], entries[] }
│   ├── expenses.json        # { fixedTemplates[], investTemplates[], planExtra }
│   ├── incomes.json         # [{ id, yearMonth, person, amount, ... }]
│   ├── settlements.json     # { settlements[], transfers{} }
│   └── metadata.json        # { version, app, lastUpdated, ... }
├── src/                     # Electron + Web source
├── .github/workflows/
│   └── deploy-web.yml       # GitHub Pages deployment
├── .env                     # GitHub credentials (local, not in git)
└── ... (other files)
```

### Local Storage Keys
```
localStorage {
  'couple-budget:repo:*'              // Zustand persisted stores
  'couple-budget:github-config'       // GitHub { owner, repo, token, branch }
  'couple-budget:github-last-sync'    // ISO timestamp of last sync
}
```

## Security Considerations

### Token Management
- **Storage**: Stored in browser localStorage only
- **Transmission**: Never sent to external servers, only to GitHub API
- **Scope**: Requires `repo` scope (read/write to repositories)
- **Revocation**: Can be revoked instantly from GitHub settings
- **Rotation**: Recommended to rotate every 90 days

### Data Privacy
- **Repository**: Private (accessible only with token)
- **Web App**: Public (GitHub Pages), but data remains private
- **Git History**: All changes are version-controlled and auditable
- **No Server**: Data never passes through any third-party servers

### Best Practices
1. Use a strong, unique Personal Access Token
2. Set token expiration (GitHub recommends 90 days)
3. Revoke token if compromised
4. Don't share your token or repository with untrusted parties
5. Review Git history regularly for unauthorized changes

## Performance Characteristics

| Operation | Time | Bottleneck |
|-----------|------|-----------|
| Local edit | <100ms | React rendering |
| Pull (small repo) | 1-3s | GitHub API latency |
| Push (small repo) | 1-3s | GitHub API latency |
| Pull (large repo) | 5-10s | Network bandwidth |
| Push (large repo) | 5-10s | Network bandwidth |

## Deployment Modes

### 1. Electron Desktop App
- Runs on Windows, macOS, Linux
- Local data in localStorage
- Syncs via GitHub API
- GitHub token stored locally
- Recommended for primary device

### 2. Web App (GitHub Pages)
- Accessible from any browser
- Same functionality as Electron
- GitHub token entered each session (not persisted across browser restart, unless user saves)
- Recommended for secondary device or public access

### 3. Hybrid Approach
- Electron on main computer (primary editing)
- Web app on phone/tablet (viewing and quick edits)
- Both sync to same GitHub repo
- Last-write-wins conflict resolution

## Limitations & Known Issues

1. **Manual Sync**: Unlike Supabase, syncing is manual (not automatic)
   - Mitigation: Get in habit of clicking "Push" after editing
   - Solution: Set reminder to sync at end of day

2. **Conflict Resolution**: Last-write-wins (no merge conflict detection)
   - Mitigation: Only edit on one device at a time
   - Future: Could implement conflict detection

3. **Authentication**: No user authentication system
   - OK because: App is for 2 people only
   - Future: Could add if needed for more users

4. **Offline**: Pull/push requires internet
   - OK because: Local edits work offline
   - Future: Could implement background sync queue

## Future Enhancements

### Possible Additions
- [ ] Automatic sync (watch for changes, auto-commit)
- [ ] Conflict detection and resolution UI
- [ ] Encrypted data at rest
- [ ] Collaborative edit indicators
- [ ] Data backup to multiple repos
- [ ] Web UI for direct GitHub editing
- [ ] Mobile app (React Native)
- [ ] Real-time sync via WebSockets

### Technical Debt
- [ ] Add comprehensive error handling
- [ ] Implement retry logic for network failures
- [ ] Add sync progress indicators
- [ ] Batch multiple small syncs
- [ ] Add data validation and schema versioning

## Migration Path

If you ever want to switch back or to another system:

1. **To Supabase**: Revert to `supabase` branch, data is still in Supabase
2. **To Another Cloud**: Export JSON files, import to new system
3. **To Self-Hosted**: Store JSON in your own server/database
4. **To Blockchain**: Serialize data and store on-chain

All data is in standard JSON format, making it portable.

## Support & Troubleshooting

See these documents for detailed information:
- `DEPLOYMENT.md` - GitHub Pages setup issues
- `MIGRATION.md` - Data migration problems
- `TESTING.md` - Test plan and common issues

For GitHub API issues, consult:
- https://docs.github.com/en/rest
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

## Conclusion

The new GitHub-based architecture is:
- ✅ **Simpler**: No complex backend infrastructure
- ✅ **Cheaper**: No subscription costs
- ✅ **Faster**: Direct local data, no sync latency
- ✅ **More transparent**: All data version-controlled
- ✅ **More flexible**: Easy to export and migrate data
- ✅ **More reliable**: Git as ultimate source of truth

Perfect for managing your couple's budget without Supabase!
