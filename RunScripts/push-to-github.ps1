# ============================================
# Git Push Script - OptimusDB Amundsen Frontend
# ============================================

# Define the expected project directory
$EXPECTED_DIR = "C:\Users\georg\GolandProjects\optimusddc"

Write-Host "🚀 OptimusDB Frontend - Git Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check current directory
$currentDir = Get-Location
Write-Host "📁 Current directory: $currentDir" -ForegroundColor Yellow

# Validate we're in the correct directory
if ($currentDir.Path -ne $EXPECTED_DIR) {
    Write-Host "⚠️  You are not in the OptimusDDC project directory!" -ForegroundColor Yellow
    Write-Host "   Expected: $EXPECTED_DIR" -ForegroundColor White
    Write-Host "   Current:  $currentDir" -ForegroundColor White
    Write-Host ""

    $changeDir = Read-Host "Do you want to change to the correct directory? (y/n)"
    if ($changeDir -eq "y") {
        if (Test-Path $EXPECTED_DIR) {
            Set-Location $EXPECTED_DIR
            Write-Host "✅ Changed to: $EXPECTED_DIR" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Host "❌ Directory does not exist: $EXPECTED_DIR" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Aborted. Please run this script from: $EXPECTED_DIR" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Running from correct directory: $EXPECTED_DIR" -ForegroundColor Green
Write-Host ""

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "❌ Not a git repository. Run 'git init' first." -ForegroundColor Red
    exit 1
}

# Show current branch
$currentBranch = git branch --show-current
Write-Host "📍 Current branch: $currentBranch" -ForegroundColor Yellow
Write-Host ""

# Show status
Write-Host "📊 Git Status:" -ForegroundColor Cyan
git status --short
Write-Host ""

# Ask for confirmation
$confirm = Read-Host "Do you want to stage all changes? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ Aborted by user" -ForegroundColor Red
    exit 0
}

# Stage all changes
Write-Host "📦 Staging all changes..." -ForegroundColor Cyan
git add .

# Show what will be committed
Write-Host ""
Write-Host "📋 Files to be committed:" -ForegroundColor Cyan
git diff --cached --name-status
Write-Host ""

# Ask for commit message
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "feat: Add OptimusDB cluster health widget and homepage customizations

- Implemented ClusterHealthWidget with real-time cluster status
- Added circular progress ring for node health visualization
- Integrated OptimusDB API endpoint (http://localhost:18001/swarmkb/agent/status)
- Fixed homepage layout for side-by-side widget display
- Redesigned widget with modern CX-focused UI
- Added RenewableEnergyWidget (placeholder)
- Updated NavBar with home icon
- Fixed TypeScript compilation issues"
}

# Commit changes
Write-Host ""
Write-Host "💾 Committing changes..." -ForegroundColor Cyan
git commit -m "$commitMessage"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed" -ForegroundColor Red
    exit 1
}

# Ask for push confirmation
Write-Host ""
$pushConfirm = Read-Host "Push to remote repository? (y/n)"
if ($pushConfirm -ne "y") {
    Write-Host "✅ Committed locally. Run 'git push' manually when ready." -ForegroundColor Green
    exit 0
}

# Check if remote exists
$remotes = git remote
if ([string]::IsNullOrWhiteSpace($remotes)) {
    Write-Host "⚠️  No remote repository configured" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To add a remote repository, run:" -ForegroundColor Cyan
    Write-Host "git remote add origin https://github.com/YOUR_USERNAME/optimusddc.git" -ForegroundColor White
    exit 0
}

# Push to remote
Write-Host ""
Write-Host "🚀 Pushing to remote..." -ForegroundColor Cyan
git push origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "🎉 All changes are now on remote repository" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Push failed. Check your remote configuration and credentials." -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to set upstream:" -ForegroundColor Yellow
    Write-Host "git push --set-upstream origin $currentBranch" -ForegroundColor White
}