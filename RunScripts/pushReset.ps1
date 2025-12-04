# Reset Git and Push to GitHub
# Repository: https://github.com/georgeGeorgakakos/optimusddc.git

Write-Host "=== OptimusDDC Git Reset and Push ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$projectPath = "C:\Users\georg\GolandProjects\optimusddc"
$repoUrl = "https://github.com/georgeGeorgakakos/optimusddc.git"
$userName = "George Georgakakos"
$userEmail = "george.georgakakos@gmail.com"

# Navigate to project directory
Write-Host "📁 Navigating to project directory..." -ForegroundColor Yellow
Set-Location $projectPath

# Step 1: Remove existing Git repository
Write-Host ""
Write-Host "🗑️  Step 1: Removing existing Git repository (if any)..." -ForegroundColor Yellow
if (Test-Path .git) {
    Remove-Item -Recurse -Force .git
    Write-Host "✅ Old Git repository removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No existing Git repository found" -ForegroundColor Gray
}

# Step 2: Initialize new Git repository
Write-Host ""
Write-Host "🎬 Step 2: Initializing new Git repository..." -ForegroundColor Yellow
git init
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to initialize Git repository" -ForegroundColor Red
    exit 1
}

# Step 3: Configure Git user
Write-Host ""
Write-Host "👤 Step 3: Configuring Git user..." -ForegroundColor Yellow
git config user.name "$userName"
git config user.email "$userEmail"
Write-Host "✅ Git user configured" -ForegroundColor Green
Write-Host "   Name: $userName" -ForegroundColor Gray
Write-Host "   Email: $userEmail" -ForegroundColor Gray

# Step 4: Copy .gitignore
Write-Host ""
Write-Host "📋 Step 4: Setting up .gitignore..." -ForegroundColor Yellow
$gitignoreSource = "C:\Users\georg\GolandProjects\optimusddc\.gitignore"
if (-not (Test-Path .gitignore)) {
    Write-Host "⚠️  No .gitignore found. Please create one before proceeding." -ForegroundColor Yellow
    Write-Host "   Download from: /mnt/user-data/outputs/GITHUB_SETUP/.gitignore" -ForegroundColor Gray
    $response = Read-Host "Continue without .gitignore? (y/N)"
    if ($response -ne "y") {
        Write-Host "❌ Aborted. Please add .gitignore and run again." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ .gitignore found" -ForegroundColor Green
}

# Step 5: Add all files
Write-Host ""
Write-Host "📦 Step 5: Adding all files..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -eq 0) {
    $fileCount = (git diff --cached --numstat | Measure-Object).Count
    Write-Host "✅ Files staged: $fileCount" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to add files" -ForegroundColor Red
    exit 1
}

# Step 6: Create initial commit
Write-Host ""
Write-Host "💾 Step 6: Creating initial commit..." -ForegroundColor Yellow
$commitMessage = @"
Initial commit: OptimusDDC - Decentralized Data Catalog

- Amundsen fork with OptimusDB integration
- Query Workbench (SQL + CRUD)
- Log Analytics Dashboard with real-time aggregation
- Network Topology P2P visualization
- Operations Dashboard for cluster monitoring
- Complete frontend (React/TypeScript) and backend (Python/Flask)
- Docker Compose deployment configuration
- Comprehensive README and documentation
"@

git commit -m $commitMessage
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Initial commit created" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create commit" -ForegroundColor Red
    exit 1
}

# Step 7: Add remote
Write-Host ""
Write-Host "🔗 Step 7: Adding GitHub remote..." -ForegroundColor Yellow
git remote add origin $repoUrl
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Remote added: $repoUrl" -ForegroundColor Green
} else {
    # Remote might already exist, try to set URL
    git remote set-url origin $repoUrl
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Remote URL updated: $repoUrl" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to add remote" -ForegroundColor Red
        exit 1
    }
}

# Step 8: Rename branch to main
Write-Host ""
Write-Host "🌿 Step 8: Setting main branch..." -ForegroundColor Yellow
git branch -M main
Write-Host "✅ Branch renamed to 'main'" -ForegroundColor Green

# Step 9: Push to GitHub
Write-Host ""
Write-Host "🚀 Step 9: Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "⚠️  You may be prompted for credentials." -ForegroundColor Yellow
Write-Host "   Use your Personal Access Token as password" -ForegroundColor Gray
Write-Host ""

git push -u origin main --force
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to push to GitHub" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Authentication failed - Use Personal Access Token" -ForegroundColor Gray
    Write-Host "2. Network issues - Check internet connection" -ForegroundColor Gray
    Write-Host "3. Repository doesn't exist - Create it on GitHub first" -ForegroundColor Gray
    exit 1
}

# Step 10: Verify
Write-Host ""
Write-Host "✅ Step 10: Verification..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Remote:" -ForegroundColor Cyan
git remote -v
Write-Host ""
Write-Host "Branch:" -ForegroundColor Cyan
git branch -a
Write-Host ""
Write-Host "Status:" -ForegroundColor Cyan
git status

# Success message
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ SUCCESS! Repository pushed to GitHub" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 View your repository at:" -ForegroundColor Cyan
Write-Host "   $repoUrl" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Add comprehensive README.md" -ForegroundColor Gray
Write-Host "2. Add LICENSE file" -ForegroundColor Gray
Write-Host "3. Configure repository settings on GitHub" -ForegroundColor Gray
Write-Host "4. Add topics/tags for discoverability" -ForegroundColor Gray
Write-Host ""
Write-Host "🎓 For CENTERIS 2025, reference:" -ForegroundColor Yellow
Write-Host "   https://github.com/georgeGeorgakakos/optimusddc" -ForegroundColor White
Write-Host ""