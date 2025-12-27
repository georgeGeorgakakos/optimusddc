# Quick Dataset Count Script - PowerShell Version
# Shows total datasets in OptimusDB and Amundsen
#
# Usage: .\Count-Datasets.ps1 [-OptimusDbUrl "http://localhost:8089"]

param(
    [Parameter(Mandatory=$false)]
    [string]$OptimusDbUrl = "http://localhost:18001",

    [Parameter(Mandatory=$false)]
    [string]$AmundsenUrl = "http://localhost:5015"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "              Dataset Count Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Count in OptimusDB
Write-Host "📊 Counting in OptimusDB..." -ForegroundColor Blue

$payload = @{
    method = @{argcnt=2; cmd="sqldml"}
    args = @("dummy1", "dummy2")
    dstype = "dsswres"
    sqldml = "SELECT COUNT(*) as count FROM datacatalog;"
    graph_traversal = @(@{})
    criteria = @()
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$OptimusDbUrl/swarmkb/command" `
        -Method Post -ContentType "application/json" -Body $payload

    $optimusDbCount = $response.data.records[0].count
    Write-Host "   OptimusDB Total: " -NoNewline
    Write-Host "$optimusDbCount datasets" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Could not connect to OptimusDB" -ForegroundColor Yellow
    $optimusDbCount = 0
}

Write-Host ""

# Count in Amundsen
Write-Host "🔍 Counting in Amundsen Search..." -ForegroundColor Blue

try {
    $searchUrl = "$AmundsenUrl/api/search/v0/search?query=*&resource=table"
    $searchResponse = Invoke-RestMethod -Uri $searchUrl -Method Get

    $amundsenCount = $searchResponse.total_results
    Write-Host "   Amundsen Total: " -NoNewline
    Write-Host "$amundsenCount datasets" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Could not connect to Amundsen" -ForegroundColor Yellow
}

Write-Host ""

# Count by component
Write-Host "📁 Breakdown by Component:" -ForegroundColor Blue
Write-Host "   (OptimusDB datacatalog)"
Write-Host ""

$components = @(
    "Sales",
    "Customer",
    "Product",
    "Marketing",
    "Finance",
    "Operations",
    "Human Resources",
    "Data Science"
)

foreach ($component in $components) {
    $payload = @{
        method = @{argcnt=2; cmd="sqldml"}
        args = @("dummy1", "dummy2")
        dstype = "dsswres"
        sqldml = "SELECT COUNT(*) as count FROM datacatalog WHERE component='$component';"
        graph_traversal = @(@{})
        criteria = @()
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri "$OptimusDbUrl/swarmkb/command" `
            -Method Post -ContentType "application/json" -Body $payload

        $count = $response.data.records[0].count

        if ($count -gt 0) {
            Write-Host "   • " -NoNewline
            Write-Host ("{0,-20}" -f " $component : ") -NoNewline
            Write-Host ("{0,2} datasets" -f $count) -ForegroundColor Cyan
        }
    }
    catch {
        # Skip if error
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 To view in Amundsen UI:" -ForegroundColor Yellow
Write-Host "   1. Go to: $AmundsenUrl"
Write-Host "   2. Press Enter in search box (empty search)"
Write-Host "   3. Look for 'X results' at top of page"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan