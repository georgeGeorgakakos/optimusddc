# Quick Start - Deploy ddC (Energy Edition)

Write-Host "Starting ddC stack..." -ForegroundColor Cyan

if (-not (Test-Path ".\optimusdb_proxy_complete.py")) {
    Write-Host ""
    Write-Host "ERROR: optimusdb_proxy_complete.py not found!" -ForegroundColor Red
    Write-Host "Copy the proxy file first:" -ForegroundColor Yellow
    Write-Host "  Copy-Item path\to\optimusdb_proxy_complete.py ." -ForegroundColor White
    Write-Host ""
    exit 1
}

docker-compose up -d

Write-Host ""
Write-Host "Waiting for services (90 seconds)..." -ForegroundColor Yellow
for ($i = 90; $i -gt 0; $i--) {
    Write-Host "`r  $i seconds...  " -NoNewline
    Start-Sleep -Seconds 1
}
Write-Host ""

.\Verify-Installation.ps1

Write-Host "Opening ddC..." -ForegroundColor Cyan
Start-Process "http://localhost:5015"
