<#
.SYNOPSIS
    Stop ddC Services
#>

Write-Host "Stopping ddC stack..." -ForegroundColor Yellow
docker-compose down
Write-Host "ddC services stopped." -ForegroundColor Green
