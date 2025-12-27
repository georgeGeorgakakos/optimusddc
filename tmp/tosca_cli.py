#!/usr/bin/env python3
"""
Tosca Upload CLI
================
Command-line interface for Tosca Python client.

Usage:
    python tosca_cli.py upload-result --test-case TC-001 --status Passed --duration 120
    python tosca_cli.py upload-batch --file results.json
    python tosca_cli.py query --status Failed --start-date 2025-01-01
    python tosca_cli.py trigger-execution --execution-list EL-001
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from tosca_client import ToscaClient, create_client_from_env, ToscaClientError


def upload_result(args):
    """Upload single test result"""
    client = create_client_from_env()

    try:
        result = client.upload_test_result(
            test_case_id=args.test_case,
            status=args.status,
            duration=args.duration,
            execution_user=args.user,
            error_message=args.error_message,
            attachments=args.attachments
        )

        print(f"✅ Result uploaded successfully!")
        print(f"Result ID: {result.get('resultId')}")
        print(json.dumps(result, indent=2))

    except ToscaClientError as e:
        print(f"❌ Upload failed: {e}", file=sys.stderr)
        sys.exit(1)


def upload_batch(args):
    """Upload batch of test results"""
    client = create_client_from_env()

    # Read results from file
    try:
        with open(args.file, 'r') as f:
            results = json.load(f)
    except FileNotFoundError:
        print(f"❌ File not found: {args.file}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        response = client.upload_batch_results(results)

        print(f"✅ Batch uploaded successfully!")
        print(f"Total: {response.get('totalCount', len(results))}")
        print(f"Succeeded: {response.get('successCount', 0)}")
        print(f"Failed: {response.get('failedCount', 0)}")

    except ToscaClientError as e:
        print(f"❌ Batch upload failed: {e}", file=sys.stderr)
        sys.exit(1)


def query_results(args):
    """Query test results"""
    client = create_client_from_env()

    filters = {}
    if args.test_case:
        filters['testCaseId'] = args.test_case
    if args.status:
        filters['status'] = args.status

    try:
        results = client.query_results(
            filters=filters,
            start_date=args.start_date,
            end_date=args.end_date,
            limit=args.limit
        )

        print(f"✅ Found {results.get('totalCount', 0)} results")

        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"Results saved to: {args.output}")
        else:
            print(json.dumps(results, indent=2))

    except ToscaClientError as e:
        print(f"❌ Query failed: {e}", file=sys.stderr)
        sys.exit(1)


def trigger_execution(args):
    """Trigger test execution"""
    client = create_client_from_env()

    parameters = {}
    if args.parameters:
        try:
            parameters = json.loads(args.parameters)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid parameters JSON: {e}", file=sys.stderr)
            sys.exit(1)

    try:
        response = client.trigger_execution(
            execution_list_id=args.execution_list,
            agents=args.agents,
            parameters=parameters if parameters else None
        )

        print(f"✅ Execution triggered successfully!")
        print(f"Execution ID: {response.get('executionId')}")
        print(f"Status: {response.get('status')}")

    except ToscaClientError as e:
        print(f"❌ Execution trigger failed: {e}", file=sys.stderr)
        sys.exit(1)


def get_execution_status(args):
    """Get execution status"""
    client = create_client_from_env()

    try:
        status = client.get_execution_status(args.execution_id)

        print(f"✅ Execution Status:")
        print(f"ID: {status.get('executionId')}")
        print(f"Status: {status.get('status')}")
        print(f"Progress: {status.get('progress', 0)}%")
        print(f"Started: {status.get('startedAt')}")
        print(f"Finished: {status.get('finishedAt', 'In Progress')}")

        if args.output:
            with open(args.output, 'w') as f:
                json.dump(status, f, indent=2)

    except ToscaClientError as e:
        print(f"❌ Failed to get status: {e}", file=sys.stderr)
        sys.exit(1)


def health_check(args):
    """Check API health"""
    client = create_client_from_env()

    try:
        health = client.health_check()

        if health.get('status') == 'healthy':
            print(f"✅ Tosca API is healthy")
            print(json.dumps(health, indent=2))
        else:
            print(f"⚠️ Tosca API is unhealthy")
            print(json.dumps(health, indent=2))
            sys.exit(1)

    except ToscaClientError as e:
        print(f"❌ Health check failed: {e}", file=sys.stderr)
        sys.exit(1)


def create_test_case(args):
    """Create new test case"""
    client = create_client_from_env()

    tags = args.tags.split(',') if args.tags else None

    try:
        response = client.create_test_case(
            name=args.name,
            description=args.description,
            folder_path=args.folder,
            tags=tags
        )

        print(f"✅ Test case created successfully!")
        print(f"Test Case ID: {response.get('testCaseId')}")
        print(json.dumps(response, indent=2))

    except ToscaClientError as e:
        print(f"❌ Creation failed: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Tosca Upload CLI - Interact with Tosca API"
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Upload Result Command
    upload_parser = subparsers.add_parser('upload-result', help='Upload single test result')
    upload_parser.add_argument('--test-case', required=True, help='Test case ID')
    upload_parser.add_argument('--status', required=True,
                               choices=['Passed', 'Failed', 'Blocked', 'NotExecuted'],
                               help='Test status')
    upload_parser.add_argument('--duration', type=int, help='Duration in seconds')
    upload_parser.add_argument('--user', help='Execution user')
    upload_parser.add_argument('--error-message', help='Error message (for failed tests)')
    upload_parser.add_argument('--attachments', nargs='+', help='Paths to attachment files')
    upload_parser.set_defaults(func=upload_result)

    # Upload Batch Command
    batch_parser = subparsers.add_parser('upload-batch', help='Upload batch of results')
    batch_parser.add_argument('--file', required=True, help='JSON file with results')
    batch_parser.set_defaults(func=upload_batch)

    # Query Command
    query_parser = subparsers.add_parser('query', help='Query test results')
    query_parser.add_argument('--test-case', help='Filter by test case ID')
    query_parser.add_argument('--status', help='Filter by status')
    query_parser.add_argument('--start-date', help='Start date (ISO format)')
    query_parser.add_argument('--end-date', help='End date (ISO format)')
    query_parser.add_argument('--limit', type=int, default=100, help='Max results')
    query_parser.add_argument('--output', help='Output file (JSON)')
    query_parser.set_defaults(func=query_results)

    # Trigger Execution Command
    trigger_parser = subparsers.add_parser('trigger-execution', help='Trigger test execution')
    trigger_parser.add_argument('--execution-list', required=True, help='Execution list ID')
    trigger_parser.add_argument('--agents', nargs='+', help='Agent IDs')
    trigger_parser.add_argument('--parameters', help='Execution parameters (JSON string)')
    trigger_parser.set_defaults(func=trigger_execution)

    # Get Execution Status Command
    status_parser = subparsers.add_parser('execution-status', help='Get execution status')
    status_parser.add_argument('--execution-id', required=True, help='Execution ID')
    status_parser.add_argument('--output', help='Output file (JSON)')
    status_parser.set_defaults(func=get_execution_status)

    # Health Check Command
    health_parser = subparsers.add_parser('health', help='Check API health')
    health_parser.set_defaults(func=health_check)

    # Create Test Case Command
    create_parser = subparsers.add_parser('create-test-case', help='Create test case')
    create_parser.add_argument('--name', required=True, help='Test case name')
    create_parser.add_argument('--description', help='Test case description')
    create_parser.add_argument('--folder', help='Folder path')
    create_parser.add_argument('--tags', help='Comma-separated tags')
    create_parser.set_defaults(func=create_test_case)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == '__main__':
    main()