#!/usr/bin/env python3
"""
Import Datasets from CSV to OptimusDB

This script reads a CSV file and bulk imports datasets into OptimusDB datacatalog.

CSV Format:
    name,schema,database,description,tags,owner
    user_events,analytics,optimusdb,User behavior events,events;analytics,data-team
    transactions,finance,optimusdb,Financial transactions,pii;financial,finance-team

Usage:
    python import_datasets_from_csv.py datasets.csv
    python import_datasets_from_csv.py datasets.csv --optimusdb-url http://optimusdb1:8089
"""

import sys
import csv
import argparse
import requests
from typing import List, Dict


def execute_sql(sql: str, optimusdb_url: str) -> Dict:
    """Execute SQL against OptimusDB"""
    command_url = f"{optimusdb_url}/swarmkb/command"

    payload = {
        "method": {"argcnt": 2, "cmd": "sqldml"},
        "args": ["dummy1", "dummy2"],
        "dstype": "dsswres",
        "sqldml": sql,
        "graph_traversal": [{}],
        "criteria": []
    }

    try:
        response = requests.post(command_url, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error executing SQL: {e}")
        return {"error": str(e)}


def create_datacatalog_table(optimusdb_url: str):
    """Ensure datacatalog table exists"""
    sql = """
    CREATE TABLE IF NOT EXISTS datacatalog (
        _id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        metadata_type VARCHAR(255) DEFAULT 'default',
        component VARCHAR(255) DEFAULT 'optimusdb',
        description TEXT,
        tags VARCHAR(1000),
        created_by VARCHAR(255),
        owners VARCHAR(1000),
        column_descriptions TEXT,
        badges VARCHAR(1000),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    print("Ensuring datacatalog table exists...")
    execute_sql(sql, optimusdb_url)
    print("✓ Table ready\n")


def import_dataset(row: Dict, optimusdb_url: str) -> bool:
    """Import a single dataset"""

    # Required fields
    name = row.get('name', '').strip()
    schema = row.get('schema', 'default').strip()

    if not name:
        print(f"⚠ Skipping row - missing name: {row}")
        return False

    # Optional fields
    database = row.get('database', 'optimusdb').strip()
    description = row.get('description', '').strip().replace("'", "''")
    tags = row.get('tags', '').strip().replace(';', ',')  # Support both ; and , separators
    owner = row.get('owner', 'system').strip()
    owners = row.get('owners', owner).strip()

    dataset_id = f"{schema}.{name}"

    sql = f"""
    INSERT INTO datacatalog (
        _id, name, metadata_type, component,
        description, tags, created_by, owners
    ) VALUES (
        '{dataset_id}',
        '{name}',
        '{schema}',
        '{database}',
        '{description}',
        '{tags}',
        '{owner}',
        '{owners}'
    );
    """

    print(f"  Adding: {dataset_id}")
    result = execute_sql(sql, optimusdb_url)

    if result.get("error"):
        print(f"    ⚠ Error: {result['error']}")
        return False

    print(f"    ✓ Added")
    return True


def import_from_csv(csv_file: str, optimusdb_url: str):
    """Import all datasets from CSV file"""

    print(f"Reading CSV file: {csv_file}\n")

    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            # Check required columns
            required_columns = {'name'}
            if not required_columns.issubset(set(reader.fieldnames)):
                print(f"❌ CSV must have at least these columns: {required_columns}")
                print(f"   Found columns: {reader.fieldnames}")
                sys.exit(1)

            datasets = list(reader)

    except FileNotFoundError:
        print(f"❌ File not found: {csv_file}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        sys.exit(1)

    print(f"Found {len(datasets)} datasets to import\n")

    # Create table
    create_datacatalog_table(optimusdb_url)

    # Import each dataset
    success_count = 0
    for i, row in enumerate(datasets, 1):
        print(f"[{i}/{len(datasets)}]")
        if import_dataset(row, optimusdb_url):
            success_count += 1
        print()

    # Summary
    print("="*70)
    print(f"Import complete!")
    print(f"  Total datasets: {len(datasets)}")
    print(f"  Successfully imported: {success_count}")
    print(f"  Failed: {len(datasets) - success_count}")
    print("="*70)
    print("\nYour datasets should now be visible in Amundsen:")
    print("  - Search: http://localhost:5000")
    print("  - API: curl http://localhost:5002/popular_tables")


def create_sample_csv(filename: str = "sample_datasets.csv"):
    """Create a sample CSV file"""

    sample_data = [
        ["name", "schema", "database", "description", "tags", "owner"],
        ["user_events", "analytics", "optimusdb", "User behavior events from web and mobile", "events;analytics;user-data", "analytics-team@company.com"],
        ["page_views", "analytics", "optimusdb", "Page view tracking data", "events;analytics;web", "analytics-team@company.com"],
        ["transactions", "finance", "optimusdb", "Financial transactions with audit trail", "pii;financial;critical", "finance-team@company.com"],
        ["customer_profiles", "crm", "optimusdb", "Customer profile and contact information", "pii;customers;crm", "crm-team@company.com"],
        ["product_catalog", "ecommerce", "optimusdb", "Product listings and inventory", "products;ecommerce;inventory", "product-team@company.com"],
        ["click_events", "analytics", "optimusdb", "User clickstream events", "events;analytics;clickstream", "analytics-team@company.com"],
        ["orders", "ecommerce", "optimusdb", "Customer order data", "orders;ecommerce;transactions", "ecommerce-team@company.com"],
        ["user_sessions", "analytics", "optimusdb", "User session tracking with engagement metrics", "sessions;analytics;engagement", "analytics-team@company.com"],
        ["feature_store", "ml", "optimusdb", "ML feature store for model training", "ml;features;training", "ml-team@company.com"],
        ["daily_metrics", "reporting", "optimusdb", "Daily aggregated business metrics", "metrics;daily;reporting", "data-team@company.com"]
    ]

    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(sample_data)

    print(f"✓ Created sample CSV file: {filename}")
    print(f"  Contains {len(sample_data)-1} example datasets")
    print(f"\nTo import this file, run:")
    print(f"  python import_datasets_from_csv.py {filename}")


def main():
    parser = argparse.ArgumentParser(
        description="Import datasets from CSV to OptimusDB datacatalog"
    )
    parser.add_argument(
        'csv_file',
        nargs='?',
        help='CSV file to import (or use --create-sample)'
    )
    parser.add_argument(
        '--optimusdb-url',
        default='http://optimusdb1:8089',
        help='OptimusDB URL (default: http://optimusdb1:8089)'
    )
    parser.add_argument(
        '--create-sample',
        action='store_true',
        help='Create a sample CSV file'
    )

    args = parser.parse_args()

    if args.create_sample:
        create_sample_csv()
        return

    if not args.csv_file:
        print("Error: Please provide a CSV file or use --create-sample")
        parser.print_help()
        sys.exit(1)

    print("\n" + "="*70)
    print("OptimusDB Dataset CSV Import")
    print("="*70 + "\n")

    import_from_csv(args.csv_file, args.optimusdb_url)


if __name__ == "__main__":
    main()