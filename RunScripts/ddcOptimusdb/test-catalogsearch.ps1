# test-catalogsearch-complete.ps1
# Complete test suite for OptimusDDC CatalogSearch service

$baseUrl = "http://localhost:5013"

Write-Host "🔍 Complete CatalogSearch Test Suite" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Test 1: Healthcheck
Write-Host "`n✅ Test 1: Healthcheck" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/healthcheck" -Method Get
    Write-Host "Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Unified Search (POST /v2/search) - PRIMARY TEST
Write-Host "`n✅ Test 2: Unified Search (POST /v2/search)" -ForegroundColor Yellow
try {
    $searchBody = @{
        query_term = "*"
        page_index = 0
        results_per_page = 10
        resource_types = @("table")
        filters = @()
        highlight_options = @{}
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    $result = Invoke-RestMethod -Uri "$baseUrl/v2/search" -Method Post -Body $searchBody -Headers $headers
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Message: $($result.msg)" -ForegroundColor Green
    Write-Host "Page Index: $($result.page_index)" -ForegroundColor Green
    Write-Host "Results per page: $($result.results_per_page)" -ForegroundColor Green

    if ($result.results.table) {
        Write-Host "Table results: $($result.results.table.total_results)" -ForegroundColor Green

        # Show first 3 results
        if ($result.results.table.results.Count -gt 0) {
            Write-Host "`nFirst 3 Results:" -ForegroundColor Cyan
            $result.results.table.results | Select-Object -First 3 | ForEach-Object {
                Write-Host "  - $($_.name) [$($_.schema)]" -ForegroundColor White
            }
        }
    }

} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Test 3: Search for 'solar'
Write-Host "`n✅ Test 3: Search for 'solar'" -ForegroundColor Yellow
try {
    $searchBody = @{
        query_term = "solar"
        page_index = 0
        results_per_page = 10
        resource_types = @("table")
        filters = @()
        highlight_options = @{}
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    $result = Invoke-RestMethod -Uri "$baseUrl/v2/search" -Method Post -Body $searchBody -Headers $headers
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    if ($result.results.table -and $result.results.table.results.Count -gt 0) {
        Write-Host "Found $($result.results.table.total_results) results" -ForegroundColor Green
        Write-Host "First result: $($result.results.table.results[0].name)" -ForegroundColor Green
        Write-Host "Description: $($result.results.table.results[0].description)" -ForegroundColor Gray
    } else {
        Write-Host "No results found for 'solar'" -ForegroundColor Yellow
    }

} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Multi-resource search
Write-Host "`n✅ Test 4: Multi-Resource Search (table + user + dashboard)" -ForegroundColor Yellow
try {
    $searchBody = @{
        query_term = "*"
        page_index = 0
        results_per_page = 10
        resource_types = @("table", "user", "dashboard")
        filters = @()
        highlight_options = @{}
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    $result = Invoke-RestMethod -Uri "$baseUrl/v2/search" -Method Post -Body $searchBody -Headers $headers
    Write-Host "✅ SUCCESS!" -ForegroundColor Green

    if ($result.results.table) {
        Write-Host "Tables: $($result.results.table.total_results)" -ForegroundColor Cyan
    }
    if ($result.results.user) {
        Write-Host "Users: $($result.results.user.total_results)" -ForegroundColor Cyan
    }
    if ($result.results.dashboard) {
        Write-Host "Dashboards: $($result.results.dashboard.total_results)" -ForegroundColor Cyan
    }

} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Search with pagination
Write-Host "`n✅ Test 5: Pagination Test (Page 0 vs Page 1)" -ForegroundColor Yellow
try {
    $searchBody = @{
        query_term = "*"
        page_index = 1
        results_per_page = 5
        resource_types = @("table")
        filters = @()
        highlight_options = @{}
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
    }

    $result = Invoke-RestMethod -Uri "$baseUrl/v2/search" -Method Post -Body $searchBody -Headers $headers
    Write-Host "✅ Page 1 retrieved successfully!" -ForegroundColor Green
    Write-Host "Page Index: $($result.page_index)" -ForegroundColor Green
    Write-Host "Results per page: $($result.results_per_page)" -ForegroundColor Green

} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Testing Complete!" -ForegroundColor Cyan
Write-Host "`n📌 Summary:" -ForegroundColor Yellow
Write-Host "- Use POST /v2/search for all search operations" -ForegroundColor Gray
Write-Host "- Supports multiple resource types: table, user, dashboard, feature" -ForegroundColor Gray
Write-Host "- Includes pagination support" -ForegroundColor Gray
Write-Host "- Filters and highlight options available" -ForegroundColor Gray