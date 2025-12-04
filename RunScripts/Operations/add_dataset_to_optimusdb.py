#!/usr/bin/env python3
"""
Add Datasets to OptimusDB Datacatalog

This script helps you easily add datasets to OptimusDB so they appear in Amundsen.

Usage:
    python add_dataset_to_optimusdb.py

Environment Variables:
    OPTIMUSDB_URL - OptimusDB URL (default: http://optimusdb1:8089)
"""

import os
import sys
import json
import requests
from typing import Dict, List, Optional


class OptimusDBCatalogManager:
    """Manage datasets in OptimusDB datacatalog"""

    def __init__(self, optimusdb_url: str = None):
        self.optimusdb_url = optimusdb_url or os.environ.get(
            'OPTIMUSDB_URL',
            'http://optimusdb1:8089'
        )
        self.command_endpoint = f"{self.optimusdb_url}/swarmkb/command"
        print(f"OptimusDB URL: {self.optimusdb_url}")

    def execute_sql(self, sql: str) -> Dict:
        """Execute SQL against OptimusDB"""
        payload = {
            "method": {"argcnt": 2, "cmd": "sqldml"},
            "args": ["dummy1", "dummy2"],
            "dstype": "dsswres",
            "sqldml": sql,
            "graph_traversal": [{}],
            "criteria": []
        }

        try:
            response = requests.post(self.command_endpoint, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to OptimusDB at {self.optimusdb_url}")
            print("   Make sure OptimusDB is running")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error executing SQL: {e}")
            return {}

    def create_datacatalog_table(self):
        """Create datacatalog table if it doesn't exist"""
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
            lineage_upstream TEXT,
            lineage_downstream TEXT,
            statistics TEXT,
            generation_code TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """

        print("Creating datacatalog table if not exists...")
        result = self.execute_sql(sql)
        print("✓ Datacatalog table ready")
        return result

    def add_dataset(
            self,
            name: str,
            schema: str = "default",
            database: str = "optimusdb",
            description: str = "",
            tags: List[str] = None,
            owner: str = "system",
            column_descriptions: Dict[str, str] = None,
            statistics: List[Dict] = None,
            generation_code: str = "",
            owners: List[str] = None
    ) -> Dict:
        """
        Add a dataset to datacatalog

        Args:
            name: Dataset name (e.g., "user_events")
            schema: Schema/namespace (e.g., "analytics", "production")
            database: Database name (default: "optimusdb")
            description: Dataset description
            tags: List of tags (e.g., ["pii", "analytics", "daily"])
            owner: Primary owner email
            column_descriptions: Dict of column_name -> description
            statistics: List of stat dicts [{"stat_type": "row_count", "stat_val": "1000"}]
            generation_code: SQL/DDL that creates this dataset
            owners: List of owner emails
        """

        dataset_id = f"{schema}.{name}"

        # Prepare tags
        tags_str = ",".join(tags) if tags else ""

        # Prepare owners
        if owners:
            owners_str = ",".join(owners)
        else:
            owners_str = owner

        # Prepare column descriptions as JSON
        col_desc_json = ""
        if column_descriptions:
            col_desc_json = json.dumps(column_descriptions).replace("'", "''")

        # Prepare statistics as JSON
        stats_json = ""
        if statistics:
            stats_json = json.dumps(statistics).replace("'", "''")

        # Escape single quotes in strings
        description = description.replace("'", "''")
        generation_code = generation_code.replace("'", "''")

        # Build SQL
        sql = f"""
        INSERT INTO datacatalog (
            _id, name, metadata_type, component,
            description, tags, created_by, owners,
            column_descriptions, statistics, generation_code
        ) VALUES (
            '{dataset_id}',
            '{name}',
            '{schema}',
            '{database}',
            '{description}',
            '{tags_str}',
            '{owner}',
            '{owners_str}',
            '{col_desc_json}',
            '{stats_json}',
            '{generation_code}'
        );
        """

        print(f"\n📊 Adding dataset: {dataset_id}")
        print(f"   Schema: {schema}")
        print(f"   Description: {description or '(none)'}")
        print(f"   Tags: {tags_str or '(none)'}")

        result = self.execute_sql(sql)

        if result.get("data"):
            print(f"✓ Dataset added successfully!")
        else:
            print(f"⚠ Dataset might already exist or there was an error")
            print(f"   Response: {result}")

        return result

    def list_datasets(self, limit: int = 10) -> List[Dict]:
        """List datasets in datacatalog"""
        sql = f"SELECT * FROM datacatalog LIMIT {limit};"
        result = self.execute_sql(sql)

        records = result.get("data", {}).get("records", [])

        print(f"\n📋 Datasets in datacatalog ({len(records)} shown):")
        for i, record in enumerate(records, 1):
            name = record.get("name", "unknown")
            schema = record.get("metadata_type", "default")
            desc = record.get("description", "")[:50]
            print(f"   {i}. {schema}.{name}")
            if desc:
                print(f"      {desc}...")

        return records

    def delete_dataset(self, name: str, schema: str = "default"):
        """Delete a dataset from datacatalog"""
        dataset_id = f"{schema}.{name}"
        sql = f"DELETE FROM datacatalog WHERE _id = '{dataset_id}';"

        print(f"🗑️  Deleting dataset: {dataset_id}")
        result = self.execute_sql(sql)
        print("✓ Dataset deleted")
        return result

    def verify_in_amundsen(self, name: str, amundsen_url: str = "http://localhost:5002"):
        """Verify dataset appears in Amundsen"""
        print(f"\n🔍 Verifying in Amundsen...")

        # Search for the dataset
        try:
            response = requests.post(
                f"{amundsen_url}/search/table",
                json={"query_term": name, "page_index": 0},
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])

                found = False
                for result in results:
                    if name.lower() in result.get("name", "").lower():
                        print(f"✓ Dataset found in Amundsen!")
                        print(f"   Name: {result.get('name')}")
                        print(f"   Key: {result.get('key')}")
                        print(f"   URL: http://localhost:5000/table_detail/{result.get('cluster')}/{result.get('database')}/{result.get('schema')}/{result.get('name')}")
                        found = True
                        break

                if not found:
                    print(f"⚠ Dataset not found in search results")
                    print(f"   Total results: {data.get('total_results', 0)}")
                    print(f"   Try searching in the UI: http://localhost:5000")
            elif response.status_code == 405:
                print(f"⚠ Search endpoint not available (405)")
                print(f"   You need to add search methods - see QUICK_START.md")
            else:
                print(f"⚠ Amundsen returned HTTP {response.status_code}")

        except requests.exceptions.ConnectionError:
            print(f"⚠ Cannot connect to Amundsen at {amundsen_url}")
            print(f"   Make sure Amundsen is running")
        except Exception as e:
            print(f"⚠ Error verifying in Amundsen: {e}")


def main():
    """Main function with example usage"""

    manager = OptimusDBCatalogManager()

    # Create datacatalog table
    manager.create_datacatalog_table()

    print("\n" + "="*70)
    print("OptimusDB Dataset Manager")
    print("="*70)

    # Example 1: Simple dataset
    print("\n📝 Example 1: Adding a simple dataset")
    manager.add_dataset(
        name="user_events",
        schema="analytics",
        description="User behavior events from web and mobile applications",
        tags=["events", "analytics", "user-data"],
        owner="analytics-team@company.com"
    )

    # Example 2: Dataset with column descriptions
    print("\n📝 Example 2: Adding dataset with column descriptions")
    manager.add_dataset(
        name="transactions",
        schema="finance",
        description="Financial transactions with full audit trail",
        tags=["pii", "financial", "critical", "gdpr"],
        owner="finance-team@company.com",
        owners=["finance-team@company.com", "compliance@company.com"],
        column_descriptions={
            "transaction_id": "Unique identifier for the transaction",
            "user_id": "User who initiated the transaction",
            "amount": "Transaction amount in USD",
            "currency": "Transaction currency code (ISO 4217)",
            "timestamp": "Transaction timestamp in UTC",
            "status": "Transaction status (pending, completed, failed)"
        },
        statistics=[
            {"stat_type": "row_count", "stat_val": "15000000"},
            {"stat_type": "col_count", "stat_val": "12"}
        ]
    )

    # Example 3: Dataset with generation code
    print("\n📝 Example 3: Adding dataset with generation code")
    manager.add_dataset(
        name="daily_metrics",
        schema="reporting",
        description="Daily aggregated business metrics",
        tags=["metrics", "daily", "reporting"],
        owner="data-team@company.com",
        generation_code="""
        CREATE TABLE daily_metrics AS
        SELECT 
            DATE(timestamp) as date,
            COUNT(DISTINCT user_id) as daily_active_users,
            SUM(revenue) as daily_revenue,
            AVG(session_duration) as avg_session_duration
        FROM user_events
        GROUP BY DATE(timestamp);
        """
    )

    # List all datasets
    print("\n" + "="*70)
    manager.list_datasets(limit=20)

    # Verify in Amundsen
    print("\n" + "="*70)
    manager.verify_in_amundsen("user_events")
    manager.verify_in_amundsen("transactions")

    print("\n" + "="*70)
    print("✅ Done!")
    print("\nYour datasets should now be visible in Amundsen:")
    print("  - Search: http://localhost:5000")
    print("  - Popular tables: http://localhost:5000")
    print("\nTo add more datasets, modify this script or use the manager:")
    print("  manager.add_dataset(name='...', schema='...', ...)")
    print("="*70)


if __name__ == "__main__":
    main()