# OptimusDB Dataset Generator - PowerShell Version
# Inserts 30 diverse datasets with realistic metadata into OptimusDB
#
# Usage: .\Generate-Datasets.ps1 [-OptimusDbUrl "http://localhost:8089"]
# Example: .\Generate-Datasets.ps1 -OptimusDbUrl "http://192.168.1.100:8089"

param(
    [Parameter(Mandatory=$false)]
    [string]$OptimusDbUrl = "http://localhost:18001"
)

# Configuration
$ApiEndpoint = "$OptimusDbUrl/swarmkb/command"
$Timestamp = [int][double]::Parse((Get-Date -UFormat %s))

# Color functions
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "[WARNING] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

# Function to insert dataset into OptimusDB
function Insert-Dataset {
    param(
        [string]$Id,
        [string]$Author,
        [string]$MetadataType,
        [string]$Component,
        [string]$Behaviour,
        [string]$Relationships,
        [string]$AssociatedId,
        [string]$Name,
        [string]$Description,
        [string]$Tags,
        [string]$Status,
        [string]$CreatedBy,
        [string]$RelatedIds,
        [string]$Priority,
        [string]$SchedulingInfo,
        [string]$SlaConstraints,
        [string]$OwnershipDetails,
        [string]$AuditTrail
    )

    # Escape single quotes for SQL
    $Description = $Description -replace "'", "''"

    $sql = "INSERT INTO datacatalog (_id, author, metadata_type, component, behaviour, relationships, associated_id, name, description, tags, status, created_by, created_at, updated_at, related_ids, priority, scheduling_info, sla_constraints, ownership_details, audit_trail) VALUES ('$Id', '$Author', '$MetadataType', '$Component', '$Behaviour', '$Relationships', '$AssociatedId', '$Name', '$Description', '$Tags', '$Status', '$CreatedBy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '$RelatedIds', '$Priority', '$SchedulingInfo', '$SlaConstraints', '$OwnershipDetails', '$AuditTrail');"

    $payload = @{
        method = @{
            argcnt = 2
            cmd = "sqldml"
        }
        args = @("dummy1", "dummy2")
        dstype = "dsswres"
        sqldml = $sql
        graph_traversal = @(@{})
        criteria = @()
    } | ConvertTo-Json -Depth 10 -Compress

    try {
        $response = Invoke-RestMethod -Uri $ApiEndpoint -Method Post `
            -ContentType "application/json" `
            -Headers @{ "Accept" = "application/json" } `
            -Body $payload `
            -ErrorAction Stop

        Write-Success "Inserted dataset: $Name"
        return $true
    }
    catch {
        Write-Error-Message "Failed to insert ${Name}: $_"
        return $false
    }
}

# Print banner
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "      OptimusDB Dataset Generator - 30 Diverse Datasets" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Status "Target OptimusDB: $OptimusDbUrl"
Write-Status "Timestamp: $Timestamp"
Write-Host ""

# Counter for successful insertions
$successCount = 0
$totalDatasets = 30
$currentDate = Get-Date -Format "yyyy-MM-dd"

# ============================================================================
# CATEGORY 1: SALES & REVENUE (6 datasets)
# ============================================================================
Write-Status "Inserting Sales & Revenue datasets..."

