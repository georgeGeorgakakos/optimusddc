<#
.SYNOPSIS
    Quick Start - Deploy ddC (Energy Edition)
#>

Write-Host "Starting ddC stack (Energy Edition)..." -ForegroundColor Cyan

if (-not (Test-Path ".\optimusdb_proxy_complete.py")) {
    Write-Host ""
    Write-Host "ERROR: optimusdb_proxy_complete.py not found!" -ForegroundColor Red
    Write-Host "Please copy the proxy file to this directory first:" -ForegroundColor Yellow
    Write-Host "  Copy-Item path\to\optimusdb_proxy_complete.py ." -ForegroundColor White
    Write-Host ""
    exit 1
}

docker-compose up -d

Write-Host ""
Write-Host "Waiting for services to start (90 seconds)..." -ForegroundColor Yellow
Write-Host "(Elasticsearch takes time to initialize)"

for ($i = 90; $i -gt 0; $i--) {
    Write-Host "  $i seconds remaining...  " -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host ""

.\Verify-Installation.ps1

Write-Host "Opening ddC in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5015"
