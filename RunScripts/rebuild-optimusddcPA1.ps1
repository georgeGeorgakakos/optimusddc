# =============================================
# 🌀 OptimusDDC Full Rebuild Script (Windows PowerShell)
# Author: George Georgakakos
# Date: 2025-10-20 (updated with change tracking)
# =============================================

# Resolve paths
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot   = Resolve-Path (Join-Path $scriptRoot "..")
$composeFile = "../Dockerfile"

Write-Host "📂 Script root : $scriptRoot" -ForegroundColor DarkGray
Write-Host "📁 Repo root   : $repoRoot"   -ForegroundColor DarkGray
Write-Host "🧾 Compose file: $composeFile" -ForegroundColor DarkGray

Write-Host "`n🚀 Starting full rebuild of OptimusDDC stack..." -ForegroundColor Cyan

# =============================================
# Step 0️⃣: Detect and log changed files/folders
# =============================================

Write-Host "`n📝 Checking for local changes (git status)..." -ForegroundColor Yellow

# Prepare log directory & file
$logDir = Join-Path $repoRoot "RebuildLogs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile   = Join-Path $logDir "rebuild-$timestamp.log"

"Rebuild timestamp: $(Get-Date)" | Out-File $logFile
"Repo root: $repoRoot"           | Out-File $logFile -Append
"Compose file: $composeFile"     | Out-File $logFile -Append
""                               | Out-File $logFile -Append
"=== GIT STATUS (PORCELAIN) ===" | Out-File $logFile -Append

try {
    $gitStatus = git -C $repoRoot status --porcelain 2>$null

    if ([string]::IsNullOrWhiteSpace($gitStatus)) {
        Write-Host "ℹ️ No uncommitted changes detected (working tree clean)." -ForegroundColor Green
        "Working tree clean (no uncommitted changes)." | Out-File $logFile -Append
    }
    else {
        Write-Host "⚠️ Uncommitted changes detected:" -ForegroundColor Yellow

        $gitStatusLines = $gitStatus -split "`n"
        foreach ($line in $gitStatusLines) {
            Write-Host "   $line"
            $line | Out-File $logFile -Append
        }

        # Derive changed directories
        $changedPaths = $gitStatusLines | ForEach-Object {
            if ($_.Length -gt 3) { $_.Substring(3) } else { $null }
        } | Where-Object { $_ }

        $changedDirs = $changedPaths |
                ForEach-Object { Split-Path $_ -Parent } |
                Where-Object { $_ -ne "" } |
                Sort-Object -Unique

        Write-Host "`n📂 Changed directories:" -ForegroundColor Cyan
        if ($changedDirs.Count -eq 0) {
            Write-Host "   (Only root-level files changed)" -ForegroundColor DarkGray
        }
        else {
            foreach ($dir in $changedDirs) {
                Write-Host "   - $dir" -ForegroundColor Cyan
            }
        }

        ""                                  | Out-File $logFile -Append
        "=== CHANGED DIRECTORIES ==="       | Out-File $logFile -Append
        if ($changedDirs.Count -eq 0) {
            "(Only root-level files changed)" | Out-File $logFile -Append
        }
        else {
            $changedDirs | Out-File $logFile -Append
        }
    }
}
catch {
    Write-Host "⚠️ Could not run 'git status' (git not installed or not a repo)." -ForegroundColor DarkYellow
    "git status not available." | Out-File $logFile -Append
}

# =============================================
# Step 1️⃣ Stop and remove existing containers, volumes & networks
# =============================================

Write-Host "`n🧹 Stopping and removing old containers, networks, and volumes..." -ForegroundColor Yellow
docker-compose -f $composeFile down --volumes --remove-orphans | Tee-Object -FilePath $logFile -Append

# =============================================
# Step 2️⃣ Prune old images and volumes
# =============================================

Write-Host "`n🧽 Cleaning dangling images and volumes..." -ForegroundColor Yellow
"=== DOCKER IMAGE PRUNE ===" | Out-File $logFile -Append
docker image prune -af | Tee-Object -FilePath $logFile -Append

"=== DOCKER VOLUME PRUNE ===" | Out-File $logFile -Append
docker volume prune -f | Tee-Object -FilePath $logFile -Append

# =============================================
# Step 3️⃣ Rebuild all services with no cache
# =============================================

