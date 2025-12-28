<#
.SYNOPSIS
    Sync OptimusDB Datacatalog to Elasticsearch for Amundsen Search

.DESCRIPTION
    This script reads all datasets from OptimusDB datacatalog and indexes them
    into Elasticsearch so that Amundsen search functionality works properly.

    Architecture:
    - OptimusDB (18001) → stores the actual metadata
    - Elasticsearch (9200) → search index for Amundsen
    - Amundsen Search (5013) → queries Elasticsearch
    - Amundsen Frontend (5015) → uses Search service

.NOTES
    Author: OptimusDB Team
    Version: 1.0
    Requires: OptimusDB running, Elasticsearch running

.EXAMPLE
    .\Sync-OptimusDBToElasticsearch.ps1

.EXAMPLE
    .\Sync-OptimusDBToElasticsearch.ps1 -OptimusDBPort 18001 -ElasticsearchUrl "http://localhost:9200"

.EXAMPLE
    .\Sync-OptimusDBToElasticsearch.ps1 -ResetIndex
#>

[CmdletBinding()]
param(
    [Parameter(HelpMessage = "OptimusDB API port")]
    [int]$OptimusDBPort = 18001,

    [Parameter(HelpMessage = "Elasticsearch URL")]
    [string]$ElasticsearchUrl = "http://localhost:9200",

    [Parameter(HelpMessage = "Delete and recreate the index before syncing")]
    [switch]$ResetIndex,

    [Parameter(HelpMessage = "Index name for tables/datasets")]
    [string]$TableIndexName = "table_search_index",

    [Parameter(HelpMessage = "Index name for users")]
    [string]$UserIndexName = "user_search_index",

    [Parameter(HelpMessage = "Index name for dashboards")]
    [string]$DashboardIndexName = "dashboard_search_index"
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$script:OptimusDBUrl = "http://localhost:$OptimusDBPort/swarmkb/command"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White", [switch]$NoNewline)
    if ($NoNewline) {
        Write-Host $Message -ForegroundColor $Color -NoNewline
    } else {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Write-Header {
    param([string]$Title)
    $line = "=" * 60
    Write-Host ""
    Write-ColorOutput $line "Cyan"
    Write-ColorOutput "  $Title" "Cyan"
    Write-ColorOutput $line "Cyan"
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Description)
    Write-ColorOutput "[$Step] " "Yellow" -NoNewline
    Write-Host $Description
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "  [OK] $Message" "Green"
}

function Write-Failure {
    param([string]$Message)
    Write-ColorOutput "  [FAIL] $Message" "Red"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "  [INFO] $Message" "Gray"
}

function Invoke-OptimusDBQuery {
    param([string]$SqlQuery)

    $payload = @{
        method = @{ argcnt = 2; cmd = "sqldml" }
        args = @("d1", "d2")
        dstype = "dsswres"
        sqldml = $SqlQuery
        graph_traversal = @(@{})
        criteria = @()
    } | ConvertTo-Json -Depth 6

    try {
        $response = Invoke-RestMethod -Method Post -Uri $script:OptimusDBUrl -ContentType "application/json" -Body $payload -TimeoutSec 30
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Invoke-ElasticsearchRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )

    $uri = "$ElasticsearchUrl/$Endpoint"

    try {
        $params = @{
            Method = $Method
            Uri = $uri
            ContentType = "application/json"
            TimeoutSec = 30
        }

        if ($Body) {
            if ($Body -is [string]) {
                $params.Body = $Body
            } else {
                $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
            }
        }

        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        return @{ Success = $false; Error = $_.Exception.Message; StatusCode = $statusCode }
    }
}

# ============================================================================
# ELASTICSEARCH INDEX MAPPINGS
# These match the Amundsen search service expected schema
# ============================================================================

$TableIndexMapping = @{
    settings = @{
        number_of_shards = 1
        number_of_replicas = 0
        analysis = @{
            analyzer = @{
                default = @{
                    type = "standard"
                }
            }
        }
    }
    mappings = @{
        properties = @{
        # Core fields
            name = @{ type = "text"; analyzer = "standard"; fields = @{ raw = @{ type = "keyword" } } }
            key = @{ type = "keyword" }
            description = @{ type = "text"; analyzer = "standard" }

            # Schema/Database info
            schema = @{ type = "keyword" }
            database = @{ type = "keyword" }
            cluster = @{ type = "keyword" }

            # Classification
            tags = @{ type = "keyword" }
            badges = @{ type = "keyword" }

            # Ownership
            column_names = @{ type = "text" }
            column_descriptions = @{ type = "text" }

            # Display name for UI
            display_name = @{ type = "text"; fields = @{ raw = @{ type = "keyword" } } }

            # Timestamps
            last_updated_timestamp = @{ type = "long" }

            # Total usage for popularity
            total_usage = @{ type = "long" }

            # Programmatic descriptions
            programmatic_descriptions = @{ type = "text" }
        }
    }
}

$UserIndexMapping = @{
    settings = @{
        number_of_shards = 1
        number_of_replicas = 0
    }
    mappings = @{
        properties = @{
            email = @{ type = "keyword" }
            first_name = @{ type = "text"; fields = @{ raw = @{ type = "keyword" } } }
            last_name = @{ type = "text"; fields = @{ raw = @{ type = "keyword" } } }
            full_name = @{ type = "text"; fields = @{ raw = @{ type = "keyword" } } }
            team_name = @{ type = "keyword" }
            manager_email = @{ type = "keyword" }
            is_active = @{ type = "boolean" }
        }
    }
}

$DashboardIndexMapping = @{
    settings = @{
        number_of_shards = 1
        number_of_replicas = 0
    }
    mappings = @{
        properties = @{
            name = @{ type = "text"; fields = @{ raw = @{ type = "keyword" } } }
            description = @{ type = "text" }
            group_name = @{ type = "keyword" }
            group_url = @{ type = "keyword" }
            uri = @{ type = "keyword" }
            url = @{ type = "keyword" }
            tags = @{ type = "keyword" }
            last_successful_run_timestamp = @{ type = "long" }
        }
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Clear-Host
Write-Header "OptimusDB → Elasticsearch Sync"

Write-Host "Configuration:"
Write-Host "  OptimusDB:     $script:OptimusDBUrl"
Write-Host "  Elasticsearch: $ElasticsearchUrl"
Write-Host "  Table Index:   $TableIndexName"
Write-Host "  Reset Index:   $ResetIndex"
Write-Host ""

# ----------------------------------------------------------------------------
# STEP 1: Test Connectivity
# ----------------------------------------------------------------------------

Write-Step "1/6" "Testing connectivity..."

# Test OptimusDB
Write-Host "  Testing OptimusDB... " -NoNewline
$odbTest = Invoke-OptimusDBQuery -SqlQuery "SELECT 1 as test"
if ($odbTest.Success) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "FAILED" -ForegroundColor Red
    Write-Failure "Cannot connect to OptimusDB: $($odbTest.Error)"
    exit 1
}

# Test Elasticsearch
Write-Host "  Testing Elasticsearch... " -NoNewline
$esTest = Invoke-ElasticsearchRequest -Method "GET" -Endpoint "_cluster/health"
if ($esTest.Success) {
    Write-Host "OK ($($esTest.Data.status))" -ForegroundColor Green
} else {
    Write-Host "FAILED" -ForegroundColor Red
    Write-Failure "Cannot connect to Elasticsearch: $($esTest.Error)"
    exit 1
}

# ----------------------------------------------------------------------------
# STEP 2: Setup Elasticsearch Indices
# ----------------------------------------------------------------------------

Write-Step "2/6" "Setting up Elasticsearch indices..."

# Handle table index
if ($ResetIndex) {
    Write-Host "  Deleting existing index '$TableIndexName'... " -NoNewline
    $deleteResult = Invoke-ElasticsearchRequest -Method "DELETE" -Endpoint $TableIndexName
    if ($deleteResult.Success -or $deleteResult.StatusCode -eq 404) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "WARN" -ForegroundColor Yellow
    }
}

# Check if index exists
$indexExists = Invoke-ElasticsearchRequest -Method "HEAD" -Endpoint $TableIndexName
if (-not $indexExists.Success) {
    Write-Host "  Creating index '$TableIndexName'... " -NoNewline
    $createResult = Invoke-ElasticsearchRequest -Method "PUT" -Endpoint $TableIndexName -Body $TableIndexMapping
    if ($createResult.Success) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Info $createResult.Error
    }
} else {
    Write-Success "Index '$TableIndexName' already exists"
}

