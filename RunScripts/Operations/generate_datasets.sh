#!/bin/bash
#
# OptimusDB Dataset Generator - Bash Version
# Inserts 30 diverse datasets with realistic metadata into OptimusDB
#
# Usage: ./generate_datasets.sh [optimusdb_url]
# Example: ./generate_datasets.sh http://localhost:8089

set -e

# Configuration
OPTIMUSDB_URL="${1:-http://localhost:8089}"
API_ENDPOINT="${OPTIMUSDB_URL}/swarmkb/command"
TIMESTAMP=$(date +%s)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to insert dataset into OptimusDB
insert_dataset() {
    local id=$1
    local author=$2
    local metadata_type=$3
    local component=$4
    local behaviour=$5
    local relationships=$6
    local associated_id=$7
    local name=$8
    local description=$9
    local tags=${10}
    local status=${11}
    local created_by=${12}
    local related_ids=${13}
    local priority=${14}
    local scheduling_info=${15}
    local sla_constraints=${16}
    local ownership_details=${17}
    local audit_trail=${18}

    # Escape single quotes for SQL
    description=$(echo "$description" | sed "s/'/''/g")

    local sql="INSERT INTO datacatalog (_id, author, metadata_type, component, behaviour, relationships, associated_id, name, description, tags, status, created_by, created_at, updated_at, related_ids, priority, scheduling_info, sla_constraints, ownership_details, audit_trail) VALUES ('${id}', '${author}', '${metadata_type}', '${component}', '${behaviour}', '${relationships}', '${associated_id}', '${name}', '${description}', '${tags}', '${status}', '${created_by}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '${related_ids}', '${priority}', '${scheduling_info}', '${sla_constraints}', '${ownership_details}', '${audit_trail}');"

    local payload=$(cat <<EOF
{
    "method": {"argcnt": 2, "cmd": "sqldml"},
    "args": ["dummy1", "dummy2"],
    "dstype": "dsswres",
    "sqldml": "${sql}",
    "graph_traversal": [{}],
    "criteria": []
}
EOF
)

    # Send request to OptimusDB
    response=$(curl -s -w "\n%{http_code}" -X POST "${API_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "${payload}")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 200 ]; then
        print_success "Inserted dataset: ${name}"
        return 0
    else
        print_error "Failed to insert ${name} (HTTP ${http_code})"
        echo "Response: ${body}"
        return 1
    fi
}

# Print banner
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "      OptimusDB Dataset Generator - 30 Diverse Datasets"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
print_status "Target OptimusDB: ${OPTIMUSDB_URL}"
print_status "Timestamp: ${TIMESTAMP}"
echo ""

# Counter for successful insertions
success_count=0
total_datasets=30

# ============================================================================
# CATEGORY 1: SALES & REVENUE (6 datasets)
# ============================================================================
print_status "Inserting Sales & Revenue datasets..."

insert_dataset \
    "DS001" \
    "Sarah Johnson" \
    "Sales Analytics" \
    "Sales" \
    "Batch" \
    "upstream:crm_raw,downstream:revenue_dashboard" \
    "REV-001" \
    "Daily Sales Transactions" \
    "Daily transactional sales data including product SKU, quantity, revenue, discount applied, and customer segment. Updated nightly via ETL pipeline from Salesforce CRM." \
    "sales,revenue,transactions,daily" \
    "Active" \
    "sales_team" \
    "DS002,DS003" \
    "Critical" \
    "Daily at 02:00 UTC" \
    "SLA-24H" \
    "sales_team,finance_team" \
    "Created via automated ETL pipeline - Last modified by Sarah Johnson on $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS002" \
    "Michael Chen" \
    "Sales Analytics" \
    "Sales" \
    "Streaming" \
    "upstream:DS001,downstream:sales_forecast" \
    "REV-002" \
    "Regional Sales Performance" \
    "Aggregated sales performance metrics by region including total revenue, average deal size, conversion rates, and year-over-year growth. Used for executive dashboards and regional manager KPIs." \
    "sales,regional,performance,kpi" \
    "Active" \
    "michael_chen" \
    "DS001,DS007" \
    "High" \
    "Hourly" \
    "SLA-4H" \
    "sales_ops,regional_managers" \
    "Migrated from legacy SQL Server - Data quality validated $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS003" \
    "Emily Rodriguez" \
    "Sales Analytics" \
    "Sales" \
    "Batch" \
    "upstream:DS001,downstream:commission_calc" \
    "REV-003" \
    "Sales Representative Metrics" \
    "Individual sales rep performance including deals closed, revenue generated, pipeline velocity, and quota attainment. Powers commission calculations and performance reviews." \
    "sales,reps,performance,commission" \
    "Active" \
    "hr_team" \
    "DS001,DS002" \
    "High" \
    "Weekly on Monday" \
    "SLA-12H" \
    "hr_team,sales_ops" \
    "GDPR compliant - PII anonymized - Audited $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS004" \
    "David Park" \
    "Sales Forecasting" \
    "Sales" \
    "Batch" \
    "upstream:DS001,DS002" \
    "FOR-001" \
    "Quarterly Sales Forecast" \
    "ML-based sales forecast combining historical trends, pipeline data, market indicators, and seasonality factors. Generates quarterly predictions with confidence intervals for strategic planning." \
    "forecast,ml,quarterly,planning" \
    "Active" \
    "data_science" \
    "DS001,DS002,DS005" \
    "Critical" \
    "Monthly on 1st" \
    "SLA-48H" \
    "data_science,finance" \
    "XGBoost model - Accuracy: 92% - Last retrained $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS005" \
    "Lisa Wang" \
    "Sales Analytics" \
    "Sales" \
    "Passive" \
    "upstream:external_market_data" \
    "MKT-001" \
    "Market Share Analysis" \
    "Competitive market share data combining internal sales with external market research. Tracks market position, competitor activity, and category trends across key verticals." \
    "market,competitive,analysis,intelligence" \
    "Active" \
    "strategy_team" \
    "DS001,DS002" \
    "Medium" \
    "Quarterly" \
    "SLA-72H" \
    "strategy_team,product_team" \
    "Third-party data licensed from Gartner - Contract expires 2026-12-31" && ((success_count++))

insert_dataset \
    "DS006" \
    "James Anderson" \
    "Sales Pipeline" \
    "Sales" \
    "Streaming" \
    "upstream:crm_opportunities" \
    "PIP-001" \
    "Live Sales Pipeline" \
    "Real-time sales pipeline data showing all open opportunities, stages, deal values, close probabilities, and expected close dates. Critical for revenue forecasting and team planning." \
    "pipeline,opportunities,real-time,crm" \
    "Active" \
    "sales_ops" \
    "DS001,DS004" \
    "Critical" \
    "Real-time streaming" \
    "SLA-1H" \
    "sales_ops,executive_team" \
    "Synchronized with Salesforce every 15 minutes - Last sync $(date +%Y-%m-%d)" && ((success_count++))

# ============================================================================
# CATEGORY 2: CUSTOMER DATA (5 datasets)
# ============================================================================
print_status "Inserting Customer Data datasets..."

insert_dataset \
    "DS007" \
    "Rachel Kim" \
    "Customer Master" \
    "Customer" \
    "Batch" \
    "upstream:crm_contacts,downstream:customer_360" \
    "CUS-001" \
    "Customer Master Data" \
    "Golden record customer master data including demographics, contact info, preferences, segment classification, and lifecycle stage. Single source of truth for all customer information." \
    "customer,master,mdm,golden-record" \
    "Active" \
    "data_governance" \
    "DS008,DS009,DS010" \
    "Critical" \
    "Daily at 03:00 UTC" \
    "SLA-8H" \
    "data_governance,customer_success" \
    "MDM system - GDPR compliant - Data quality score: 97.8% - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS008" \
    "Thomas Brown" \
    "Customer Analytics" \
    "Customer" \
    "Batch" \
    "upstream:DS007,web_analytics,support_tickets" \
    "CUS-002" \
    "Customer Engagement Score" \
    "Composite customer engagement score based on product usage, support interactions, NPS feedback, and purchase history. Used to identify at-risk accounts and expansion opportunities." \
    "customer,engagement,score,churn" \
    "Active" \
    "customer_success" \
    "DS007,DS011" \
    "High" \
    "Daily at 05:00 UTC" \
    "SLA-12H" \
    "customer_success,account_management" \
    "Predictive model v2.3 - Churn prediction accuracy: 89% - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS009" \
    "Maria Garcia" \
    "Customer Segmentation" \
    "Customer" \
    "Batch" \
    "upstream:DS007,DS001" \
    "SEG-001" \
    "Customer Segmentation Clusters" \
    "K-means clustering model segmenting customers into 8 distinct groups based on behavior, demographics, and value. Powers personalized marketing campaigns and product recommendations." \
    "segmentation,clustering,ml,marketing" \
    "Active" \
    "marketing_analytics" \
    "DS007,DS008" \
    "Medium" \
    "Weekly on Sunday" \
    "SLA-24H" \
    "marketing_team,product_marketing" \
    "K-means with k=8 - Silhouette score: 0.72 - Last updated $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS010" \
    "Kevin O'Brien" \
    "Customer Support" \
    "Customer" \
    "Streaming" \
    "upstream:zendesk_api,DS007" \
    "SUP-001" \
    "Customer Support Tickets" \
    "Real-time customer support ticket data including issue category, priority, resolution time, customer satisfaction scores, and support agent assignments. Tracks SLA compliance and support quality." \
    "support,tickets,zendesk,sla" \
    "Active" \
    "support_ops" \
    "DS007,DS008" \
    "High" \
    "Real-time" \
    "SLA-2H" \
    "support_ops,customer_success" \
    "Integrated with Zendesk API - Average resolution time: 4.2 hours - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS011" \
    "Jennifer Lee" \
    "Customer Lifecycle" \
    "Customer" \
    "Batch" \
    "upstream:DS007,DS001,DS008" \
    "LIF-001" \
    "Customer Lifetime Value" \
    "Customer lifetime value (CLV) predictions using survival analysis and revenue modeling. Includes historical CLV, predicted CLV, and confidence intervals for strategic customer investment decisions." \
    "clv,lifetime-value,prediction,strategy" \
    "Active" \
    "data_science" \
    "DS007,DS008,DS009" \
    "High" \
    "Monthly on 15th" \
    "SLA-48H" \
    "data_science,finance,strategy" \
    "Survival analysis model - Median CLV: $12,450 - Last calculated $(date +%Y-%m-%d)" && ((success_count++))

# ============================================================================
# CATEGORY 3: PRODUCT DATA (4 datasets)
# ============================================================================
print_status "Inserting Product Data datasets..."

insert_dataset \
    "DS012" \
    "Daniel Martinez" \
    "Product Catalog" \
    "Product" \
    "Batch" \
    "upstream:erp_system,downstream:ecommerce" \
    "PRD-001" \
    "Product Master Catalog" \
    "Complete product catalog with SKUs, descriptions, pricing, categories, attributes, inventory levels, and supplier information. Master reference for all product data across systems." \
    "product,catalog,master,inventory" \
    "Active" \
    "product_team" \
    "DS013,DS014,DS015" \
    "Critical" \
    "Every 4 hours" \
    "SLA-4H" \
    "product_team,supply_chain" \
    "10,247 active SKUs - Last sync with ERP: $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS013" \
    "Amanda White" \
    "Product Analytics" \
    "Product" \
    "Streaming" \
    "upstream:web_analytics,mobile_analytics" \
    "PRD-002" \
    "Product Usage Metrics" \
    "Real-time product usage telemetry including feature adoption, user flows, error rates, performance metrics, and session duration. Powers product roadmap and feature prioritization." \
    "product,usage,analytics,telemetry" \
    "Active" \
    "product_analytics" \
    "DS012,DS018" \
    "High" \
    "Real-time streaming" \
    "SLA-1H" \
    "product_team,engineering" \
    "Segment + Amplitude integration - 2.4M events/day - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS014" \
    "Christopher Davis" \
    "Product Performance" \
    "Product" \
    "Batch" \
    "upstream:DS012,DS001" \
    "PRD-003" \
    "Product Sales Performance" \
    "Product-level sales performance showing revenue, units sold, margins, returns, and inventory turns. Identifies top performers, slow movers, and products needing price adjustments." \
    "product,sales,performance,inventory" \
    "Active" \
    "merchandising" \
    "DS012,DS001,DS002" \
    "High" \
    "Daily at 04:00 UTC" \
    "SLA-8H" \
    "merchandising,supply_chain,finance" \
    "Top 10 products generate 64% of revenue - Analysis date: $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS015" \
    "Nicole Thompson" \
    "Product Reviews" \
    "Product" \
    "Batch" \
    "upstream:review_api,DS012" \
    "REV-004" \
    "Product Reviews & Ratings" \
    "Customer product reviews and ratings aggregated from multiple channels including website, mobile app, and third-party retailers. Includes sentiment analysis and topic extraction." \
    "reviews,ratings,sentiment,feedback" \
    "Active" \
    "product_team" \
    "DS012,DS013" \
    "Medium" \
    "Daily at 06:00 UTC" \
    "SLA-12H" \
    "product_team,marketing" \
    "NLP sentiment analysis - 128,450 reviews analyzed - Average rating: 4.3/5 - $(date +%Y-%m-%d)" && ((success_count++))

# ============================================================================
# CATEGORY 4: MARKETING (4 datasets)
# ============================================================================
print_status "Inserting Marketing datasets..."

insert_dataset \
    "DS016" \
    "Brian Wilson" \
    "Marketing Campaigns" \
    "Marketing" \
    "Batch" \
    "upstream:email_platform,ads_api" \
    "MKT-002" \
    "Campaign Performance Metrics" \
    "Multi-channel marketing campaign performance including email, social, paid search, and display ads. Tracks impressions, clicks, conversions, CAC, and ROI by channel and campaign." \
    "marketing,campaigns,performance,roi" \
    "Active" \
    "marketing_ops" \
    "DS017,DS018,DS007" \
    "High" \
    "Daily at 07:00 UTC" \
    "SLA-8H" \
    "marketing_team,growth_team" \
    "Integrated with HubSpot, Google Ads, Facebook Ads - Overall ROAS: 4.2x - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS017" \
    "Stephanie Miller" \
    "Marketing Attribution" \
    "Marketing" \
    "Batch" \
    "upstream:DS016,DS001,web_analytics" \
    "ATT-001" \
    "Marketing Attribution Model" \
    "Multi-touch attribution model distributing revenue credit across marketing touchpoints. Uses Shapley value algorithm to fairly attribute conversions to email, ads, content, and other channels." \
    "attribution,marketing,ml,shapley" \
    "Active" \
    "marketing_analytics" \
    "DS016,DS001" \
    "High" \
    "Weekly on Tuesday" \
    "SLA-24H" \
    "marketing_analytics,finance" \
    "Shapley attribution model - Email: 32%, Paid: 28%, Organic: 40% - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS018" \
    "Ryan Taylor" \
    "Website Analytics" \
    "Marketing" \
    "Streaming" \
    "upstream:google_analytics_api" \
    "WEB-001" \
    "Website Traffic & Behavior" \
    "Real-time website analytics including sessions, pageviews, bounce rates, conversion funnels, traffic sources, and user journeys. Powers optimization experiments and content strategy." \
    "web,analytics,traffic,conversion" \
    "Active" \
    "growth_team" \
    "DS016,DS013" \
    "High" \
    "Real-time streaming" \
    "SLA-30MIN" \
    "growth_team,product_team" \
    "Google Analytics 4 + custom events - 450K sessions/month - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS019" \
    "Michelle Anderson" \
    "Email Marketing" \
    "Marketing" \
    "Batch" \
    "upstream:email_platform,DS007" \
    "EML-001" \
    "Email Campaign Analytics" \
    "Email marketing performance including send volume, open rates, click rates, unsubscribes, and conversion tracking. Segments analysis by customer cohort and email type." \
    "email,campaigns,engagement,marketing" \
    "Active" \
    "email_marketing" \
    "DS016,DS007" \
    "Medium" \
    "Daily at 08:00 UTC" \
    "SLA-12H" \
    "email_marketing,marketing_ops" \
    "SendGrid platform - Avg open rate: 24.3%, Click rate: 3.8% - $(date +%Y-%m-%d)" && ((success_count++))

# ============================================================================
# CATEGORY 5: FINANCE (4 datasets)
# ============================================================================
print_status "Inserting Finance datasets..."

insert_dataset \
    "DS020" \
    "Robert Johnson" \
    "Financial Reporting" \
    "Finance" \
    "Batch" \
    "upstream:erp_system,DS001" \
    "FIN-001" \
    "Monthly Financial Statements" \
    "Consolidated monthly financial statements including P&L, balance sheet, and cash flow. Combines revenue data with operational expenses for management and board reporting." \
    "finance,reporting,statements,monthly" \
    "Active" \
    "finance_team" \
    "DS021,DS022,DS001" \
    "Critical" \
    "Monthly on 5th" \
    "SLA-72H" \
    "finance_team,executive_team" \
    "SOX compliant - Audited by external firm - FY2024 records - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS021" \
    "Patricia Martinez" \
    "Budget Planning" \
    "Finance" \
    "Passive" \
    "upstream:DS020,DS004" \
    "BUD-001" \
    "Annual Budget & Forecasts" \
    "Annual budget allocations and rolling forecasts by department, cost center, and initiative. Includes variance analysis comparing actuals to plan with monthly re-forecasting." \
    "budget,planning,forecast,variance" \
    "Active" \
    "fp_and_a" \
    "DS020,DS004" \
    "High" \
    "Monthly on 10th" \
    "SLA-48H" \
    "fp_and_a,department_heads" \
    "FY2025 budget approved - Rolling 12-month forecast - Last updated $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS022" \
    "William Clark" \
    "Accounts Receivable" \
    "Finance" \
    "Batch" \
    "upstream:billing_system,DS001" \
    "AR-001" \
    "Accounts Receivable Aging" \
    "Accounts receivable aging report showing outstanding invoices, payment terms, days overdue, and collection risk scores. Tracks DSO and identifies collection priorities." \
    "ar,receivable,aging,collections" \
    "Active" \
    "accounting" \
    "DS001,DS020" \
    "High" \
    "Daily at 09:00 UTC" \
    "SLA-12H" \
    "accounting,finance_ops" \
    "DSO: 42 days - $2.3M outstanding - Collection rate: 96.2% - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS023" \
    "Karen Robinson" \
    "Revenue Recognition" \
    "Finance" \
    "Batch" \
    "upstream:DS001,subscription_system" \
    "REV-005" \
    "Revenue Recognition Schedule" \
    "ASC 606 compliant revenue recognition for subscription and multi-year contracts. Calculates deferred revenue, recognized revenue, and future revenue commitments." \
    "revenue,recognition,asc606,subscription" \
    "Active" \
    "revenue_accounting" \
    "DS001,DS020,DS021" \
    "Critical" \
    "Monthly on 3rd" \
    "SLA-48H" \
    "revenue_accounting,finance_team" \
    "ASC 606 compliant - Deferred revenue: $8.4M - $(date +%Y-%m-%d)" && ((success_count++))

# ============================================================================
# CATEGORY 6: OPERATIONS (3 datasets)
# ============================================================================
print_status "Inserting Operations datasets..."

insert_dataset \
    "DS024" \
    "Steven Harris" \
    "Supply Chain" \
    "Operations" \
    "Batch" \
    "upstream:DS012,supplier_api" \
    "SCM-001" \
    "Supply Chain Inventory" \
    "Multi-location inventory tracking including warehouse levels, in-transit stock, safety stock, reorder points, and lead times. Optimizes inventory investment while preventing stockouts." \
    "supply-chain,inventory,warehouse,stock" \
    "Active" \
    "supply_chain" \
    "DS012,DS014" \
    "Critical" \
    "Every 2 hours" \
    "SLA-2H" \
    "supply_chain,operations" \
    "15 warehouses - Inventory turnover: 8.2x - Fill rate: 98.4% - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS025" \
    "Laura Lewis" \
    "Fulfillment" \
    "Operations" \
    "Streaming" \
    "upstream:order_system,DS024" \
    "FUL-001" \
    "Order Fulfillment Tracking" \
    "Real-time order fulfillment tracking from order placement through delivery. Monitors pick, pack, ship times, carrier performance, and delivery success rates." \
    "fulfillment,orders,shipping,logistics" \
    "Active" \
    "logistics" \
    "DS001,DS024" \
    "High" \
    "Real-time streaming" \
    "SLA-1H" \
    "logistics,customer_service" \
    "Avg fulfillment time: 18 hours - On-time delivery: 94.7% - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS026" \
    "Charles Walker" \
    "Quality Control" \
    "Operations" \
    "Batch" \
    "upstream:manufacturing_system,DS012" \
    "QC-001" \
    "Quality Control Metrics" \
    "Product quality metrics including defect rates, inspection results, returns due to quality, and supplier quality scores. Tracks quality trends and identifies improvement opportunities." \
    "quality,defects,inspection,manufacturing" \
    "Active" \
    "quality_assurance" \
    "DS012,DS015,DS024" \
    "High" \
    "Daily at 10:00 UTC" \
    "SLA-12H" \
    "quality_assurance,manufacturing" \
    "Defect rate: 0.3% - First-pass yield: 99.1% - Six Sigma level - $(date +%Y-%m-%d)" && ((success_count++))

# ============================================================================
# CATEGORY 7: HR & PEOPLE (2 datasets)
# ============================================================================
print_status "Inserting HR & People datasets..."

insert_dataset \
    "DS027" \
    "Jessica Hall" \
    "HR Analytics" \
    "Human Resources" \
    "Batch" \
    "upstream:hris_system" \
    "HR-001" \
    "Employee Demographics & Metrics" \
    "Employee demographic data, headcount, turnover rates, tenure, department distribution, and diversity metrics. Used for workforce planning and HR analytics. PII protected and access-controlled." \
    "hr,employees,demographics,diversity" \
    "Active" \
    "hr_analytics" \
    "DS028,DS003" \
    "Critical" \
    "Weekly on Friday" \
    "SLA-24H" \
    "hr_team,executive_team" \
    "GDPR/CCPA compliant - PII encrypted - 847 employees - Turnover: 8.2% - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS028" \
    "Matthew Allen" \
    "Talent Acquisition" \
    "Human Resources" \
    "Batch" \
    "upstream:ats_system" \
    "REC-001" \
    "Recruiting Pipeline Metrics" \
    "Recruiting funnel metrics including applications, interviews, offers, acceptances, and time-to-hire by role and department. Tracks recruiter efficiency and candidate quality." \
    "recruiting,hiring,pipeline,talent" \
    "Active" \
    "recruiting" \
    "DS027" \
    "High" \
    "Weekly on Monday" \
    "SLA-24H" \
    "recruiting,hiring_managers" \
    "Greenhouse ATS - Time to hire: 45 days - Offer acceptance: 87% - $(date +%Y-%m-%d)" && ((success_count++))

# ============================================================================
# CATEGORY 8: DATA SCIENCE & ML (2 datasets)
# ============================================================================
print_status "Inserting Data Science & ML datasets..."

insert_dataset \
    "DS029" \
    "Elizabeth Young" \
    "Machine Learning" \
    "Data Science" \
    "Batch" \
    "upstream:DS001,DS007,DS008" \
    "ML-001" \
    "Churn Prediction Model Features" \
    "Feature engineering dataset for customer churn prediction model. Combines behavioral, transactional, and engagement signals into 247 features used for model training and inference." \
    "ml,features,churn,prediction" \
    "Active" \
    "data_science" \
    "DS007,DS008,DS011" \
    "High" \
    "Daily at 11:00 UTC" \
    "SLA-12H" \
    "data_science,ml_engineering" \
    "Random Forest + XGBoost ensemble - AUC: 0.89 - Retrained monthly - $(date +%Y-%m-%d)" && ((success_count++))

insert_dataset \
    "DS030" \
    "Joseph King" \
    "Recommendation Engine" \
    "Data Science" \
    "Streaming" \
    "upstream:DS012,DS013,DS001" \
    "REC-002" \
    "Product Recommendation Scores" \
    "Real-time product recommendation scores using collaborative filtering and content-based algorithms. Powers personalized product suggestions across web, mobile, and email channels." \
    "recommendations,ml,personalization,collaborative-filtering" \
    "Active" \
    "ml_engineering" \
    "DS012,DS013,DS007" \
    "Critical" \
    "Real-time streaming" \
    "SLA-500MS" \
    "ml_engineering,product_team" \
    "Matrix factorization + deep learning hybrid - CTR lift: 23% - $(date +%Y-%m-%d)" && ((success_count++))

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "                    INSERTION SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
print_status "Total datasets: ${total_datasets}"
print_success "Successfully inserted: ${success_count}"

if [ $success_count -eq $total_datasets ]; then
    print_success "All datasets inserted successfully!"
else
    failed=$((total_datasets - success_count))
    print_warning "Failed to insert: ${failed} datasets"
fi

echo ""
print_status "Dataset categories created:"
echo "  • Sales & Revenue: 6 datasets"
echo "  • Customer Data: 5 datasets"
echo "  • Product Data: 4 datasets"
echo "  • Marketing: 4 datasets"
echo "  • Finance: 4 datasets"
echo "  • Operations: 3 datasets"
echo "  • HR & People: 2 datasets"
echo "  • Data Science & ML: 2 datasets"
echo ""
print_status "You can now search for these datasets in Amundsen!"
print_status "Example searches: 'sales', 'customer', 'ml', 'forecast', 'churn'"
echo ""
echo "═══════════════════════════════════════════════════════════════════"