Write-Host "`n⚙️ Rebuilding all services (no cache)..." -ForegroundColor Yellow
"=== DOCKER COMPOSE BUILD --NO-CACHE ===" | Out-File $logFile -Append
docker-compose -f $composeFile build --no-cache | Tee-Object -FilePath $logFile -Append

# =============================================
# Step 4️⃣ Start containers
# =============================================

Write-Host "`n🚀 Starting fresh containers..." -ForegroundColor Green
"=== DOCKER COMPOSE UP -D ===" | Out-File $logFile -Append
docker-compose -f $composeFile up -d --force-recreate | Tee-Object -FilePath $logFile -Append

# =============================================
# Step 5️⃣ Wait for startup
# =============================================

Write-Host "`n⏳ Waiting 25 seconds for containers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 25

# =============================================
# Step 6️⃣ Show container status
# =============================================

Write-Host "`n📦 Current containers:" -ForegroundColor Cyan
"=== DOCKER PS ===" | Out-File $logFile -Append
docker ps | Tee-Object -FilePath $logFile -Append

# =============================================
# Step 7️⃣ Healthcheck for Metadata and OptimusDB
# =============================================

Write-Host "`n🔍 Testing catalogmetadata health endpoint..." -ForegroundColor Yellow
"=== METADATA HEALTHCHECK ===" | Out-File $logFile -Append
try {
    $metaResponse = Invoke-WebRequest -Uri "http://localhost:5014/healthcheck" -UseBasicParsing
    Write-Host "✅ Metadata Service Healthcheck OK:" -ForegroundColor Green
    Write-Host $metaResponse.Content
    $metaResponse.Content | Out-File $logFile -Append
} catch {
    Write-Host "❌ Metadata Service healthcheck failed!" -ForegroundColor Red
    "Metadata healthcheck FAILED: $($_.Exception.Message)" | Out-File $logFile -Append
}

Write-Host "`n🔍 Testing OptimusDB peer endpoint..." -ForegroundColor Yellow
"=== OPTIMUSDB PEERS CHECK ===" | Out-File $logFile -Append
try {
    $optResponse = Invoke-WebRequest -Uri "http://localhost:18001/swarmkb/peers" -UseBasicParsing
    Write-Host "✅ OptimusDB Peer API OK:" -ForegroundColor Green
    $preview = $optResponse.Content.Substring(0, [Math]::Min(500, $optResponse.Content.Length)) + "..."
    Write-Host $preview
    $preview | Out-File $logFile -Append
} catch {
    Write-Host "❌ OptimusDB Peer API test failed!" -ForegroundColor Red
    "OptimusDB peers check FAILED: $($_.Exception.Message)" | Out-File $logFile -Append
}

# =============================================
# Step 8️⃣ Validate Amundsen <-> OptimusDB Integration
# =============================================

Write-Host "`n🔗 Testing OptimusDB integration via popular_resources..." -ForegroundColor Yellow
"=== POPULAR RESOURCES CHECK ===" | Out-File $logFile -Append
try {
    $popularResponse = Invoke-WebRequest -Uri "http://localhost:5014/popular_resources/test_user_id?limit=4&types=table" -UseBasicParsing
    Write-Host "✅ Popular Resources API OK:" -ForegroundColor Green
    $popPreview = $popularResponse.Content.Substring(0, [Math]::Min(1000, $popularResponse.Content.Length)) + "..."
    Write-Host $popPreview
    $popPreview | Out-File $logFile -Append
} catch {
    Write-Host "❌ Popular Resources API test failed!" -ForegroundColor Red
    Write-Host "   Check catalogmetadata logs for details." -ForegroundColor DarkGray
    "Popular resources check FAILED: $($_.Exception.Message)" | Out-File $logFile -Append
}

# =============================================
# Step 9️⃣ Display recent logs for metadata service
# =============================================

Write-Host "`n📜 Showing last 20 lines of catalogmetadata logs..." -ForegroundColor Yellow
"=== DOCKER LOGS: catalogmetadata (tail 20) ===" | Out-File $logFile -Append
docker logs catalogmetadata --tail 20 | Tee-Object -FilePath $logFile -Append

# =============================================
# Step 🔟 Final message
# =============================================

Write-Host "`n🎉 Rebuild completed!"
Write-Host "📄 Rebuild log saved to: $logFile" -ForegroundColor DarkGray
Write-Host "Open the Amundsen UI at: http://localhost:5015" -ForegroundColor Cyan
Write-Host "Try searching for: swarmkb_peers" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor DarkGray