if (Insert-Dataset `
    -Id "DS001" `
    -Author "Sarah Johnson" `
    -MetadataType "Sales Analytics" `
    -Component "Sales" `
    -Behaviour "Batch" `
    -Relationships "upstream:crm_raw,downstream:revenue_dashboard" `
    -AssociatedId "REV-001" `
    -Name "Daily Sales Transactions" `
    -Description "Daily transactional sales data including product SKU, quantity, revenue, discount applied, and customer segment. Updated nightly via ETL pipeline from Salesforce CRM." `
    -Tags "sales,revenue,transactions,daily" `
    -Status "Active" `
    -CreatedBy "sales_team" `
    -RelatedIds "DS002,DS003" `
    -Priority "Critical" `
    -SchedulingInfo "Daily at 02:00 UTC" `
    -SlaConstraints "SLA-24H" `
    -OwnershipDetails "sales_team,finance_team" `
    -AuditTrail "Created via automated ETL pipeline - Last modified by Sarah Johnson on $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS002" `
    -Author "Michael Chen" `
    -MetadataType "Sales Analytics" `
    -Component "Sales" `
    -Behaviour "Streaming" `
    -Relationships "upstream:DS001,downstream:sales_forecast" `
    -AssociatedId "REV-002" `
    -Name "Regional Sales Performance" `
    -Description "Aggregated sales performance metrics by region including total revenue, average deal size, conversion rates, and year-over-year growth. Used for executive dashboards and regional manager KPIs." `
    -Tags "sales,regional,performance,kpi" `
    -Status "Active" `
    -CreatedBy "michael_chen" `
    -RelatedIds "DS001,DS007" `
    -Priority "High" `
    -SchedulingInfo "Hourly" `
    -SlaConstraints "SLA-4H" `
    -OwnershipDetails "sales_ops,regional_managers" `
    -AuditTrail "Migrated from legacy SQL Server - Data quality validated $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS003" `
    -Author "Emily Rodriguez" `
    -MetadataType "Sales Analytics" `
    -Component "Sales" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS001,downstream:commission_calc" `
    -AssociatedId "REV-003" `
    -Name "Sales Representative Metrics" `
    -Description "Individual sales rep performance including deals closed, revenue generated, pipeline velocity, and quota attainment. Powers commission calculations and performance reviews." `
    -Tags "sales,reps,performance,commission" `
    -Status "Active" `
    -CreatedBy "hr_team" `
    -RelatedIds "DS001,DS002" `
    -Priority "High" `
    -SchedulingInfo "Weekly on Monday" `
    -SlaConstraints "SLA-12H" `
    -OwnershipDetails "hr_team,sales_ops" `
    -AuditTrail "GDPR compliant - PII anonymized - Audited $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS004" `
    -Author "David Park" `
    -MetadataType "Sales Forecasting" `
    -Component "Sales" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS001,DS002" `
    -AssociatedId "FOR-001" `
    -Name "Quarterly Sales Forecast" `
    -Description "ML-based sales forecast combining historical trends, pipeline data, market indicators, and seasonality factors. Generates quarterly predictions with confidence intervals for strategic planning." `
    -Tags "forecast,ml,quarterly,planning" `
    -Status "Active" `
    -CreatedBy "data_science" `
    -RelatedIds "DS001,DS002,DS005" `
    -Priority "Critical" `
    -SchedulingInfo "Monthly on 1st" `
    -SlaConstraints "SLA-48H" `
    -OwnershipDetails "data_science,finance" `
    -AuditTrail "XGBoost model - Accuracy: 92% - Last retrained $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS005" `
    -Author "Lisa Wang" `
    -MetadataType "Sales Analytics" `
    -Component "Sales" `
    -Behaviour "Passive" `
    -Relationships "upstream:external_market_data" `
    -AssociatedId "MKT-001" `
    -Name "Market Share Analysis" `
    -Description "Competitive market share data combining internal sales with external market research. Tracks market position, competitor activity, and category trends across key verticals." `
    -Tags "market,competitive,analysis,intelligence" `
    -Status "Active" `
    -CreatedBy "strategy_team" `
    -RelatedIds "DS001,DS002" `
    -Priority "Medium" `
    -SchedulingInfo "Quarterly" `
    -SlaConstraints "SLA-72H" `
    -OwnershipDetails "strategy_team,product_team" `
    -AuditTrail "Third-party data licensed from Gartner - Contract expires 2026-12-31") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS006" `
    -Author "James Anderson" `
    -MetadataType "Sales Pipeline" `
    -Component "Sales" `
    -Behaviour "Streaming" `
    -Relationships "upstream:crm_opportunities" `
    -AssociatedId "PIP-001" `
    -Name "Live Sales Pipeline" `
    -Description "Real-time sales pipeline data showing all open opportunities, stages, deal values, close probabilities, and expected close dates. Critical for revenue forecasting and team planning." `
    -Tags "pipeline,opportunities,real-time,crm" `
    -Status "Active" `
    -CreatedBy "sales_ops" `
    -RelatedIds "DS001,DS004" `
    -Priority "Critical" `
    -SchedulingInfo "Real-time streaming" `
    -SlaConstraints "SLA-1H" `
    -OwnershipDetails "sales_ops,executive_team" `
    -AuditTrail "Synchronized with Salesforce every 15 minutes - Last sync $currentDate") {
    $successCount++
}

