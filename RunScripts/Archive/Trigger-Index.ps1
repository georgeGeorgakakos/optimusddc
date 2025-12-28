# Trigger-Index.ps1
# This calls the Amundsen search service to index from metadata

Write-Host "Triggering Elasticsearch indexing..." -ForegroundColor Cyan

# Option 1: Use the search service API (if available)
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5013/healthcheck" -TimeoutSec 5
    Write-Host "Search service is running" -ForegroundColor Green
} catch {
    Write-Host "Search service not responding" -ForegroundColor Red
}

# Option 2: Direct Elasticsearch bulk index from OptimusDB
$datasets = @()
$payload = @{
    method = @{ argcnt = 2; cmd = "sqldml" }
    args = @("d1", "d2")
    dstype = "dsswres"
    sqldml = "SELECT _id, name, description, metadata_type, component, tags FROM datacatalog"
    graph_traversal = @(@{})
    criteria = @()
} | ConvertTo-Json -Depth 6

$response = Invoke-RestMethod -Method Post -Uri "http://localhost:18001/swarmkb/command" -ContentType "application/json" -Body $payload
$datasets = $response.data.records

Write-Host "Found $($datasets.Count) datasets to index" -ForegroundColor Yellow

foreach ($ds in $datasets) {
    $doc = @{
        name = $ds.name
        description = $ds.description
        schema = $ds.metadata_type
        database = $ds.component
        tags = ($ds.tags -split ",")
        key = "$($ds.component)://$($ds.metadata_type)/$($ds.name)"
    } | ConvertTo-Json -Compress

    $indexUrl = "http://localhost:9200/table_search_index/_doc/$($ds._id)"

    try {
        Invoke-RestMethod -Method Put -Uri $indexUrl -ContentType "application/json" -Body $doc
        Write-Host "  Indexed: $($ds.name)" -ForegroundColor Green
    } catch {
        Write-Host "  Failed: $($ds.name)" -ForegroundColor Red
    }
}

Write-Host "`nDone! Try searching again." -ForegroundColor Cyan