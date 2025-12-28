<#
.SYNOPSIS
    OptimusDB-ddC Integration Setup Script for Docker Desktop

.DESCRIPTION
    This PowerShell script seeds OptimusDB datacatalog with Energy Sector datasets
    (Solar, Wind, Hydro) for the ddC (Distributed Data Catalog) integration.

    Uses the correct datacatalog schema with sqldml INSERT commands.

.NOTES
    Author: OptimusDB Team
    Version: 3.2 - Energy Edition (Correct Schema)
    Requires: Docker Desktop, PowerShell 5.1+

.EXAMPLE
    .\Setup-OptimusDBddC.ps1

.EXAMPLE
    .\Setup-OptimusDBddC.ps1 -SkipSampleData

.EXAMPLE
    .\Setup-OptimusDBddC.ps1 -BasePort 18001 -OutputDir .\my-ddc
#>

[CmdletBinding()]
param(
    [Parameter(HelpMessage = "Skip loading sample data")]
    [switch]$SkipSampleData,

    [Parameter(HelpMessage = "Skip verification steps")]
    [switch]$SkipVerification,

    [Parameter(HelpMessage = "Number of OptimusDB nodes (default: 8)")]
    [int]$NodeCount = 8,

    [Parameter(HelpMessage = "Base port for OptimusDB nodes (default: 18001)")]
    [int]$BasePort = 18001,

    [Parameter(HelpMessage = "Output directory for generated files")]
    [string]$OutputDir = ".\ddcOptimusdb"
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# OptimusDB API endpoint
$script:CommandUrl = "http://localhost:$BasePort/swarmkb/command"

# Node configuration
$script:Nodes = 1..$NodeCount | ForEach-Object { "optimusdb$_" }

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewline
    )
    if ($NoNewline) {
        Write-Host $Message -ForegroundColor $Color -NoNewline
    } else {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Write-Header {
    param([string]$Title)
    $line = "=" * 70
    Write-Host ""
    Write-ColorOutput $line "Magenta"
    Write-ColorOutput "  $Title" "Magenta"
    Write-ColorOutput $line "Magenta"
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Description)
    Write-ColorOutput "[$Step] " "Cyan" -NoNewline
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

function Write-WarningMsg {
    param([string]$Message)
    Write-ColorOutput "  [WARN] $Message" "Yellow"
}

function Escape-SqlLiteral {
    param([string]$value)
    if ($null -eq $value) { return "" }
    return $value.Replace("'", "''")
}

function Test-DockerRunning {
    try {
        $null = & docker version 2>$null
        if ($?) { return $true }
        $null = & docker ps 2>$null
        return $?
    } catch {
        return $false
    }
}

function Get-RunningContainers {
    try {
        $containers = & docker ps --format "{{.Names}}" 2>$null
        return $containers
    } catch {
        return @()
    }
}

function Get-RunningNodes {
    $running = @()
    $allContainers = Get-RunningContainers
    foreach ($node in $script:Nodes) {
        if ($allContainers -contains $node) {
            $running += $node
        }
    }
    return $running
}

function Invoke-OptimusDBCommand {
    <#
    .SYNOPSIS
        Execute SQL via OptimusDB /swarmkb/command endpoint
    #>
    param(
        [string]$SqlQuery,
        [int]$TimeoutSeconds = 30
    )

    $payload = @{
        method          = @{ argcnt = 2; cmd = "sqldml" }
        args            = @("dummy1", "dummy2")
        dstype          = "dsswres"
        sqldml          = $SqlQuery
        graph_traversal = @(@{})
        criteria        = @()
    }

    $json = $payload | ConvertTo-Json -Depth 6

    try {
        $response = Invoke-RestMethod -Method Post -Uri $script:CommandUrl -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSeconds
        return @{
            Success = $true
            Data = $response
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# ============================================================================
# ENERGY SECTOR DATASETS
# Using the correct datacatalog schema:
#   _id, author, metadata_type, component, behaviour, relationships,
#   associated_id, name, description, tags, status, created_by,
#   related_ids, priority, scheduling_info, sla_constraints,
#   ownership_details, audit_trail
# ============================================================================

$EnergyDatasets = @(
# ==================== SOLAR ENERGY ====================
    @{
        name        = "solar_generation"
        schema      = "solar_scada"
        database    = "energy_renewables"
        description = "Real-time solar power generation data from photovoltaic installations. Includes AC/DC power output, efficiency metrics, and performance ratios across all solar farms. Updated every 5 minutes from SCADA systems."
        tags        = @("solar","generation","real-time","scada","renewable","pv")
        owner       = "solar.operations@energy.com"
    },
    @{
        name        = "solar_irradiance"
        schema      = "solar_weather"
        database    = "energy_renewables"
        description = "Solar irradiance measurements from pyranometers installed at each solar farm. Contains Global Horizontal Irradiance (GHI), Direct Normal Irradiance (DNI), and Diffuse Horizontal Irradiance (DHI) readings."
        tags        = @("solar","irradiance","weather","ghi","dni","dhi","pyranometer")
        owner       = "meteorology@energy.com"
    },
    @{
        name        = "solar_panels_inventory"
        schema      = "solar_assets"
        database    = "energy_renewables"
        description = "Inventory and specifications of all solar panels across installations. Tracks manufacturer, model, rated capacity, installation date, warranty status, and degradation curves."
        tags        = @("solar","panels","inventory","assets","maintenance","master-data")
        owner       = "asset.management@energy.com"
    },
    @{
        name        = "solar_forecasts"
        schema      = "solar_forecasting"
        database    = "energy_renewables"
        description = "Day-ahead and intraday solar generation forecasts using machine learning models. Combines weather predictions, historical generation patterns, and satellite imagery for accurate predictions."
        tags        = @("solar","forecast","ml","prediction","day-ahead","intraday")
        owner       = "forecasting@energy.com"
    },

    # ==================== WIND ENERGY ====================
    @{
        name        = "wind_generation"
        schema      = "wind_scada"
        database    = "energy_renewables"
        description = "Real-time wind turbine generation data from all wind farms. Includes active power, reactive power, rotor speed, pitch angle, and nacelle direction. Aggregated from individual turbine SCADA systems."
        tags        = @("wind","generation","real-time","scada","renewable","turbine")
        owner       = "wind.operations@energy.com"
    },
    @{
        name        = "wind_turbine_specs"
        schema      = "wind_assets"
        database    = "energy_renewables"
        description = "Technical specifications and master data for all wind turbines. Contains rated capacity, hub height, rotor diameter, cut-in/cut-out speeds, and power curves for Vestas, Siemens, GE turbines."
        tags        = @("wind","turbines","specifications","assets","master-data","power-curve")
        owner       = "asset.management@energy.com"
    },
    @{
        name        = "wind_conditions"
        schema      = "wind_metmast"
        database    = "energy_renewables"
        description = "Meteorological measurements from met masts at wind farm sites. Includes wind speed and direction at multiple heights (10m, 50m, 100m), turbulence intensity, wind shear, and atmospheric pressure."
        tags        = @("wind","weather","met-mast","turbulence","wind-shear","anemometer")
        owner       = "meteorology@energy.com"
    },
    @{
        name        = "wind_forecasts"
        schema      = "wind_forecasting"
        database    = "energy_renewables"
        description = "Wind power generation forecasts from ensemble weather models. Provides probabilistic forecasts (P10, P50, P90) for different time horizons from 1-hour to 7-day ahead predictions."
        tags        = @("wind","forecast","ensemble","prediction","probabilistic","nwp")
        owner       = "forecasting@energy.com"
    },
    @{
        name        = "wind_maintenance"
        schema      = "wind_cmms"
        database    = "energy_renewables"
        description = "Maintenance records and work orders for wind turbines from CMMS. Tracks scheduled maintenance, unplanned repairs, component replacements, and downtime events with root cause analysis."
        tags        = @("wind","maintenance","cmms","downtime","repairs","work-orders")
        owner       = "maintenance@energy.com"
    },

    # ==================== HYDRO ENERGY ====================
    @{
        name        = "hydro_generation"
        schema      = "hydro_scada"
        database    = "energy_renewables"
        description = "Hydroelectric power generation data from all hydro plants. Includes turbine output, water flow rates, head pressure, and generator efficiency metrics. Covers run-of-river and reservoir-based plants."
        tags        = @("hydro","generation","real-time","scada","renewable","turbine")
        owner       = "hydro.operations@energy.com"
    },
    @{
        name        = "hydro_reservoir_levels"
        schema      = "hydro_hydrology"
        database    = "energy_renewables"
        description = "Reservoir water levels and storage volumes for all hydro facilities. Tracks elevation, volume in MCM, inflow, outflow, spillway status, and flood control parameters."
        tags        = @("hydro","reservoir","water-level","storage","inflow","outflow")
        owner       = "hydrology@energy.com"
    },
    @{
        name        = "hydro_dam_safety"
        schema      = "hydro_monitoring"
        database    = "energy_renewables"
        description = "Dam safety monitoring data including structural sensors (piezometers, inclinometers, extensometers), seepage measurements, and seismic activity. Critical for regulatory compliance and early warning systems."
        tags        = @("hydro","dam","safety","monitoring","seepage","seismic","regulated")
        owner       = "dam.safety@energy.com"
    },
    @{
        name        = "hydro_inflow_forecasts"
        schema      = "hydro_forecasting"
        database    = "energy_renewables"
        description = "River inflow forecasts for hydroelectric reservoirs. Combines precipitation forecasts, snowmelt models, and watershed runoff calculations for water availability predictions."
        tags        = @("hydro","inflow","forecast","watershed","snowmelt","runoff")
        owner       = "forecasting@energy.com"
    },
    @{
        name        = "hydro_environmental"
        schema      = "hydro_compliance"
        database    = "energy_renewables"
        description = "Environmental compliance data for hydro operations. Tracks minimum flow requirements, fish passage counts, water quality parameters (dissolved oxygen, pH, turbidity), and temperature monitoring."
        tags        = @("hydro","environmental","compliance","fish-passage","water-quality","regulated")
        owner       = "environmental@energy.com"
    },

    # ==================== PORTFOLIO & GRID ====================
    @{
        name        = "energy_portfolio"
        schema      = "portfolio_analytics"
        database    = "energy_renewables"
        description = "Aggregated renewable energy portfolio performance across all generation sources (Solar, Wind, Hydro). Provides unified view of total capacity, generation MWh, availability, capacity factors, and revenue metrics."
        tags        = @("portfolio","aggregated","solar","wind","hydro","kpi","executive")
        owner       = "analytics@energy.com"
    },
    @{
        name        = "grid_dispatch"
        schema      = "grid_ems"
        database    = "energy_renewables"
        description = "Grid dispatch instructions and market schedules for all renewable assets. Contains day-ahead schedules, real-time dispatch, balancing market participation, and ancillary services (FCR, aFRR, mFRR)."
        tags        = @("grid","dispatch","market","scheduling","balancing","ancillary")
        owner       = "trading@energy.com"
    },
    @{
        name        = "weather_stations_master"
        schema      = "reference_data"
        database    = "energy_renewables"
        description = "Master data for all meteorological stations across renewable energy sites. Contains location coordinates, sensor configurations, calibration records, data quality metrics, and communication protocols."
        tags        = @("weather","stations","master-data","reference","calibration","sensors")
        owner       = "data.operations@energy.com"
    }
)

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Clear-Host
Write-Header "OptimusDB-ddC Setup (Energy Edition v3.2)"

Write-Host "Configuration:"
Write-Host "  - API Endpoint: $script:CommandUrl"
Write-Host "  - Nodes: $NodeCount (optimusdb1 - optimusdb$NodeCount)"
Write-Host "  - Output Directory: $OutputDir"
Write-Host ""
Write-Host "Energy Datasets: 17 total (Solar, Wind, Hydro, Portfolio)" -ForegroundColor Yellow
Write-Host ""

# ----------------------------------------------------------------------------
# STEP 1: Prerequisites Check
# ----------------------------------------------------------------------------

Write-Step "1/5" "Checking prerequisites..."

$dockerPath = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerPath) {
    Write-Failure "Docker command not found in PATH!"
    exit 1
}

Write-Host "  Checking Docker..." -NoNewline
$dockerRunning = Test-DockerRunning

if (-not $dockerRunning) {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Failure "Docker is not responding!"
    exit 1
}
Write-Host " OK" -ForegroundColor Green
Write-Success "Docker is running"

$runningNodes = Get-RunningNodes

if ($runningNodes.Count -eq 0) {
    Write-Failure "No OptimusDB nodes are running!"
    Write-Host ""
    Write-Host "Expected containers: $($script:Nodes -join ', ')" -ForegroundColor Yellow
    exit 1
}

Write-Success "$($runningNodes.Count)/$NodeCount OptimusDB nodes running"

# Test API connectivity
Write-Host "  Testing API connectivity... " -NoNewline
$testResult = Invoke-OptimusDBCommand -SqlQuery "SELECT 1 as test"
if (-not $testResult.Success) {
    Write-Host "FAILED" -ForegroundColor Red
    Write-Failure "Cannot connect to OptimusDB API"
    Write-Host "  Error: $($testResult.Error)" -ForegroundColor Gray
    exit 1
}
Write-Host "OK" -ForegroundColor Green

# ----------------------------------------------------------------------------
# STEP 2: Create Output Directory
# ----------------------------------------------------------------------------

Write-Step "2/5" "Setting up output directory..."

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Success "Created: $OutputDir"
} else {
    Write-Success "Directory exists: $OutputDir"
}

# ----------------------------------------------------------------------------
# STEP 3: Load Energy Datasets
# ----------------------------------------------------------------------------

if (-not $SkipSampleData) {
    Write-Step "3/5" "Loading Energy sector datasets into datacatalog..."

    $successCount = 0
    $failCount = 0
    $solarCount = 0
    $windCount = 0
    $hydroCount = 0
    $otherCount = 0

    foreach ($dataset in $EnergyDatasets) {
        $id = [guid]::NewGuid().ToString()

        # Escape values for SQL
        $nameEsc = Escape-SqlLiteral $dataset.name
        $schemaEsc = Escape-SqlLiteral $dataset.schema
        $dbEsc = Escape-SqlLiteral $dataset.database
        $descEsc = Escape-SqlLiteral $dataset.description
        $tagsEsc = Escape-SqlLiteral ($dataset.tags -join ",")
        $ownerEsc = Escape-SqlLiteral $dataset.owner

        # Build INSERT SQL matching the working datacatalog schema
        $sql = @"
INSERT INTO datacatalog (
  _id,
  author,
  metadata_type,
  component,
  behaviour,
  relationships,
  associated_id,
  name,
  description,
  tags,
  status,
  created_by,
  related_ids,
  priority,
  scheduling_info,
  sla_constraints,
  ownership_details,
  audit_trail
) VALUES (
  '$id',
  '$ownerEsc',
  '$schemaEsc',
  '$dbEsc',
  'dataset_registration',
  '',
  '$id',
  '$nameEsc',
  '$descEsc',
  '$tagsEsc',
  'active',
  '$ownerEsc',
  '',
  'normal',
  '',
  '',
  '$ownerEsc',
  'created via OptimusDB-ddC Setup Script'
);
"@

        Write-Host "  Inserting '$($dataset.name)'... " -NoNewline

        $result = Invoke-OptimusDBCommand -SqlQuery $sql

        if ($result.Success) {
            Write-Host "OK" -ForegroundColor Green
            $successCount++

            # Count by type
            if ($dataset.schema -like "solar*") { $solarCount++ }
            elseif ($dataset.schema -like "wind*") { $windCount++ }
            elseif ($dataset.schema -like "hydro*") { $hydroCount++ }
            else { $otherCount++ }
        } else {
            Write-Host "FAILED" -ForegroundColor Red
            $failCount++
        }
    }

    Write-Host ""
    Write-Success "Loaded $successCount/$($EnergyDatasets.Count) datasets"
    Write-Host "    Solar: $solarCount | Wind: $windCount | Hydro: $hydroCount | Other: $otherCount" -ForegroundColor Gray

    if ($failCount -gt 0) {
        Write-WarningMsg "$failCount datasets failed to load"
    }

} else {
    Write-Step "3/5" "Skipping sample data (--SkipSampleData)"
}

# ----------------------------------------------------------------------------
# STEP 4: Generate Configuration Files
# ----------------------------------------------------------------------------

Write-Step "4/5" "Generating configuration files..."

# config.py
$configPy = @"
# OptimusDB-ddC Configuration (Energy Edition)
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

import os
from metadata_service.proxy.optimusdb_proxy import OptimusDBProxy

OPTIMUSDB_API_URL = os.environ.get('OPTIMUSDB_API_URL', 'http://host.docker.internal:$BasePort')
OPTIMUSDB_TIMEOUT_CONNECT = 5.0
OPTIMUSDB_TIMEOUT_READ = 30.0
OPTIMUSDB_REGISTER_SYSTEM_TABLE = True
SEARCHSERVICE_BASE = os.environ.get('SEARCHSERVICE_BASE', 'http://elasticsearch:9200')
PROXY_CLIENT = OptimusDBProxy
HOST = '0.0.0.0'
PORT = 5002
DEBUG = False
LOG_LEVEL = 'INFO'
"@

$configFile = Join-Path $OutputDir "config.py"
$configPy | Set-Content -Path $configFile -Encoding UTF8
Write-Success "Generated: config.py"

# docker-compose.yml
$dockerCompose = @"
# OptimusDB-ddC Docker Compose (Energy Edition)
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
#
# Services:
#   - Frontend:      http://localhost:5015
#   - Search API:    http://localhost:5013
#   - Metadata API:  http://localhost:5014
#   - Elasticsearch: http://localhost:9200

version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:7.17.9
    container_name: ddc-elasticsearch
    environment:
      - discovery.type=single-node
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - ddc-network
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200/_cluster/health | grep -q 'green\\|yellow'"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    restart: unless-stopped

  ddc-search:
    image: amundsendev/amundsen-search:4.0.0
    container_name: ddc-search
    environment:
      - PROXY_ENDPOINT=http://elasticsearch:9200
    ports:
      - "5013:5001"
    depends_on:
      elasticsearch:
        condition: service_healthy
    networks:
      - ddc-network
    restart: unless-stopped

  ddc-metadata:
    image: amundsendev/amundsen-metadata:4.0.0
    container_name: ddc-metadata
    environment:
      - OPTIMUSDB_API_URL=http://host.docker.internal:$BasePort
      - SEARCHSERVICE_BASE=http://elasticsearch:9200
      - OPTIMUSDB_REGISTER_SYSTEM_TABLE=true
      - LOG_LEVEL=INFO
    ports:
      - "5014:5002"
    volumes:
      - ./optimusdb_proxy_complete.py:/app/metadata_service/proxy/optimusdb_proxy.py:ro
      - ./config.py:/app/metadata_service/config.py:ro
    depends_on:
      - elasticsearch
      - ddc-search
    networks:
      - ddc-network
    restart: unless-stopped

  ddc-frontend:
    image: amundsendev/amundsen-frontend:4.0.0
    container_name: ddc-frontend
    environment:
      - SEARCHSERVICE_BASE=http://ddc-search:5001
      - METADATASERVICE_BASE=http://ddc-metadata:5002
    ports:
      - "5015:5000"
    depends_on:
      - ddc-search
      - ddc-metadata
    networks:
      - ddc-network
    restart: unless-stopped

volumes:
  elasticsearch-data:
    driver: local

networks:
  ddc-network:
    driver: bridge
    name: ddc-network
"@

$dockerComposeFile = Join-Path $OutputDir "docker-compose.yml"
$dockerCompose | Set-Content -Path $dockerComposeFile -Encoding UTF8
Write-Success "Generated: docker-compose.yml"

# Verify-Installation.ps1
$verifyScript = @'
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
'@

$verifyFile = Join-Path $OutputDir "Verify-Installation.ps1"
$verifyScript | Set-Content -Path $verifyFile -Encoding UTF8
Write-Success "Generated: Verify-Installation.ps1"

# Start-ddC.ps1
$startScript = @'
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
'@

$startFile = Join-Path $OutputDir "Start-ddC.ps1"
$startScript | Set-Content -Path $startFile -Encoding UTF8
Write-Success "Generated: Start-ddC.ps1"

# Stop-ddC.ps1
$stopScript = @'
Write-Host "Stopping ddC..." -ForegroundColor Yellow
docker-compose down
Write-Host "Done." -ForegroundColor Green
'@

$stopFile = Join-Path $OutputDir "Stop-ddC.ps1"
$stopScript | Set-Content -Path $stopFile -Encoding UTF8
Write-Success "Generated: Stop-ddC.ps1"

# ----------------------------------------------------------------------------
# STEP 5: Verification
# ----------------------------------------------------------------------------

if (-not $SkipVerification) {
    Write-Step "5/5" "Verifying installation..."

    # Count total datasets
    $countResult = Invoke-OptimusDBCommand -SqlQuery "SELECT COUNT(*) as cnt FROM datacatalog"
    if ($countResult.Success -and $countResult.Data.data.records) {
        $count = $countResult.Data.data.records[0].cnt
        Write-Success "Datacatalog contains $count total datasets"
    } else {
        Write-WarningMsg "Could not verify datacatalog count"
    }

    # Show energy datasets by schema
    $energyResult = Invoke-OptimusDBCommand -SqlQuery "SELECT metadata_type, COUNT(*) as cnt FROM datacatalog WHERE metadata_type LIKE '%solar%' OR metadata_type LIKE '%wind%' OR metadata_type LIKE '%hydro%' OR metadata_type LIKE '%portfolio%' OR metadata_type LIKE '%grid%' OR metadata_type LIKE '%reference%' GROUP BY metadata_type ORDER BY metadata_type"
    if ($energyResult.Success -and $energyResult.Data.data.records -and $energyResult.Data.data.records.Count -gt 0) {
        Write-Host ""
        Write-Host "  Energy datasets by schema:" -ForegroundColor Cyan
        foreach ($rec in $energyResult.Data.data.records) {
            Write-Host "    - $($rec.metadata_type): $($rec.cnt)" -ForegroundColor White
        }
    }

    # Test a few nodes
    Write-Host ""
    Write-Host "  API connectivity across cluster:"
    for ($i = 0; $i -lt [Math]::Min($runningNodes.Count, 3); $i++) {
        $port = $BasePort + $i
        $nodeUrl = "http://localhost:$port/swarmkb/command"

        Write-Host "    Port $port... " -NoNewline

        $payload = @{
            method = @{ argcnt = 2; cmd = "sqldml" }
            args = @("d1", "d2")
            dstype = "dsswres"
            sqldml = "SELECT 1 as ok"
            graph_traversal = @(@{})
            criteria = @()
        } | ConvertTo-Json -Depth 6

        try {
            $response = Invoke-RestMethod -Method Post -Uri $nodeUrl -ContentType "application/json" -Body $payload -TimeoutSec 3
            Write-Host "OK" -ForegroundColor Green
        } catch {
            Write-Host "FAILED" -ForegroundColor Red
        }
    }

    if ($runningNodes.Count -gt 3) {
        Write-Host "    ... and $($runningNodes.Count - 3) more nodes" -ForegroundColor Gray
    }
} else {
    Write-Step "5/5" "Skipping verification (--SkipVerification)"
}

# ============================================================================
# COMPLETION SUMMARY
# ============================================================================

Write-Header "Setup Complete!"

Write-Host "Energy Datasets Loaded:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  SOLAR (4 datasets):" -ForegroundColor Cyan
Write-Host "    - solar_generation        Real-time PV generation"
Write-Host "    - solar_irradiance        GHI, DNI, DHI measurements"
Write-Host "    - solar_panels_inventory  Panel assets and specs"
Write-Host "    - solar_forecasts         Day-ahead predictions"
Write-Host ""
Write-Host "  WIND (5 datasets):" -ForegroundColor Cyan
Write-Host "    - wind_generation         Turbine output data"
Write-Host "    - wind_turbine_specs      Turbine specifications"
Write-Host "    - wind_conditions         Met mast measurements"
Write-Host "    - wind_forecasts          Probabilistic forecasts"
Write-Host "    - wind_maintenance        CMMS work orders"
Write-Host ""
Write-Host "  HYDRO (5 datasets):" -ForegroundColor Cyan
Write-Host "    - hydro_generation        Plant generation data"
Write-Host "    - hydro_reservoir_levels  Reservoir storage"
Write-Host "    - hydro_dam_safety        Safety monitoring"
Write-Host "    - hydro_inflow_forecasts  Watershed predictions"
Write-Host "    - hydro_environmental     Compliance data"
Write-Host ""
Write-Host "  PORTFOLIO & GRID (3 datasets):" -ForegroundColor Cyan
Write-Host "    - energy_portfolio        Aggregated performance"
Write-Host "    - grid_dispatch           Market schedules"
Write-Host "    - weather_stations_master Reference data"
Write-Host ""

Write-Host "Generated Files:" -ForegroundColor White
Write-Host "  $OutputDir\config.py"
Write-Host "  $OutputDir\docker-compose.yml"
Write-Host "  $OutputDir\Verify-Installation.ps1"
Write-Host "  $OutputDir\Start-ddC.ps1"
Write-Host "  $OutputDir\Stop-ddC.ps1"
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Copy-Item optimusdb_proxy_complete.py $OutputDir\" -ForegroundColor Yellow
Write-Host "  2. cd $OutputDir" -ForegroundColor Yellow
Write-Host "  3. docker-compose up -d" -ForegroundColor Yellow
Write-Host "  4. Wait ~90 seconds for Elasticsearch" -ForegroundColor Yellow
Write-Host "  5. .\Verify-Installation.ps1" -ForegroundColor Yellow
Write-Host "  6. Start-Process http://localhost:5015" -ForegroundColor Yellow
Write-Host ""

Write-Host "Service Endpoints:" -ForegroundColor Cyan
Write-Host "  - ddC Frontend:  http://localhost:5015"
Write-Host "  - Search API:    http://localhost:5013"
Write-Host "  - Metadata API:  http://localhost:5014"
Write-Host "  - OptimusDB:     http://localhost:$BasePort"
Write-Host ""

Write-ColorOutput "Done!" "Green"
Write-Host ""