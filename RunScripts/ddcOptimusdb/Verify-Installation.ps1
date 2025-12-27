# ddC Verification Script (Energy Edition)
param([int]$OptimusDBPort = 18001)

$CommandUrl = "http://localhost:$OptimusDBPort/swarmkb/command"

function Invoke-SQL {
    param([string]$Query)
    $payload = @{
        method = @{ argcnt = 2; cmd = "sqldml" }
        args = @("d1", "d2")
        dstype = "dsswres"
        sqldml = $Query
        graph_traversal = @(@{})
        criteria = @()
    } | ConvertTo-Json -Depth 6

    try {
        $response = Invoke-RestMethod -Method Post -Uri $CommandUrl -ContentType "application/json" -Body $payload -TimeoutSec 10
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

Write-Host ""
Write-Host "ddC Verification (Energy Edition)" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test OptimusDB
Write-Host "1. Testing OptimusDB (port $OptimusDBPort)..." -NoNewline
$test1 = Invoke-SQL -Query "SELECT COUNT(*) as cnt FROM datacatalog"
if ($test1.Success -and $test1.Data.data.records) {
    $count = $test1.Data.data.records[0].cnt
    Write-Host " OK ($count datasets)" -ForegroundColor Green
} else {
    Write-Host " FAILED" -ForegroundColor Red
}

# List datasets by schema (metadata_type)
Write-Host ""
Write-Host "2. Energy datasets by category:"
$test2 = Invoke-SQL -Query "SELECT metadata_type, COUNT(*) as cnt FROM datacatalog WHERE metadata_type LIKE '%solar%' OR metadata_type LIKE '%wind%' OR metadata_type LIKE '%hydro%' OR metadata_type LIKE '%portfolio%' OR metadata_type LIKE '%grid%' OR metadata_type LIKE '%reference%' GROUP BY metadata_type ORDER BY metadata_type"
if ($test2.Success -and $test2.Data.data.records) {
    foreach ($rec in $test2.Data.data.records) {
        $icon = if ($rec.metadata_type -like "*solar*") { "Sun" }
                elseif ($rec.metadata_type -like "*wind*") { "Air" }
                elseif ($rec.metadata_type -like "*hydro*") { "Wat" }
                else { "Oth" }
        Write-Host "   [$icon] $($rec.metadata_type): $($rec.cnt)" -ForegroundColor White
    }
} else {
    Write-Host "   Could not retrieve" -ForegroundColor Yellow
}

# List all datasets
Write-Host ""
Write-Host "3. All datasets:"
$test3 = Invoke-SQL -Query "SELECT name, metadata_type, status FROM datacatalog ORDER BY metadata_type, name"
if ($test3.Success -and $test3.Data.data.records) {
    foreach ($rec in $test3.Data.data.records) {
        $statusColor = if ($rec.status -eq "active") { "Green" } else { "Yellow" }
        Write-Host "   - $($rec.name) [$($rec.metadata_type)]" -ForegroundColor $statusColor
    }
} else {
    Write-Host "   Could not retrieve" -ForegroundColor Yellow
}

# Test Elasticsearch
Write-Host ""
Write-Host "4. Testing Elasticsearch (port 9200)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -TimeoutSec 5
    Write-Host " OK ($($response.status))" -ForegroundColor Green
} catch {
    Write-Host " FAILED (not running)" -ForegroundColor Yellow
}

# Test ddC Services
Write-Host "5. Testing Metadata Service (port 5014)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5014/healthcheck" -TimeoutSec 5
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED (not running)" -ForegroundColor Yellow
}

Write-Host "6. Testing Search Service (port 5013)..." -NoNewline
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5013/healthcheck" -TimeoutSec 5
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED (not running)" -ForegroundColor Yellow
}

Write-Host "7. Testing Frontend (port 5015)..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5015" -TimeoutSec 5 -UseBasicParsing
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED (not running)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "ddC UI: http://localhost:5015" -ForegroundColor Green
Write-Host ""
