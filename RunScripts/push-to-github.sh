#!/bin/bash

# ============================================
# Git Push Script - OptimusDB Amundsen Frontend
# ============================================

echo -e "\033[1;36m🚀 OptimusDB Frontend - Git Push Script\033[0m"
echo -e "\033[1;36m========================================\033[0m"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "\033[1;31m❌ Git is not installed\033[0m"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo -e "\033[1;31m❌ Not a git repository. Run 'git init' first.\033[0m"
    exit 1
fi

# Show current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "\033[1;33m📍 Current branch: $CURRENT_BRANCH\033[0m"
echo ""

# Show status
echo -e "\033[1;36m📊 Git Status:\033[0m"
git status --short
echo ""

# Ask for confirmation
read -p "Do you want to stage all changes? (y/n) " confirm
if [ "$confirm" != "y" ]; then
    echo -e "\033[1;31m❌ Aborted by user\033[0m"
    exit 0
fi

# Stage all changes
echo -e "\033[1;36m📦 Staging all changes...\033[0m"
git add .

# Show what will be committed
echo ""
echo -e "\033[1;36m📋 Files to be committed:\033[0m"
git diff --cached --name-status
echo ""

# Ask for commit message
read -p "Enter commit message (or press Enter for default): " commit_message
if [ -z "$commit_message" ]; then
    commit_message="feat: Add OptimusDB cluster health widget and homepage customizations

- Implemented ClusterHealthWidget with real-time cluster status
- Added circular progress ring for node health visualization
- Integrated OptimusDB API endpoint (http://localhost:18001/swarmkb/agent/status)
- Fixed homepage layout for side-by-side widget display
- Redesigned widget with modern CX-focused UI
- Added RenewableEnergyWidget (placeholder)
- Updated NavBar with home icon
- Fixed TypeScript compilation issues"
fi

# Commit changes
echo ""
echo -e "\033[1;36m💾 Committing changes...\033[0m"
git commit -m "$commit_message"

if [ $? -ne 0 ]; then
    echo -e "\033[1;31m❌ Commit failed\033[0m"
    exit 1
fi

# Ask for push confirmation
echo ""
read -p "Push to remote repository? (y/n) " push_confirm
if [ "$push_confirm" != "y" ]; then
    echo -e "\033[1;32m✅ Committed locally. Run 'git push' manually when ready.\033[0m"
    exit 0
fi

# Check if remote exists
REMOTES=$(git remote)
if [ -z "$REMOTES" ]; then
    echo -e "\033[1;33m⚠️  No remote repository configured\033[0m"
    echo ""
    echo -e "\033[1;36mTo add a remote repository, run:\033[0m"
    echo -e "\033[0;37mgit remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git\033[0m"
    exit 0
fi

# Push to remote
echo ""
echo -e "\033[1;36m🚀 Pushing to remote...\033[0m"
git push origin $CURRENT_BRANCH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "\033[1;32m✅ Successfully pushed to GitHub!\033[0m"
    echo -e "\033[1;32m🎉 All changes are now on remote repository\033[0m"
else
    echo ""
    echo -e "\033[1;31m❌ Push failed. Check your remote configuration and credentials.\033[0m"
    echo ""
    echo -e "\033[1;33mYou may need to set upstream:\033[0m"
    echo -e "\033[0;37mgit push --set-upstream origin $CURRENT_BRANCH\033[0m"
fi