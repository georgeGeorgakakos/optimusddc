# =============================================
# 🌀 OptimusDDC Full Rebuild Script (Windows PowerShell)
# Author: George Georgakakos
# Date: 2025-10-20 (revised)
# =============================================

Write-Host "🚀 Starting full rebuild of OptimusDDC stack..." -ForegroundColor Cyan

# Always resolve docker-compose file relative to this script
$scriptRoot  = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $scriptRoot "..\Dockerfile.yml"

Write-Host "📄 Using compose file: $composeFile" -ForegroundColor DarkGray

# Step 1️⃣ Stop and remove existing containers, volumes & networks
Write-Host "🧹 Stopping and removing old containers, networks, and volumes..." -ForegroundColor Yellow
docker-compose -f $composeFile down --volumes --remove-orphans

# Step 2️⃣ Prune old images and volumes
Write-Host "🧽 Cleaning dangling images and volumes..." -ForegroundColor Yellow
docker image prune -af
docker volume prune -f

# Step 3️⃣ Rebuild all services with no cache
Write-Host "⚙️ Rebuilding all services (this may take a few minutes)..." -ForegroundColor Yellow
docker-compose -f $composeFile build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Docker build failed. Aborting rebuild script." -ForegroundColor Red
    exit 1
}

# Step 4️⃣ Start containers
Write-Host "🚀 Starting fresh containers..." -ForegroundColor Green
docker-compose -f $composeFile up -d --force-recreate
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ docker-compose up failed. Aborting rebuild script." -ForegroundColor Red
    exit 1
}

# Step 5️⃣ Wait for startup
Write-Host "⏳ Waiting 25 seconds for containers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 25

# Step 6️⃣ Show container status
Write-Host "`n📦 Current containers:" -ForegroundColor Cyan
docker ps

# Step 7️⃣ Healthcheck for Metadata and OptimusDB
Write-Host "`n🔍 Testing catalogmetadata health endpoint..." -ForegroundColor Yellow
$metaHealthy = $false
try {
    $metaResponse = Invoke-WebRequest -Uri "http://localhost:5014/healthcheck" -UseBasicParsing
    Write-Host "✅ Metadata Service Healthcheck OK:" -ForegroundColor Green
    Write-Host $metaResponse.Content
    $metaHealthy = $true
} catch {
    Write-Host "❌ Metadata Service healthcheck failed!" -ForegroundColor Red
}

Write-Host "`n🔍 Testing OptimusDB peer endpoint..." -ForegroundColor Yellow
try {
    $optResponse = Invoke-WebRequest -Uri "http://localhost:18001/swarmkb/peers" -UseBasicParsing
    Write-Host "✅ OptimusDB Peer API OK:" -ForegroundColor Green
    Write-Host $optResponse.Content.Substring(0, [Math]::Min(500, $optResponse.Content.Length)) + "..."
} catch {
    Write-Host "❌ OptimusDB Peer API test failed!" -ForegroundColor Red
}

# Step 8️⃣ Validate Amundsen <-> OptimusDB Integration
Write-Host "`n🔗 Testing OptimusDB integration via popular_resources..." -ForegroundColor Yellow
try {
    $popularResponse = Invoke-WebRequest -Uri "http://localhost:5014/popular_resources/test_user_id?limit=4&types=table" -UseBasicParsing
    Write-Host "✅ Popular Resources API OK:" -ForegroundColor Green
    Write-Host $popularResponse.Content.Substring(0, [Math]::Min(1000, $popularResponse.Content.Length)) + "..."
} catch {
    Write-Host "❌ Popular Resources API test failed!" -ForegroundColor Red
    Write-Host "   Check catalogmetadata logs for details." -ForegroundColor DarkGray
}

# Step 9️⃣ Display recent logs for metadata service (if it exists)
Write-Host "`n📜 Showing last 20 lines of catalogmetadata logs..." -ForegroundColor Yellow
try {
    docker logs catalogmetadata --tail 20
} catch {
    Write-Host "⚠️ Unable to fetch logs: container 'catalogmetadata' not found." -ForegroundColor DarkYellow
}

# Step 🔟 Final message
if ($metaHealthy) {
    Write-Host "`n🎉 Rebuild completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Rebuild finished, but metadata healthcheck failed. Check logs above." -ForegroundColor Yellow
}

Write-Host "Open the Amundsen UI at: http://localhost:5015" -ForegroundColor Cyan
Write-Host "Try searching for: swarmkb_peers" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor DarkGray
