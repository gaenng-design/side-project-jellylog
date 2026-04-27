# Testing Guide: GitHub Sync Functionality

This guide covers how to test all aspects of the new GitHub-based synchronization system.

## Pre-Test Checklist

- [ ] You have a GitHub Personal Access Token with `repo` scope
- [ ] You have a private GitHub repository created
- [ ] You have the updated couple-budget app installed
- [ ] You have at least 2 devices/browsers to test (optional, but recommended)

## Phase 1: Initial Setup

### Test 1.1: GitHub Config Storage

1. Open couple-budget app
2. Go to Settings → GitHub 동기화
3. If not configured, you should see the **GitHub 동기화 설정** (GitHub Sync Settings) form
4. Enter:
   - Your GitHub Token
   - Your GitHub Username
   - Your Repository Name
5. Click **설정 저장** (Save Settings)
6. **Expected**: Settings form closes, and you see the sync control panel

### Test 1.2: Config Persistence

1. Close and reopen the app
2. Go back to Settings → GitHub 동기화
3. **Expected**: Your GitHub config is still there (not lost)
4. The sync control panel is shown

### Test 1.3: Config Modification

1. Click **설정 변경** (Change Settings)
2. Change one field (e.g., repository name)
3. Click **설정 저장**
4. **Expected**: New settings are saved, old settings are overwritten

## Phase 2: Data Synchronization

### Test 2.1: Pull Data

1. Ensure there are files in `data/` folder in your GitHub repository
2. Go to Settings → GitHub 동기화
3. Click **🔄 Pull**
4. Wait for the operation to complete
5. **Expected**: 
   - Success message appears: "GitHub에서 데이터를 가져왔습니다."
   - Last sync time is updated
   - No errors in browser console

### Test 2.2: Edit Local Data

1. Go to the Dashboard or other data entry pages
2. Make some changes:
   - Add a new expense
   - Add a new asset
   - Edit an existing entry
3. Go back to Settings → GitHub 동기화
4. **Expected**: 
   - You're still on the sync panel
   - No automatic upload happens (pull/push are manual)

### Test 2.3: Push Data

1. With your changes still in the app, click **💾 Commit & Push**
2. Wait for the operation to complete
3. **Expected**:
   - Success message: "GitHub에 데이터를 저장했습니다."
   - Last sync time is updated
   - Status shows recent sync

### Test 2.4: Verify Push on GitHub

1. Go to your GitHub repository in a browser
2. Navigate to the `data/` folder
3. Check each JSON file (assets.json, expenses.json, etc.)
4. **Expected**:
   - Files were modified (check "Last modified" date)
   - The commit message shows in the repository history
   - JSON content includes your changes

## Phase 3: Multi-Device Sync

### Test 3.1: Cross-Device Data Sync

1. On **Device A**: Make changes and **Commit & Push**
2. On **Device B**: Go to Settings → GitHub 동기화
3. Click **🔄 Pull**
4. **Expected**:
   - Device B loads the changes from Device A
   - Dashboard and data sections show the updated data

### Test 3.2: Conflict Resolution

1. On **Device A**: Make a change and **Commit & Push**
2. On **Device B** (before pulling):
   - Make a DIFFERENT change to a different field
   - Click **💾 Commit & Push**
3. **Expected**:
   - Both devices' changes are preserved
   - Last-write-wins: The later push overwrites the earlier push
   - No errors occur

### Test 3.3: Concurrent Edits

1. On **Device A**: Make changes but DON'T push yet
2. On **Device B**: Make different changes and **Commit & Push**
3. On **Device A**: Click **🔄 Pull**
4. **Expected**:
   - Device A's local changes are NOT lost
   - Device A also gets Device B's changes
   - No conflict occurs

## Phase 4: Error Handling

### Test 4.1: Invalid Token

1. Go to Settings → GitHub 동기화
2. Click **설정 변경**
3. Enter an invalid token (e.g., `invalid_token_12345`)
4. Click **설정 저장**
5. **Expected**:
   - Error message appears: Token verification fails
   - Settings are NOT saved

### Test 4.2: Invalid Repository

1. Go to Settings → GitHub 동기화
2. Click **설정 변경**
3. Enter a repository name that doesn't exist
4. Click **설정 저장**
5. **Expected**:
   - Error message appears: Repository not found
   - Settings are NOT saved

### Test 4.3: Network Error

1. Turn off internet connection
2. Click **🔄 Pull** or **💾 Commit & Push**
3. **Expected**:
   - Error message appears: Network error
   - App continues to work with local data
4. Turn internet back on
5. Try again
6. **Expected**: Operation succeeds

### Test 4.4: Permission Error

1. If you have multiple GitHub accounts, switch to an account that doesn't own the repository
2. Try to configure sync with that account's token
3. **Expected**:
   - Error message: "Access denied" or "Not authorized"
   - Settings are NOT saved

## Phase 5: Web App Testing