# Create user index if needed
$userIndexExists = Invoke-ElasticsearchRequest -Method "HEAD" -Endpoint $UserIndexName
if (-not $userIndexExists.Success) {
    Write-Host "  Creating index '$UserIndexName'... " -NoNewline
    $createUserResult = Invoke-ElasticsearchRequest -Method "PUT" -Endpoint $UserIndexName -Body $UserIndexMapping
    if ($createUserResult.Success) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "WARN" -ForegroundColor Yellow
    }
} else {
    Write-Success "Index '$UserIndexName' already exists"
}

# Create dashboard index if needed
$dashIndexExists = Invoke-ElasticsearchRequest -Method "HEAD" -Endpoint $DashboardIndexName
if (-not $dashIndexExists.Success) {
    Write-Host "  Creating index '$DashboardIndexName'... " -NoNewline
    $createDashResult = Invoke-ElasticsearchRequest -Method "PUT" -Endpoint $DashboardIndexName -Body $DashboardIndexMapping
    if ($createDashResult.Success) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "WARN" -ForegroundColor Yellow
    }
} else {
    Write-Success "Index '$DashboardIndexName' already exists"
}

# ----------------------------------------------------------------------------
# STEP 3: Fetch Datasets from OptimusDB
# ----------------------------------------------------------------------------