# ============================================================================
# CATEGORY 2: CUSTOMER DATA (5 datasets)
# ============================================================================
Write-Status "Inserting Customer Data datasets..."

if (Insert-Dataset `
    -Id "DS007" `
    -Author "Rachel Kim" `
    -MetadataType "Customer Master" `
    -Component "Customer" `
    -Behaviour "Batch" `
    -Relationships "upstream:crm_contacts,downstream:customer_360" `
    -AssociatedId "CUS-001" `
    -Name "Customer Master Data" `
    -Description "Golden record customer master data including demographics, contact info, preferences, segment classification, and lifecycle stage. Single source of truth for all customer information." `
    -Tags "customer,master,mdm,golden-record" `
    -Status "Active" `
    -CreatedBy "data_governance" `
    -RelatedIds "DS008,DS009,DS010" `
    -Priority "Critical" `
    -SchedulingInfo "Daily at 03:00 UTC" `
    -SlaConstraints "SLA-8H" `
    -OwnershipDetails "data_governance,customer_success" `
    -AuditTrail "MDM system - GDPR compliant - Data quality score: 97.8% - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS008" `
    -Author "Thomas Brown" `
    -MetadataType "Customer Analytics" `
    -Component "Customer" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS007,web_analytics,support_tickets" `
    -AssociatedId "CUS-002" `
    -Name "Customer Engagement Score" `
    -Description "Composite customer engagement score based on product usage, support interactions, NPS feedback, and purchase history. Used to identify at-risk accounts and expansion opportunities." `
    -Tags "customer,engagement,score,churn" `
    -Status "Active" `
    -CreatedBy "customer_success" `
    -RelatedIds "DS007,DS011" `
    -Priority "High" `
    -SchedulingInfo "Daily at 05:00 UTC" `
    -SlaConstraints "SLA-12H" `
    -OwnershipDetails "customer_success,account_management" `
    -AuditTrail "Predictive model v2.3 - Churn prediction accuracy: 89% - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS009" `
    -Author "Maria Garcia" `
    -MetadataType "Customer Segmentation" `
    -Component "Customer" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS007,DS001" `
    -AssociatedId "SEG-001" `
    -Name "Customer Segmentation Clusters" `
    -Description "K-means clustering model segmenting customers into 8 distinct groups based on behavior, demographics, and value. Powers personalized marketing campaigns and product recommendations." `
    -Tags "segmentation,clustering,ml,marketing" `
    -Status "Active" `
    -CreatedBy "marketing_analytics" `
    -RelatedIds "DS007,DS008" `
    -Priority "Medium" `
    -SchedulingInfo "Weekly on Sunday" `
    -SlaConstraints "SLA-24H" `
    -OwnershipDetails "marketing_team,product_marketing" `
    -AuditTrail "K-means with k=8 - Silhouette score: 0.72 - Last updated $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS010" `
    -Author "Kevin O'Brien" `
    -MetadataType "Customer Support" `
    -Component "Customer" `
    -Behaviour "Streaming" `
    -Relationships "upstream:zendesk_api,DS007" `
    -AssociatedId "SUP-001" `
    -Name "Customer Support Tickets" `
    -Description "Real-time customer support ticket data including issue category, priority, resolution time, customer satisfaction scores, and support agent assignments. Tracks SLA compliance and support quality." `
    -Tags "support,tickets,zendesk,sla" `
    -Status "Active" `
    -CreatedBy "support_ops" `
    -RelatedIds "DS007,DS008" `
    -Priority "High" `
    -SchedulingInfo "Real-time" `
    -SlaConstraints "SLA-2H" `
    -OwnershipDetails "support_ops,customer_success" `
    -AuditTrail "Integrated with Zendesk API - Average resolution time: 4.2 hours - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS011" `
    -Author "Jennifer Lee" `
    -MetadataType "Customer Lifecycle" `
    -Component "Customer" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS007,DS001,DS008" `
    -AssociatedId "LIF-001" `
    -Name "Customer Lifetime Value" `
    -Description "Customer lifetime value (CLV) predictions using survival analysis and revenue modeling. Includes historical CLV, predicted CLV, and confidence intervals for strategic customer investment decisions." `
    -Tags "clv,lifetime-value,prediction,strategy" `
    -Status "Active" `
    -CreatedBy "data_science" `
    -RelatedIds "DS007,DS008,DS009" `
    -Priority "High" `
    -SchedulingInfo "Monthly on 15th" `
    -SlaConstraints "SLA-48H" `
    -OwnershipDetails "data_science,finance,strategy" `
    -AuditTrail "Survival analysis model - Median CLV: `$12,450 - Last calculated $currentDate") {
    $successCount++
}

