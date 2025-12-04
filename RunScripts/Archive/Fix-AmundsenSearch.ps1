<#
.SYNOPSIS
    Diagnose and Fix Amundsen Search - Sync OptimusDB to Elasticsearch

.DESCRIPTION
    This script:
    1. Diagnoses why search isn't working
    2. Checks Elasticsearch connectivity and index status
    3. Properly indexes OptimusDB datacatalog into Elasticsearch
    4. Uses the correct document format expected by Amundsen Search

.NOTES
    Version: 2.0
    The key insight: Amundsen's "Popular Resources" comes from the metadata service
    (which queries OptimusDB), but "Search" comes from the search service
    (which queries Elasticsearch). We need to sync data to ES.

.EXAMPLE
    .\Fix-AmundsenSearch.ps1
#>

param(
    [int]$OptimusDBPort = 18001,
    [string]$ElasticsearchUrl = "http://localhost:9200",
    [string]$SearchServiceUrl = "http://localhost:5013",
    [switch]$Force
)

$ErrorActionPreference = "Continue"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Num, [string]$Text)
    Write-Host "[$Num] $Text" -ForegroundColor Yellow
}

function Write-OK {
    param([string]$Text)
    Write-Host "  [OK] $Text" -ForegroundColor Green
}

function Write-FAIL {
    param([string]$Text)
    Write-Host "  [FAIL] $Text" -ForegroundColor Red
}

function Write-INFO {
    param([string]$Text)
    Write-Host "  [INFO] $Text" -ForegroundColor Gray
}

