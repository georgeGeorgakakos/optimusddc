# Quick check of line 244 in optimusdb_proxy.py
# This is THE critical line that's causing all the errors

$FILE = "../../metadata/metadata_service/proxy/optimusdb_proxy.py"

Write-Host ""
Write-Host "=== Checking Line 244 of optimusdb_proxy.py ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $FILE)) {
    Write-Host "❌ File not found: $FILE" -ForegroundColor Red
    exit 1
}

$lines = Get-Content $FILE
$line244 = $lines[243]  # 0-indexed

Write-Host "Current line 244:" -ForegroundColor Yellow
Write-Host "  $line244" -ForegroundColor White
Write-Host ""

if ($line244 -match "self\._parse_optimusdb_response\(response\)") {
    Write-Host "✅✅✅ CORRECT! This line uses the helper method." -ForegroundColor Green
    Write-Host "Your file is properly fixed!" -ForegroundColor Green
} elseif ($line244 -match "response\.json\(\)") {
    Write-Host "❌❌❌ WRONG! This line is using the OLD broken code." -ForegroundColor Red
    Write-Host ""
    Write-Host "This is causing all your errors:" -ForegroundColor Yellow
    Write-Host "  - 'str' object has no attribute 'get'" -ForegroundColor Gray
    Write-Host "  - No columns showing in Amundsen" -ForegroundColor Gray
    Write-Host "  - get_table() crashing" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You need to deploy the FIXED file!" -ForegroundColor Red
} else {
    Write-Host "? Unexpected content on line 244" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Expected correct line:" -ForegroundColor Cyan
Write-Host "  result = self._parse_optimusdb_response(response)" -ForegroundColor Green
Write-Host ""