# ============================================================================
# CATEGORY 3: PRODUCT DATA (4 datasets)
# ============================================================================
Write-Status "Inserting Product Data datasets..."

if (Insert-Dataset `
    -Id "DS012" `
    -Author "Daniel Martinez" `
    -MetadataType "Product Catalog" `
    -Component "Product" `
    -Behaviour "Batch" `
    -Relationships "upstream:erp_system,downstream:ecommerce" `
    -AssociatedId "PRD-001" `
    -Name "Product Master Catalog" `
    -Description "Complete product catalog with SKUs, descriptions, pricing, categories, attributes, inventory levels, and supplier information. Master reference for all product data across systems." `
    -Tags "product,catalog,master,inventory" `
    -Status "Active" `
    -CreatedBy "product_team" `
    -RelatedIds "DS013,DS014,DS015" `
    -Priority "Critical" `
    -SchedulingInfo "Every 4 hours" `
    -SlaConstraints "SLA-4H" `
    -OwnershipDetails "product_team,supply_chain" `
    -AuditTrail "10,247 active SKUs - Last sync with ERP: $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS013" `
    -Author "Amanda White" `
    -MetadataType "Product Analytics" `
    -Component "Product" `
    -Behaviour "Streaming" `
    -Relationships "upstream:web_analytics,mobile_analytics" `
    -AssociatedId "PRD-002" `
    -Name "Product Usage Metrics" `
    -Description "Real-time product usage telemetry including feature adoption, user flows, error rates, performance metrics, and session duration. Powers product roadmap and feature prioritization." `
    -Tags "product,usage,analytics,telemetry" `
    -Status "Active" `
    -CreatedBy "product_analytics" `
    -RelatedIds "DS012,DS018" `
    -Priority "High" `
    -SchedulingInfo "Real-time streaming" `
    -SlaConstraints "SLA-1H" `
    -OwnershipDetails "product_team,engineering" `
    -AuditTrail "Segment + Amplitude integration - 2.4M events/day - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS014" `
    -Author "Christopher Davis" `
    -MetadataType "Product Performance" `
    -Component "Product" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS012,DS001" `
    -AssociatedId "PRD-003" `
    -Name "Product Sales Performance" `
    -Description "Product-level sales performance showing revenue, units sold, margins, returns, and inventory turns. Identifies top performers, slow movers, and products needing price adjustments." `
    -Tags "product,sales,performance,inventory" `
    -Status "Active" `
    -CreatedBy "merchandising" `
    -RelatedIds "DS012,DS001,DS002" `
    -Priority "High" `
    -SchedulingInfo "Daily at 04:00 UTC" `
    -SlaConstraints "SLA-8H" `
    -OwnershipDetails "merchandising,supply_chain,finance" `
    -AuditTrail "Top 10 products generate 64% of revenue - Analysis date: $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS015" `
    -Author "Nicole Thompson" `
    -MetadataType "Product Reviews" `
    -Component "Product" `
    -Behaviour "Batch" `
    -Relationships "upstream:review_api,DS012" `
    -AssociatedId "REV-004" `
    -Name "Product Reviews & Ratings" `
    -Description "Customer product reviews and ratings aggregated from multiple channels including website, mobile app, and third-party retailers. Includes sentiment analysis and topic extraction." `
    -Tags "reviews,ratings,sentiment,feedback" `
    -Status "Active" `
    -CreatedBy "product_team" `
    -RelatedIds "DS012,DS013" `
    -Priority "Medium" `
    -SchedulingInfo "Daily at 06:00 UTC" `
    -SlaConstraints "SLA-12H" `
    -OwnershipDetails "product_team,marketing" `
    -AuditTrail "NLP sentiment analysis - 128,450 reviews analyzed - Average rating: 4.3/5 - $currentDate") {
    $successCount++
}