Write-Step "3/6" "Fetching datasets from OptimusDB..."

$datasetQuery = @"
SELECT
    _id,
    name,
    description,
    metadata_type,
    component,
    tags,
    status,
    author,
    created_by,
    ownership_details
FROM datacatalog
WHERE status = 'active' OR status IS NULL
"@

$datasetResult = Invoke-OptimusDBQuery -SqlQuery $datasetQuery
if (-not $datasetResult.Success) {
    Write-Failure "Failed to fetch datasets: $($datasetResult.Error)"
    exit 1
}

$datasets = @()
if ($datasetResult.Data.data.records) {
    $datasets = $datasetResult.Data.data.records
}

Write-Success "Found $($datasets.Count) datasets to index"

# ----------------------------------------------------------------------------
# STEP 4: Index Datasets into Elasticsearch
# ----------------------------------------------------------------------------

Write-Step "4/6" "Indexing datasets into Elasticsearch..."

$successCount = 0
$failCount = 0
$bulkBody = ""

foreach ($ds in $datasets) {
    # Build the Elasticsearch document
    $schema = if ($ds.metadata_type) { $ds.metadata_type } else { "default" }
    $database = if ($ds.component) { $ds.component } else { "default" }
    $name = if ($ds.name) { $ds.name } else { "unnamed" }

    # Build the key in Amundsen format: database://cluster.schema/table
    $key = "${database}://default.${schema}/${name}"

    # Parse tags
    $tagsArray = @()
    if ($ds.tags) {
        $tagsArray = ($ds.tags -split ",") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    }

    # Build display name
    $displayName = "${schema}.${name}"

    $doc = @{
        name = $name
        key = $key
        description = if ($ds.description) { $ds.description } else { "" }
        schema = $schema
        database = $database
        cluster = "default"
        tags = $tagsArray
        badges = @()
        display_name = $displayName
        column_names = @()
        column_descriptions = @()
        last_updated_timestamp = [long](Get-Date -UFormat %s)
        total_usage = 0
        programmatic_descriptions = @()
    }

    # Add to bulk request
    $action = @{ index = @{ _index = $TableIndexName; _id = $ds._id } } | ConvertTo-Json -Compress
    $docJson = $doc | ConvertTo-Json -Compress -Depth 5
    $bulkBody += "$action`n$docJson`n"

    Write-Host "  Preparing: $displayName" -ForegroundColor Gray
}

# Execute bulk index
if ($bulkBody -ne "") {
    Write-Host ""
    Write-Host "  Executing bulk index... " -NoNewline

    try {
        $bulkResult = Invoke-RestMethod -Method Post -Uri "$ElasticsearchUrl/_bulk" -ContentType "application/x-ndjson" -Body $bulkBody -TimeoutSec 60

        $indexed = 0
        $errors = 0
        foreach ($item in $bulkResult.items) {
            if ($item.index.status -ge 200 -and $item.index.status -lt 300) {
                $indexed++
            } else {
                $errors++
            }
        }

        Write-Host "OK" -ForegroundColor Green
        Write-Success "Indexed: $indexed, Errors: $errors"
        $successCount = $indexed
        $failCount = $errors
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Failure $_.Exception.Message

        # Fallback to individual indexing
        Write-Host "  Falling back to individual indexing..." -ForegroundColor Yellow

        foreach ($ds in $datasets) {
            $schema = if ($ds.metadata_type) { $ds.metadata_type } else { "default" }
            $database = if ($ds.component) { $ds.component } else { "default" }
            $name = if ($ds.name) { $ds.name } else { "unnamed" }
            $key = "${database}://default.${schema}/${name}"

            $tagsArray = @()
            if ($ds.tags) {
                $tagsArray = ($ds.tags -split ",") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
            }

            $doc = @{
                name = $name
                key = $key
                description = if ($ds.description) { $ds.description } else { "" }
                schema = $schema
                database = $database
                cluster = "default"
                tags = $tagsArray
                badges = @()
                display_name = "${schema}.${name}"
                last_updated_timestamp = [long](Get-Date -UFormat %s)
                total_usage = 0
            }

            Write-Host "    Indexing $name... " -NoNewline
            $indexResult = Invoke-ElasticsearchRequest -Method "PUT" -Endpoint "$TableIndexName/_doc/$($ds._id)" -Body $doc

            if ($indexResult.Success) {
                Write-Host "OK" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "FAILED" -ForegroundColor Red
                $failCount++
            }
        }
    }
}

