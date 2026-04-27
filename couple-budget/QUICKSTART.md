# Quick Start Guide: GitHub-Based couple-budget

Welcome! Your couple-budget app has been redesigned to use GitHub for data storage instead of Supabase. Here's how to get started.

## In 5 Minutes

### Step 1: Create GitHub Token (2 minutes)
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: `couple-budget-app`
4. Check: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token and save it somewhere safe** (you won't see it again)

### Step 2: Use the App
1. Open couple-budget (Electron or Web version)
2. Go to **Settings** (⚙️) → **GitHub 동기화**
3. Enter:
   - **GitHub Token**: The token you just created
   - **GitHub Username**: Your GitHub username
   - **Repository Name**: Your repository name (e.g., `couple-budget`)
4. Click **설정 저장** (Save Settings)

### Step 3: Start Using It
- **Pull**: Click 🔄 Pull to load existing data from GitHub
- **Edit**: Make changes in the app
- **Push**: Click 💾 Commit & Push to save changes to GitHub

**That's it!** Your data is now synced to GitHub.

## Important Files

After migration, these key files are important:

```
couple-budget/
├── README.md                      ← Overview of the project
├── QUICKSTART.md                  ← This file
├── ARCHITECTURE.md                ← Technical architecture
├── DEPLOYMENT.md                  ← GitHub Pages setup
├── MIGRATION.md                   ← Migrating from Supabase
├── TESTING.md                     ← Test checklist
├── .env                           ← Local GitHub config (don't commit!)
├── data/                          ← JSON data files
│   ├── assets.json
│   ├── expenses.json
│   ├── incomes.json
│   ├── settlements.json
│   └── metadata.json
├── src/services/
│   ├── github-sync.ts             ← GitHub API client
│   └── appBoot.ts                 ← App initialization
└── .github/workflows/
    └── deploy-web.yml             ← GitHub Pages deployment
```

## What Changed?

### Before (Supabase)
```
User ↔ Electron App ↔ Supabase Backend ↔ Supabase Database
```
- Automatic sync every 2.8 seconds
- Complex household management
- Monthly subscription cost
- Requires Supabase account

### After (GitHub)
```
User ↔ Electron App ↔ localStorage
        ↕ (manual)
     GitHub Repo (private)
```
- Manual sync (you control when)
- No multi-household complexity
- Free (uses existing GitHub)
- Full data transparency

## Key Differences

| Feature | Before | After |
|---------|--------|-------|
| Sync Method | Automatic (2.8s debounce) | Manual (on-demand) |
| Data Storage | Supabase | GitHub JSON files |
| Cost | $10-100+ per month | Free |
| Multi-User | Yes (households) | No (just 2 people) |
| Version Control | No history | Full Git history |
| Transparency | Black-box database | Open JSON files |
| Offline Support | Limited | Full support |
| Web Access | Supabase Auth | GitHub Token |

## First Time Setup

### 1. GitHub Repository
You need a private GitHub repository. Options:

**Option A: Existing Repository**
- If you already have `couple-budget` repo, just use it!
- The `data/` folder will be created automatically

**Option B: New Repository**
- Create a new private repo: https://github.com/new
- Name: `couple-budget`
- Privacy: Private
- Initialize with README (optional)

### 2. Personal Access Token
1. https://github.com/settings/tokens
2. Create token with `repo` scope
3. Copy and save somewhere safe (password manager recommended)

### 3. App Configuration
1. Open the app
2. Settings (⚙️) → GitHub 동기화
3. Enter your GitHub details
4. Click 설정 저장

### 4. First Sync
- If you have existing data: Click 🔄 Pull to load it
- If starting fresh: Just start using the app!

## Common Tasks

### Save Data to GitHub
```
Edit data in app
    ↓
Settings → GitHub 동기화
    ↓
Click 💾 Commit & Push
    ↓
Done! Data is now on GitHub
```

### Load Data on Another Device
```
Open app on Device B
    ↓
Settings → GitHub 동기화
    ↓
Enter GitHub token and repo
    ↓
Click 🔄 Pull
    ↓
Done! Device B now has Device A's data
```

### Check Your Data on GitHub
```
Open https://github.com/yourusername/couple-budget
    ↓
Click on "data" folder
    ↓
View JSON files (your actual data)
    ↓
Check "Commits" to see history
```

### Deploy Web Version
```
Make sure .github/workflows/deploy-web.yml exists (it does!)
    ↓
Push changes to main branch
    ↓
GitHub Actions runs automatically
    ↓
Web app appears at: https://yourusername.github.io/couple-budget
```

## Troubleshooting

### "Token verification failed"
- Check token hasn't expired (set longer expiration)
- Verify token has `repo` scope
- Paste token exactly (no extra spaces)

### "Repository not found"
- Check username is correct
- Check repo name is correct
- Verify repo is private and you own it
- Make sure you created a GitHub token (not just a password)

### "Data doesn't appear after pull"
- Make sure data files exist in GitHub
- Check file paths: `yourusername/couple-budget/data/*.json`
- Try clicking Pull again
- Check browser console for errors

### "I can't push changes"
- Verify token still valid
- Check internet connection
- Try pushing again (might be temporary error)
- Review GitHub status page

## What to Do Next

1. **[Required] Set up GitHub token** ← Start here!
   - https://github.com/settings/tokens

2. **[Required] Configure app**
   - Settings → GitHub 동기화
   - Enter your token and repo

3. **[Optional] Migrate existing data**
   - See MIGRATION.md if you have Supabase data
   - Otherwise just start fresh!

4. **[Optional] Deploy web app**
   - See DEPLOYMENT.md
   - Takes 5 minutes to set up GitHub Pages

5. **[Optional] Test everything**
   - See TESTING.md
   - Make sure sync works on 2 devices

## Get Help

For detailed information, see:

- **How to set up GitHub Pages?** → `DEPLOYMENT.md`
- **How to migrate data from Supabase?** → `MIGRATION.md`
- **How to test the system?** → `TESTING.md`
- **Technical details?** → `ARCHITECTURE.md`
- **How to build the app?** → Check `package.json` scripts

## Summary

✨ **You're all set!**

Your couple-budget app now:
- 💾 Saves data to GitHub (no Supabase)
- 🔄 Syncs between devices (manual)
- 🌐 Works as web app (GitHub Pages)
- 📱 Works offline (localStorage)
- 💰 Costs $0 (free!)
- 🔐 Is transparent (version-controlled)

**Next step: Configure your GitHub token and start using it!**

Questions? Check the detailed guides:
- DEPLOYMENT.md
- MIGRATION.md
- TESTING.md
- ARCHITECTURE.md