function Invoke-OptimusDB {
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
        $response = Invoke-RestMethod -Method Post `
            -Uri "http://localhost:$OptimusDBPort/swarmkb/command" `
            -ContentType "application/json" `
            -Body $payload `
            -TimeoutSec 30
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# ============================================================================
# MAIN DIAGNOSTIC AND FIX
# ============================================================================

Clear-Host
Write-Header "Amundsen Search Diagnostic & Fix Tool"

Write-Host "Configuration:"
Write-Host "  OptimusDB:      http://localhost:$OptimusDBPort"
Write-Host "  Elasticsearch:  $ElasticsearchUrl"
Write-Host "  Search Service: $SearchServiceUrl"
Write-Host ""

# ----------------------------------------------------------------------------
# STEP 1: Diagnose Current State
# ----------------------------------------------------------------------------

Write-Step "1/7" "Diagnosing current state..."

# Check OptimusDB
Write-Host "  Checking OptimusDB... " -NoNewline
$odbResult = Invoke-OptimusDB -Query "SELECT COUNT(*) as cnt FROM datacatalog"
if ($odbResult.Success -and $odbResult.Data.data.records) {
    $odbCount = $odbResult.Data.data.records[0].cnt
    Write-Host "OK ($odbCount datasets)" -ForegroundColor Green
} else {
    Write-Host "FAILED" -ForegroundColor Red
    Write-FAIL "Cannot connect to OptimusDB"
    exit 1
}

# Check Elasticsearch
Write-Host "  Checking Elasticsearch... " -NoNewline
try {
    $esHealth = Invoke-RestMethod -Uri "$ElasticsearchUrl/_cluster/health" -TimeoutSec 5
    Write-Host "OK ($($esHealth.status))" -ForegroundColor Green
} catch {
    Write-Host "FAILED" -ForegroundColor Red
    Write-FAIL "Elasticsearch not reachable at $ElasticsearchUrl"
    exit 1
}

# Check Search Service
Write-Host "  Checking Search Service... " -NoNewline
try {
    $searchHealth = Invoke-RestMethod -Uri "$SearchServiceUrl/healthcheck" -TimeoutSec 5
    Write-Host "OK" -ForegroundColor Green
} catch {
    Write-Host "NOT RUNNING" -ForegroundColor Yellow
    Write-INFO "Search service not running - will index directly to Elasticsearch"
}

# ----------------------------------------------------------------------------
# STEP 2: Check Existing Elasticsearch Indices
# ----------------------------------------------------------------------------

Write-Step "2/7" "Checking Elasticsearch indices..."

try {
    $indices = Invoke-RestMethod -Uri "$ElasticsearchUrl/_cat/indices?format=json" -TimeoutSec 5

    Write-Host "  Current indices:"
    foreach ($idx in $indices) {
        $color = if ($idx.index -like "*table*" -or $idx.index -like "*search*") { "Yellow" } else { "Gray" }
        Write-Host "    - $($idx.index): $($idx.'docs.count') docs" -ForegroundColor $color
    }

    # Check for table_search_index specifically
    $tableIndex = $indices | Where-Object { $_.index -eq "table_search_index" }
    if ($tableIndex) {
        Write-OK "table_search_index exists with $($tableIndex.'docs.count') documents"
    } else {
        Write-INFO "table_search_index does not exist - will create"
    }
} catch {
    Write-INFO "Could not list indices: $_"
}

# ----------------------------------------------------------------------------
# STEP 3: Delete and Recreate Index
# ----------------------------------------------------------------------------

Write-Step "3/7" "Setting up Elasticsearch index..."

$indexName = "table_search_index"

# Delete existing index
Write-Host "  Deleting existing index... " -NoNewline
try {
    Invoke-RestMethod -Method Delete -Uri "$ElasticsearchUrl/$indexName" -ErrorAction SilentlyContinue | Out-Null
    Write-Host "OK" -ForegroundColor Green
} catch {
    Write-Host "OK (didn't exist)" -ForegroundColor Green
}

# Create index with proper mapping for Amundsen
Write-Host "  Creating index with Amundsen mapping... " -NoNewline

# This is the mapping that Amundsen Search expects
$indexMapping = @{
settings = @{
index = @{
number_of_shards = 1
number_of_replicas = 0
}
analysis = @{
analyzer = @{
default = @{
tokenizer = "standard"
filter = @("lowercase", "asciifolding")
}
}
}
}
mappings = @{
properties = @{
# Required by Amundsen
name = @{
type = "text"
analyzer = "default"
fields = @{
raw = @{ type = "keyword" }
}
}
key = @{ type = "keyword" }
description = @{
type = "text"
analyzer = "default"
}
schema = @{ type = "keyword" }
database = @{ type = "keyword" }
cluster = @{ type = "keyword" }

# For tag-based search
tags = @{ type = "keyword" }
badges = @{ type = "keyword" }

# Column info
column_names = @{
type = "text"
analyzer = "default"
}
column_descriptions = @{ type = "text" }

# Display
display_name = @{
type = "text"
fields = @{ raw = @{ type = "keyword" } }
}

# Metadata
total_usage = @{ type = "long" }
last_updated_timestamp = @{ type = "long" }

# For search ranking
programmatic_descriptions = @{ type = "text" }
}
}
} | ConvertTo-Json -Depth 10 -Compress

try {
Invoke-RestMethod -Method Put -Uri "$ElasticsearchUrl/$indexName" -ContentType "application/json" -Body $indexMapping | Out-Null
Write-Host "OK" -ForegroundColor Green
} catch {
Write-Host "FAILED: $_" -ForegroundColor Red
exit 1
}

# ----------------------------------------------------------------------------
# STEP 4: Fetch All Datasets from OptimusDB
# ----------------------------------------------------------------------------

Write-Step "4/7" "Fetching datasets from OptimusDB..."

$fetchResult = Invoke-OptimusDB -Query "SELECT * FROM datacatalog"

if (-not $fetchResult.Success) {
Write-FAIL "Could not fetch datasets: $($fetchResult.Error)"
exit 1
}

$datasets = @()
if ($fetchResult.Data.data.records) {
$datasets = $fetchResult.Data.data.records
}

Write-OK "Found $($datasets.Count) datasets to index"

# Show sample
if ($datasets.Count -gt 0) {
Write-Host "  Sample dataset fields:"
$sample = $datasets[0]
foreach ($key in $sample.PSObject.Properties.Name | Select-Object -First 5) {
$value = $sample.$key
if ($value.Length -gt 50) { $value = $value.Substring(0, 47) + "..." }
Write-Host "    - $key : $value" -ForegroundColor Gray
}
}

# ----------------------------------------------------------------------------
# STEP 5: Index Each Dataset
# ----------------------------------------------------------------------------

Write-Step "5/7" "Indexing datasets into Elasticsearch..."

$successCount = 0
$failCount = 0

foreach ($ds in $datasets) {
# Extract fields - handle both old and new schema
$id = $ds._id
$name = if ($ds.name) { $ds.name } else { "unnamed" }
$description = if ($ds.description) { $ds.description } else { "" }

# Schema might be in metadata_type or component
$schema = if ($ds.metadata_type) { $ds.metadata_type } else { "default" }
$database = if ($ds.component) { $ds.component } else { "optimusdb" }

# Tags
$tagsString = if ($ds.tags) { $ds.tags } else { "" }
$tagsArray = @($tagsString -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })

# Build the key in Amundsen format
# Format: {database}://default.{schema}/{name}
$key = "${database}://default.${schema}/${name}"

# Display name for search
$displayName = "${schema}.${name}"

# Build Elasticsearch document
$esDoc = @{
name = $name
key = $key
description = $description
schema = $schema
database = $database
cluster = "default"
tags = $tagsArray
badges = @()
display_name = $displayName
column_names = @($name, "description", "tags")
total_usage = 0
last_updated_timestamp = [long](Get-Date -UFormat %s)
programmatic_descriptions = @($description)
} | ConvertTo-Json -Depth 5 -Compress

# Index to Elasticsearch
try {
$indexUrl = "$ElasticsearchUrl/$indexName/_doc/$id"
Invoke-RestMethod -Method Put -Uri $indexUrl -ContentType "application/json" -Body $esDoc | Out-Null
Write-Host "  [+] $displayName" -ForegroundColor Green
$successCount++
} catch {
Write-Host "  [-] $displayName : $_" -ForegroundColor Red
$failCount++
}
}