### Test 5.1: Web App Deployment

1. Check that GitHub Pages is enabled in repository settings
2. Go to Actions tab in your repository
3. Check that the **Deploy Web App to GitHub Pages** workflow has run
4. **Expected**:
   - Workflow shows green checkmark (success)
   - Deployment completed

### Test 5.2: Web App Access

1. Open browser and go to: `https://yourusername.github.io/couple-budget`
2. **Expected**:
   - Web app loads (same UI as Electron version)
   - No errors in browser console

### Test 5.3: Web App Sync

1. In the web app, go to Settings → GitHub 동기화
2. Configure GitHub sync (same as Electron app)
3. Click **🔄 Pull**
4. **Expected**:
   - Web app loads your data from GitHub
   - Dashboard shows your actual data
   - All features work the same as Electron version

## Phase 6: Data Integrity

### Test 6.1: JSON Format

1. Go to your GitHub repository
2. Check each JSON file in `data/` folder
3. **Expected**:
   - Valid JSON format (can be parsed by standard JSON tools)
   - No syntax errors
   - No truncated data

### Test 6.2: Data Completeness

1. Make sure all data types are working:
   - [ ] Assets with entries
   - [ ] Fixed expense templates
   - [ ] Investment templates
   - [ ] Expense plan data
   - [ ] Settlement data
   - [ ] Income data
2. Push each data type
3. Pull on another device
4. **Expected**: All data types are preserved and synced correctly

### Test 6.3: Git History

1. Go to your GitHub repository
2. Click on the `data/` folder
3. Check the commit history
4. **Expected**:
   - Each **Commit & Push** creates a commit
   - Commit messages show timestamps: "Update from couple-budget app - YYYY-MM-DD HH:MM:SS"
   - Previous commits are preserved

## Phase 7: Performance

### Test 7.1: Large Data

1. Create many entries (100+ assets, expenses, etc.)
2. Make changes and **Commit & Push**
3. **Expected**:
   - Push completes in reasonable time (< 5 seconds)
   - No timeouts or errors

### Test 7.2: Multiple Pulls/Pushes

1. Perform 10+ pull/push operations in succession
2. **Expected**:
   - Each operation succeeds
   - No degradation in performance
   - No connection pooling issues

## Test Report Template

When testing, record results:

```
Test Date: YYYY-MM-DD
Device: [Electron/Web]
GitHub Account: [username]
Test Results:

Phase 1 - Initial Setup:
[ ] Test 1.1: PASS/FAIL
[ ] Test 1.2: PASS/FAIL
[ ] Test 1.3: PASS/FAIL

Phase 2 - Data Synchronization:
[ ] Test 2.1: PASS/FAIL
[ ] Test 2.2: PASS/FAIL
[ ] Test 2.3: PASS/FAIL
[ ] Test 2.4: PASS/FAIL

Phase 3 - Multi-Device Sync:
[ ] Test 3.1: PASS/FAIL
[ ] Test 3.2: PASS/FAIL
[ ] Test 3.3: PASS/FAIL

Phase 4 - Error Handling:
[ ] Test 4.1: PASS/FAIL
[ ] Test 4.2: PASS/FAIL
[ ] Test 4.3: PASS/FAIL
[ ] Test 4.4: PASS/FAIL

Phase 5 - Web App:
[ ] Test 5.1: PASS/FAIL
[ ] Test 5.2: PASS/FAIL
[ ] Test 5.3: PASS/FAIL

Phase 6 - Data Integrity:
[ ] Test 6.1: PASS/FAIL
[ ] Test 6.2: PASS/FAIL
[ ] Test 6.3: PASS/FAIL

Phase 7 - Performance:
[ ] Test 7.1: PASS/FAIL
[ ] Test 7.2: PASS/FAIL

Overall Result: [PASS/FAIL]
Notes: [Any issues found, workarounds, etc.]
```

## Common Issues and Solutions

### Issue: "Token authentication failed"
- Verify token hasn't expired
- Check token has `repo` scope
- Ensure token is copied exactly (no extra spaces)

### Issue: "File not found" when pulling
- Verify data files exist in GitHub
- Check folder structure matches: `owner/repo/data/*.json`
- Create empty files if they don't exist

### Issue: Web app shows blank page
- Check browser console for errors (F12)
- Verify GitHub Pages is enabled
- Wait a few minutes for deployment to complete

### Issue: Changes don't sync between devices
- Verify you clicked **Commit & Push** on first device
- Verify you clicked **🔄 Pull** on second device
- Check network connection on both devices
- Review GitHub commit history to verify push succeeded

## Success Criteria

✅ All tests pass with no errors
✅ Data remains consistent across pull/push operations
✅ Multi-device sync works correctly
✅ Error handling provides clear messages
✅ Web app and Electron app sync together
✅ Performance is acceptable
✅ Git history shows all commits

If all these criteria are met, the GitHub sync system is ready for production use!