# ============================================================================
# CATEGORY 4: MARKETING (4 datasets)
# ============================================================================
Write-Status "Inserting Marketing datasets..."

if (Insert-Dataset `
    -Id "DS016" `
    -Author "Brian Wilson" `
    -MetadataType "Marketing Campaigns" `
    -Component "Marketing" `
    -Behaviour "Batch" `
    -Relationships "upstream:email_platform,ads_api" `
    -AssociatedId "MKT-002" `
    -Name "Campaign Performance Metrics" `
    -Description "Multi-channel marketing campaign performance including email, social, paid search, and display ads. Tracks impressions, clicks, conversions, CAC, and ROI by channel and campaign." `
    -Tags "marketing,campaigns,performance,roi" `
    -Status "Active" `
    -CreatedBy "marketing_ops" `
    -RelatedIds "DS017,DS018,DS007" `
    -Priority "High" `
    -SchedulingInfo "Daily at 07:00 UTC" `
    -SlaConstraints "SLA-8H" `
    -OwnershipDetails "marketing_team,growth_team" `
    -AuditTrail "Integrated with HubSpot, Google Ads, Facebook Ads - Overall ROAS: 4.2x - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS017" `
    -Author "Stephanie Miller" `
    -MetadataType "Marketing Attribution" `
    -Component "Marketing" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS016,DS001,web_analytics" `
    -AssociatedId "ATT-001" `
    -Name "Marketing Attribution Model" `
    -Description "Multi-touch attribution model distributing revenue credit across marketing touchpoints. Uses Shapley value algorithm to fairly attribute conversions to email, ads, content, and other channels." `
    -Tags "attribution,marketing,ml,shapley" `
    -Status "Active" `
    -CreatedBy "marketing_analytics" `
    -RelatedIds "DS016,DS001" `
    -Priority "High" `
    -SchedulingInfo "Weekly on Tuesday" `
    -SlaConstraints "SLA-24H" `
    -OwnershipDetails "marketing_analytics,finance" `
    -AuditTrail "Shapley attribution model - Email: 32%, Paid: 28%, Organic: 40% - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS018" `
    -Author "Ryan Taylor" `
    -MetadataType "Website Analytics" `
    -Component "Marketing" `
    -Behaviour "Streaming" `
    -Relationships "upstream:google_analytics_api" `
    -AssociatedId "WEB-001" `
    -Name "Website Traffic & Behavior" `
    -Description "Real-time website analytics including sessions, pageviews, bounce rates, conversion funnels, traffic sources, and user journeys. Powers optimization experiments and content strategy." `
    -Tags "web,analytics,traffic,conversion" `
    -Status "Active" `
    -CreatedBy "growth_team" `
    -RelatedIds "DS016,DS013" `
    -Priority "High" `
    -SchedulingInfo "Real-time streaming" `
    -SlaConstraints "SLA-30MIN" `
    -OwnershipDetails "growth_team,product_team" `
    -AuditTrail "Google Analytics 4 + custom events - 450K sessions/month - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS019" `
    -Author "Michelle Anderson" `
    -MetadataType "Email Marketing" `
    -Component "Marketing" `
    -Behaviour "Batch" `
    -Relationships "upstream:email_platform,DS007" `
    -AssociatedId "EML-001" `
    -Name "Email Campaign Analytics" `
    -Description "Email marketing performance including send volume, open rates, click rates, unsubscribes, and conversion tracking. Segments analysis by customer cohort and email type." `
    -Tags "email,campaigns,engagement,marketing" `
    -Status "Active" `
    -CreatedBy "email_marketing" `
    -RelatedIds "DS016,DS007" `
    -Priority "Medium" `
    -SchedulingInfo "Daily at 08:00 UTC" `
    -SlaConstraints "SLA-12H" `
    -OwnershipDetails "email_marketing,marketing_ops" `
    -AuditTrail "SendGrid platform - Avg open rate: 24.3%, Click rate: 3.8% - $currentDate") {
    $successCount++
}

# ============================================================================
# CATEGORY 5: FINANCE (4 datasets)
# ============================================================================
Write-Status "Inserting Finance datasets..."

if (Insert-Dataset `
    -Id "DS020" `
    -Author "Robert Johnson" `
    -MetadataType "Financial Reporting" `
    -Component "Finance" `
    -Behaviour "Batch" `
    -Relationships "upstream:erp_system,DS001" `
    -AssociatedId "FIN-001" `
    -Name "Monthly Financial Statements" `
    -Description "Consolidated monthly financial statements including P&L, balance sheet, and cash flow. Combines revenue data with operational expenses for management and board reporting." `
    -Tags "finance,reporting,statements,monthly" `
    -Status "Active" `
    -CreatedBy "finance_team" `
    -RelatedIds "DS021,DS022,DS001" `
    -Priority "Critical" `
    -SchedulingInfo "Monthly on 5th" `
    -SlaConstraints "SLA-72H" `
    -OwnershipDetails "finance_team,executive_team" `
    -AuditTrail "SOX compliant - Audited by external firm - FY2024 records - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS021" `
    -Author "Patricia Martinez" `
    -MetadataType "Budget Planning" `
    -Component "Finance" `
    -Behaviour "Passive" `
    -Relationships "upstream:DS020,DS004" `
    -AssociatedId "BUD-001" `
    -Name "Annual Budget & Forecasts" `
    -Description "Annual budget allocations and rolling forecasts by department, cost center, and initiative. Includes variance analysis comparing actuals to plan with monthly re-forecasting." `
    -Tags "budget,planning,forecast,variance" `
    -Status "Active" `
    -CreatedBy "fp_and_a" `
    -RelatedIds "DS020,DS004" `
    -Priority "High" `
    -SchedulingInfo "Monthly on 10th" `
    -SlaConstraints "SLA-48H" `
    -OwnershipDetails "fp_and_a,department_heads" `
    -AuditTrail "FY2025 budget approved - Rolling 12-month forecast - Last updated $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS022" `
    -Author "William Clark" `
    -MetadataType "Accounts Receivable" `
    -Component "Finance" `
    -Behaviour "Batch" `
    -Relationships "upstream:billing_system,DS001" `
    -AssociatedId "AR-001" `
    -Name "Accounts Receivable Aging" `
    -Description "Accounts receivable aging report showing outstanding invoices, payment terms, days overdue, and collection risk scores. Tracks DSO and identifies collection priorities." `
    -Tags "ar,receivable,aging,collections" `
    -Status "Active" `
    -CreatedBy "accounting" `
    -RelatedIds "DS001,DS020" `
    -Priority "High" `
    -SchedulingInfo "Daily at 09:00 UTC" `
    -SlaConstraints "SLA-12H" `
    -OwnershipDetails "accounting,finance_ops" `
    -AuditTrail "DSO: 42 days - `$2.3M outstanding - Collection rate: 96.2% - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS023" `
    -Author "Karen Robinson" `
    -MetadataType "Revenue Recognition" `
    -Component "Finance" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS001,subscription_system" `
    -AssociatedId "REV-005" `
    -Name "Revenue Recognition Schedule" `
    -Description "ASC 606 compliant revenue recognition for subscription and multi-year contracts. Calculates deferred revenue, recognized revenue, and future revenue commitments." `
    -Tags "revenue,recognition,asc606,subscription" `
    -Status "Active" `
    -CreatedBy "revenue_accounting" `
    -RelatedIds "DS001,DS020,DS021" `
    -Priority "Critical" `
    -SchedulingInfo "Monthly on 3rd" `
    -SlaConstraints "SLA-48H" `
    -OwnershipDetails "revenue_accounting,finance_team" `
    -AuditTrail "ASC 606 compliant - Deferred revenue: `$8.4M - $currentDate") {
    $successCount++
}