Write-Host ""
Write-OK "Indexed: $successCount datasets"
if ($failCount -gt 0) {
Write-FAIL "Failed: $failCount datasets"
}

# ----------------------------------------------------------------------------
# STEP 6: Refresh and Verify Index
# ----------------------------------------------------------------------------

Write-Step "6/7" "Refreshing and verifying index..."

# Refresh
Write-Host "  Refreshing index... " -NoNewline
try {
Invoke-RestMethod -Method Post -Uri "$ElasticsearchUrl/$indexName/_refresh" | Out-Null
Write-Host "OK" -ForegroundColor Green
} catch {
Write-Host "WARN" -ForegroundColor Yellow
}

# Count documents
Write-Host "  Verifying document count... " -NoNewline
try {
$countResult = Invoke-RestMethod -Uri "$ElasticsearchUrl/$indexName/_count"
Write-Host "OK ($($countResult.count) documents)" -ForegroundColor Green
} catch {
Write-Host "FAILED" -ForegroundColor Red
}

# Test search
Write-Host "  Testing search for 'solar'... " -NoNewline
try {
$searchBody = @{
query = @{
multi_match = @{
query = "solar"
fields = @("name", "description", "tags", "schema", "display_name")
}
}
} | ConvertTo-Json -Depth 5 -Compress

$searchResult = Invoke-RestMethod -Method Post -Uri "$ElasticsearchUrl/$indexName/_search" -ContentType "application/json" -Body $searchBody
$hitCount = $searchResult.hits.total.value
Write-Host "OK ($hitCount results)" -ForegroundColor Green

if ($hitCount -gt 0) {
Write-Host "    First result: $($searchResult.hits.hits[0]._source.display_name)" -ForegroundColor Gray
}
} catch {
Write-Host "FAILED: $_" -ForegroundColor Red
}

# Test wildcard search
Write-Host "  Testing wildcard search '*'... " -NoNewline
try {
$wildcardBody = @{
query = @{
match_all = @{}
}
size = 5
} | ConvertTo-Json -Depth 5 -Compress

$wildcardResult = Invoke-RestMethod -Method Post -Uri "$ElasticsearchUrl/$indexName/_search" -ContentType "application/json" -Body $wildcardBody
Write-Host "OK ($($wildcardResult.hits.total.value) total)" -ForegroundColor Green
} catch {
Write-Host "FAILED" -ForegroundColor Red
}

# ----------------------------------------------------------------------------
# STEP 7: Test Amundsen Search Service (if running)
# ----------------------------------------------------------------------------

Write-Step "7/7" "Testing Amundsen Search Service..."

try {
$searchHealth = Invoke-RestMethod -Uri "$SearchServiceUrl/healthcheck" -TimeoutSec 5
Write-OK "Search service is running"

# Try a search through the service
Write-Host "  Testing search via service... " -NoNewline
try {
$serviceSearch = Invoke-RestMethod -Uri "$SearchServiceUrl/search?query=solar&page_index=0" -TimeoutSec 5
Write-Host "OK" -ForegroundColor Green
Write-Host "    Response: $($serviceSearch | ConvertTo-Json -Compress -Depth 2)" -ForegroundColor Gray
} catch {
Write-Host "WARN: $_" -ForegroundColor Yellow
}
} catch {
Write-INFO "Search service not responding - search may work directly via Elasticsearch"
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Header "Summary"

Write-Host "Results:" -ForegroundColor Yellow
Write-Host "  Datasets in OptimusDB:     $odbCount"
Write-Host "  Datasets indexed to ES:    $successCount"
Write-Host "  Failed to index:           $failCount"
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Refresh your browser at http://localhost:5015"
Write-Host "  2. Try searching for: solar, wind, hydro, generation"
Write-Host "  3. Or search '*' to see all datasets"
Write-Host ""

Write-Host "If search still doesn't work:" -ForegroundColor Yellow
Write-Host "  1. Check if Amundsen Search service is configured correctly"
Write-Host "  2. Restart the ddc-search container: docker restart ddc-search"
Write-Host "  3. Check logs: docker logs ddc-search"
Write-Host ""

Write-Host "Manual Elasticsearch test:" -ForegroundColor Gray
Write-Host "  Invoke-RestMethod '$ElasticsearchUrl/$indexName/_search?q=solar'"
Write-Host ""

Write-Host "Done!" -ForegroundColor Green