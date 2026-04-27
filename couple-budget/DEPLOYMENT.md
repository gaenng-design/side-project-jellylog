# GitHub Pages Deployment Guide

This guide explains how to deploy the couple-budget web app to GitHub Pages for easy access from any browser.

## Prerequisites

- A GitHub repository (private or public)
- GitHub Pages enabled for your repository
- Personal Access Token for GitHub API access (stored in the app for data sync)

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings**
3. In the left sidebar, click **Pages**
4. Under "Build and deployment", select:
   - **Source**: GitHub Actions
5. Save the settings

The workflow file at `.github/workflows/deploy-web.yml` will automatically handle the deployment.

### 2. Deploy the Web App

The app will automatically deploy whenever you push changes to the `main` branch that affect:
- `src/` directory
- `public/` directory
- `.github/workflows/deploy-web.yml`
- `package.json`

Or you can manually trigger a deployment:
1. Go to **Actions** tab
2. Select **Deploy Web App to GitHub Pages**
3. Click **Run workflow**

### 3. Access Your Web App

Once deployed, your web app will be available at:
```
https://yourusername.github.io/couple-budget
```

(Replace `yourusername` with your actual GitHub username)

## Using the Web App

### First Time Setup

1. Open the deployed web app URL
2. Go to **Settings** (⚙️) tab
3. At the top, you'll see **GitHub 동기화** (GitHub Sync) section
4. Enter your GitHub details:
   - **GitHub Token**: Your Personal Access Token (create at https://github.com/settings/tokens)
   - **GitHub Username**: Your GitHub username
   - **Repository Name**: The name of your repository (e.g., `couple-budget`)
5. Click **설정 저장** (Save Settings)

The token is stored locally in your browser and is used only to authenticate API requests to your private repository.

### Using the Web App

- **Pull**: Downloads the latest data from GitHub
- **Commit & Push**: Saves your local changes to GitHub
- **Settings 변경**: Change your GitHub configuration
- **연결 해제**: Remove GitHub configuration from this device

## Security Considerations

1. **Token Storage**: Your GitHub token is stored in the browser's localStorage. It is NOT sent to any server except GitHub.

2. **Private Repository**: Your data remains in your private repository. Even though the web app is deployed publicly, only people with the token can access your data.

3. **Token Rotation**: If you suspect your token is compromised:
   - Go to https://github.com/settings/tokens
   - Revoke the leaked token
   - Create a new token
   - Update the token in the app

## Building the Web App Locally

To test the web app before deployment:

```bash
npm install
npm run build:web
npm run preview:web
```

This will build the web app and start a local preview server.

## Troubleshooting

### Deployment fails

Check the **Actions** tab in your repository for error logs. Common issues:
- Node.js version mismatch (the workflow uses Node 20)
- Missing dependencies (try `npm ci` locally)
- Build errors (run `npm run build:web` locally to debug)

### Web app loads but data doesn't sync

1. Check your GitHub token is valid and hasn't expired
2. Verify the repository name matches exactly
3. Ensure your repository has a `data/` folder with JSON files
4. Check browser console (F12 → Console) for error messages

### Can't access the web app

1. Verify GitHub Pages is enabled in repository settings
2. Wait a few minutes after first push (initial deployment takes time)
3. Check that the deployment workflow completed successfully in the **Actions** tab
4. Clear browser cache and try again

## Data File Structure

The app expects the following structure in your GitHub repository:

```
couple-budget/
├── data/
│   ├── assets.json
│   ├── expenses.json
│   ├── incomes.json
│   ├── settlements.json
│   └── metadata.json
├── src/
├── .github/
│   └── workflows/
│       └── deploy-web.yml
└── ...
```

If any data files are missing, they will be created on the first push.

## Environment Variables

The web app reads GitHub credentials from:
- Browser localStorage: `couple-budget:github-config`

This is populated by the GitHub Sync Settings form in the app.

## Next Steps

1. Set up your GitHub repository with the data files
2. Deploy the web app using the GitHub Pages workflow
3. Configure GitHub sync in the app settings
4. Test pull/push operations with sample data
5. Enjoy managing your budget from anywhere!