# ============================================================================
# CATEGORY 6: OPERATIONS (3 datasets)
# ============================================================================
Write-Status "Inserting Operations datasets..."

if (Insert-Dataset `
    -Id "DS024" `
    -Author "Steven Harris" `
    -MetadataType "Supply Chain" `
    -Component "Operations" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS012,supplier_api" `
    -AssociatedId "SCM-001" `
    -Name "Supply Chain Inventory" `
    -Description "Multi-location inventory tracking including warehouse levels, in-transit stock, safety stock, reorder points, and lead times. Optimizes inventory investment while preventing stockouts." `
    -Tags "supply-chain,inventory,warehouse,stock" `
    -Status "Active" `
    -CreatedBy "supply_chain" `
    -RelatedIds "DS012,DS014" `
    -Priority "Critical" `
    -SchedulingInfo "Every 2 hours" `
    -SlaConstraints "SLA-2H" `
    -OwnershipDetails "supply_chain,operations" `
    -AuditTrail "15 warehouses - Inventory turnover: 8.2x - Fill rate: 98.4% - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS025" `
    -Author "Laura Lewis" `
    -MetadataType "Fulfillment" `
    -Component "Operations" `
    -Behaviour "Streaming" `
    -Relationships "upstream:order_system,DS024" `
    -AssociatedId "FUL-001" `
    -Name "Order Fulfillment Tracking" `
    -Description "Real-time order fulfillment tracking from order placement through delivery. Monitors pick, pack, ship times, carrier performance, and delivery success rates." `
    -Tags "fulfillment,orders,shipping,logistics" `
    -Status "Active" `
    -CreatedBy "logistics" `
    -RelatedIds "DS001,DS024" `
    -Priority "High" `
    -SchedulingInfo "Real-time streaming" `
    -SlaConstraints "SLA-1H" `
    -OwnershipDetails "logistics,customer_service" `
    -AuditTrail "Avg fulfillment time: 18 hours - On-time delivery: 94.7% - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS026" `
    -Author "Charles Walker" `
    -MetadataType "Quality Control" `
    -Component "Operations" `
    -Behaviour "Batch" `
    -Relationships "upstream:manufacturing_system,DS012" `
    -AssociatedId "QC-001" `
    -Name "Quality Control Metrics" `
    -Description "Product quality metrics including defect rates, inspection results, returns due to quality, and supplier quality scores. Tracks quality trends and identifies improvement opportunities." `
    -Tags "quality,defects,inspection,manufacturing" `
    -Status "Active" `
    -CreatedBy "quality_assurance" `
    -RelatedIds "DS012,DS015,DS024" `
    -Priority "High" `
    -SchedulingInfo "Daily at 10:00 UTC" `
    -SlaConstraints "SLA-12H" `
    -OwnershipDetails "quality_assurance,manufacturing" `
    -AuditTrail "Defect rate: 0.3% - First-pass yield: 99.1% - Six Sigma level - $currentDate") {
    $successCount++
}

# ============================================================================
# CATEGORY 7: HR & PEOPLE (2 datasets)
# ============================================================================
Write-Status "Inserting HR & People datasets..."

if (Insert-Dataset `
    -Id "DS027" `
    -Author "Jessica Hall" `
    -MetadataType "HR Analytics" `
    -Component "Human Resources" `
    -Behaviour "Batch" `
    -Relationships "upstream:hris_system" `
    -AssociatedId "HR-001" `
    -Name "Employee Demographics & Metrics" `
    -Description "Employee demographic data, headcount, turnover rates, tenure, department distribution, and diversity metrics. Used for workforce planning and HR analytics. PII protected and access-controlled." `
    -Tags "hr,employees,demographics,diversity" `
    -Status "Active" `
    -CreatedBy "hr_analytics" `
    -RelatedIds "DS028,DS003" `
    -Priority "Critical" `
    -SchedulingInfo "Weekly on Friday" `
    -SlaConstraints "SLA-24H" `
    -OwnershipDetails "hr_team,executive_team" `
    -AuditTrail "GDPR/CCPA compliant - PII encrypted - 847 employees - Turnover: 8.2% - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS028" `
    -Author "Matthew Allen" `
    -MetadataType "Talent Acquisition" `
    -Component "Human Resources" `
    -Behaviour "Batch" `
    -Relationships "upstream:ats_system" `
    -AssociatedId "REC-001" `
    -Name "Recruiting Pipeline Metrics" `
    -Description "Recruiting funnel metrics including applications, interviews, offers, acceptances, and time-to-hire by role and department. Tracks recruiter efficiency and candidate quality." `
    -Tags "recruiting,hiring,pipeline,talent" `
    -Status "Active" `
    -CreatedBy "recruiting" `
    -RelatedIds "DS027" `
    -Priority "High" `
    -SchedulingInfo "Weekly on Monday" `
    -SlaConstraints "SLA-24H" `
    -OwnershipDetails "recruiting,hiring_managers" `
    -AuditTrail "Greenhouse ATS - Time to hire: 45 days - Offer acceptance: 87% - $currentDate") {
    $successCount++
}

