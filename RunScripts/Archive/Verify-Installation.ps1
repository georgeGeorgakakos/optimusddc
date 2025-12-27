<#
.SYNOPSIS
    Verify ddC Installation (Energy Edition)
#>
param([int]$OptimusDBPort = 18001)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ddC Verification (Energy Edition)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test OptimusDB
Write-Host "1. Testing OptimusDB (port $OptimusDBPort)..." -NoNewline
try {
    $payload = '{"method":{"argcnt":2,"cmd":"sqldml"},"args":["d1","d2"],"dstype":"dsswres","sqldml":"SELECT COUNT(*) as cnt FROM datacatalog;","graph_traversal":[{}],"criteria":[]}'
    $response = Invoke-RestMethod -Uri "http://localhost:$OptimusDBPort/swarmkb/command" -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 5
    $count = $response.data.records[0].cnt
    Write-Host " OK ($count datasets)" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
}

# Test Elasticsearch
Write-Host "2. Testing Elasticsearch (port 9200)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -TimeoutSec 5
    Write-Host " OK ($($response.status))" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
}

# Test Metadata Service
Write-Host "3. Testing Metadata Service (port 5014)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5014/healthcheck" -TimeoutSec 5
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
}

# Test Search Service
Write-Host "4. Testing Search Service (port 5013)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5013/healthcheck" -TimeoutSec 5
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
}

# Test Frontend
Write-Host "5. Testing Frontend (port 5015)..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5015" -TimeoutSec 5 -UseBasicParsing
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "Energy Datasets:" -ForegroundColor Yellow
Write-Host "  Solar: generation, irradiance, panels, forecasts"
Write-Host "  Wind:  generation, turbines, conditions, forecasts, maintenance"
Write-Host "  Hydro: generation, reservoir, dam safety, inflow, environmental"
Write-Host ""
Write-Host "ddC UI: http://localhost:5015" -ForegroundColor Green
Write-Host ""