# ----------------------------------------------------------------------------
# STEP 5: Fetch and Index Users (Optional)
# ----------------------------------------------------------------------------

Write-Step "5/6" "Indexing users..."

$userQuery = "SELECT user_id, email, display_name, team_name, is_active FROM users WHERE is_active = 1 OR is_active IS NULL"
$userResult = Invoke-OptimusDBQuery -SqlQuery $userQuery

$userCount = 0
if ($userResult.Success -and $userResult.Data.data.records) {
    $users = $userResult.Data.data.records

    foreach ($user in $users) {
        if (-not $user.email) { continue }

        # Parse display name into first/last
        $nameParts = @("", "")
        if ($user.display_name) {
            $nameParts = $user.display_name -split " ", 2
        }

        $userDoc = @{
            email = $user.email
            first_name = $nameParts[0]
            last_name = if ($nameParts.Length -gt 1) { $nameParts[1] } else { "" }
            full_name = if ($user.display_name) { $user.display_name } else { $user.email }
            team_name = if ($user.team_name) { $user.team_name } else { "" }
            is_active = $true
        }

        $indexResult = Invoke-ElasticsearchRequest -Method "PUT" -Endpoint "$UserIndexName/_doc/$($user.user_id)" -Body $userDoc
        if ($indexResult.Success) {
            $userCount++
        }
    }

    Write-Success "Indexed $userCount users"
} else {
    Write-Info "No users found or users table doesn't exist"
}

# ----------------------------------------------------------------------------
# STEP 6: Refresh Indices and Verify
# ----------------------------------------------------------------------------

Write-Step "6/6" "Refreshing indices and verifying..."

# Refresh all indices
Write-Host "  Refreshing indices... " -NoNewline
$refreshResult = Invoke-ElasticsearchRequest -Method "POST" -Endpoint "_refresh"
if ($refreshResult.Success) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "WARN" -ForegroundColor Yellow
}

# Count documents in each index
Write-Host ""
Write-Host "  Index statistics:" -ForegroundColor Cyan

$tableCount = Invoke-ElasticsearchRequest -Method "GET" -Endpoint "$TableIndexName/_count"
if ($tableCount.Success) {
    Write-Host "    $TableIndexName : $($tableCount.Data.count) documents" -ForegroundColor White
}

$userCountResult = Invoke-ElasticsearchRequest -Method "GET" -Endpoint "$UserIndexName/_count"
if ($userCountResult.Success) {
    Write-Host "    $UserIndexName : $($userCountResult.Data.count) documents" -ForegroundColor White
}

$dashCount = Invoke-ElasticsearchRequest -Method "GET" -Endpoint "$DashboardIndexName/_count"
if ($dashCount.Success) {
    Write-Host "    $DashboardIndexName : $($dashCount.Data.count) documents" -ForegroundColor White
}

# Test search
Write-Host ""
Write-Host "  Testing search... " -NoNewline
$searchTest = Invoke-ElasticsearchRequest -Method "GET" -Endpoint "$TableIndexName/_search?q=*&size=1"
if ($searchTest.Success -and $searchTest.Data.hits.total.value -gt 0) {
    Write-Host "OK ($($searchTest.Data.hits.total.value) searchable)" -ForegroundColor Green
} else {
    Write-Host "WARN (no results)" -ForegroundColor Yellow
}

# ============================================================================
# COMPLETION SUMMARY
# ============================================================================

Write-Header "Sync Complete!"

Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Datasets indexed: $successCount"
Write-Host "  Datasets failed:  $failCount"
Write-Host "  Users indexed:    $userCount"
Write-Host ""

Write-Host "Test Searches:" -ForegroundColor Cyan
Write-Host "  Try these in Amundsen (http://localhost:5015):"
Write-Host "    - solar"
Write-Host "    - wind"
Write-Host "    - hydro"
Write-Host "    - generation"
Write-Host "    - forecast"
Write-Host "    - * (all datasets)"
Write-Host ""

Write-Host "Elasticsearch Queries:" -ForegroundColor Cyan
Write-Host "  # Search for solar datasets"
Write-Host "  Invoke-RestMethod '$ElasticsearchUrl/$TableIndexName/_search?q=solar'"
Write-Host ""
Write-Host "  # Get all indexed documents"
Write-Host "  Invoke-RestMethod '$ElasticsearchUrl/$TableIndexName/_search?size=100'"
Write-Host ""

Write-ColorOutput "Done! Refresh your Amundsen page and search again." "Green"
Write-Host ""