# ============================================================================
# CATEGORY 8: DATA SCIENCE & ML (2 datasets)
# ============================================================================
Write-Status "Inserting Data Science & ML datasets..."

if (Insert-Dataset `
    -Id "DS029" `
    -Author "Elizabeth Young" `
    -MetadataType "Machine Learning" `
    -Component "Data Science" `
    -Behaviour "Batch" `
    -Relationships "upstream:DS001,DS007,DS008" `
    -AssociatedId "ML-001" `
    -Name "Churn Prediction Model Features" `
    -Description "Feature engineering dataset for customer churn prediction model. Combines behavioral, transactional, and engagement signals into 247 features used for model training and inference." `
    -Tags "ml,features,churn,prediction" `
    -Status "Active" `
    -CreatedBy "data_science" `
    -RelatedIds "DS007,DS008,DS011" `
    -Priority "High" `
    -SchedulingInfo "Daily at 11:00 UTC" `
    -SlaConstraints "SLA-12H" `
    -OwnershipDetails "data_science,ml_engineering" `
    -AuditTrail "Random Forest + XGBoost ensemble - AUC: 0.89 - Retrained monthly - $currentDate") {
    $successCount++
}

if (Insert-Dataset `
    -Id "DS030" `
    -Author "Joseph King" `
    -MetadataType "Recommendation Engine" `
    -Component "Data Science" `
    -Behaviour "Streaming" `
    -Relationships "upstream:DS012,DS013,DS001" `
    -AssociatedId "REC-002" `
    -Name "Product Recommendation Scores" `
    -Description "Real-time product recommendation scores using collaborative filtering and content-based algorithms. Powers personalized product suggestions across web, mobile, and email channels." `
    -Tags "recommendations,ml,personalization,collaborative-filtering" `
    -Status "Active" `
    -CreatedBy "ml_engineering" `
    -RelatedIds "DS012,DS013,DS007" `
    -Priority "Critical" `
    -SchedulingInfo "Real-time streaming" `
    -SlaConstraints "SLA-500MS" `
    -OwnershipDetails "ml_engineering,product_team" `
    -AuditTrail "Matrix factorization + deep learning hybrid - CTR lift: 23% - $currentDate") {
    $successCount++
}

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                    INSERTION SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Status "Total datasets: $totalDatasets"
Write-Success "Successfully inserted: $successCount"

if ($successCount -eq $totalDatasets) {
    Write-Success "All datasets inserted successfully!"
} else {
    $failed = $totalDatasets - $successCount
    Write-Warning-Message "Failed to insert: $failed datasets"
}

Write-Host ""
Write-Status "Dataset categories created:"
Write-Host "  • Sales & Revenue: 6 datasets"
Write-Host "  • Customer Data: 5 datasets"
Write-Host "  • Product Data: 4 datasets"
Write-Host "  • Marketing: 4 datasets"
Write-Host "  • Finance: 4 datasets"
Write-Host "  • Operations: 3 datasets"
Write-Host "  • HR & People: 2 datasets"
Write-Host "  • Data Science & ML: 2 datasets"
Write-Host ""
Write-Status "You can now search for these datasets in Amundsen!"
Write-Status "Example searches: 'sales', 'customer', 'ml', 'forecast', 'churn'"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan