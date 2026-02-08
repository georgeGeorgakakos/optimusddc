// ==============================================================================
// FILE: amundsen_application/static/js/pages/ETLWorkbenchPage/index.tsx
// ==============================================================================
// OptimusFlow ETL Workbench - Integrated with SwarmChestrate
// ==============================================================================

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import DocumentTitle from 'react-document-title';
import axios from 'axios';
import { buildDynamicApiUrl } from 'config/apiConfig';

import './styles.scss';

// ==============================================================================
// TypeScript Interfaces
// ==============================================================================

export type ETLTab = 'workflow' | 'jobs';
export type NodeCategory = 'source' | 'transform' | 'sink';

export interface WorkflowNode {
  id: string;
  type: NodeCategory;
  nodeType: string;
  label: string;
  icon: string;
  position: { x: number; y: number };
  config: NodeConfig;
}

export interface NodeConfig {
  [key: string]: any;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort: string;
  targetPort: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  metadata: {
    created: string;
    modified: string;
    version: string;
  };
}

export interface Job {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  progress: number;
  rowsProcessed: number;
  duration: number;
  throughput: number;
  agentNodes: string[];
  startTime: string;
  error?: string;
}

export interface ClusterStatus {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  nodes: ClusterNode[];
}

export interface ClusterNode {
  id: string;
  name: string;
  status: 'online' | 'offline';
  host: string;
  port: number;
}

// ==============================================================================
// Node Type Definitions with Configuration Schemas
// ==============================================================================

const NODE_LIBRARY = {
  sources: [
    {
      id: 'rdbms_reader',
      label: 'RDBMS Reader',
      icon: '🗄️',
      type: 'source' as NodeCategory,
      description: 'Read data from relational databases',
      configSchema: {
        connectionString: {
          type: 'text',
          label: 'Connection String',
          required: true,
        },
        database: { type: 'text', label: 'Database', required: true },
        table: { type: 'text', label: 'Table Name', required: true },
        query: { type: 'textarea', label: 'Custom Query (Optional)' },
        batchSize: { type: 'number', label: 'Batch Size', default: 1000 },
      },
    },
    {
      id: 'csv_reader',
      label: 'CSV Reader',
      icon: '📄',
      type: 'source' as NodeCategory,
      description: 'Read data from CSV files',
      configSchema: {
        filePath: { type: 'text', label: 'File Path', required: true },
        delimiter: { type: 'text', label: 'Delimiter', default: ',' },
        hasHeader: { type: 'boolean', label: 'Has Header Row', default: true },
        encoding: {
          type: 'select',
          label: 'Encoding',
          options: ['utf-8', 'latin-1', 'ascii'],
          default: 'utf-8',
        },
      },
    },
    {
      id: 'api_reader',
      label: 'REST API Reader',
      icon: '🌐',
      type: 'source' as NodeCategory,
      description: 'Fetch data from REST APIs',
      configSchema: {
        url: { type: 'text', label: 'API Endpoint', required: true },
        method: {
          type: 'select',
          label: 'HTTP Method',
          options: ['GET', 'POST'],
          default: 'GET',
        },
        headers: { type: 'json', label: 'Headers (JSON)' },
        authentication: {
          type: 'select',
          label: 'Auth Type',
          options: ['none', 'bearer', 'basic'],
          default: 'none',
        },
        apiKey: { type: 'password', label: 'API Key/Token' },
        rateLimit: {
          type: 'number',
          label: 'Requests per Second',
          default: 10,
        },
      },
    },
    {
      id: 'kafka_consumer',
      label: 'Kafka Consumer',
      icon: '📨',
      type: 'source' as NodeCategory,
      description: 'Consume messages from Kafka topics',
      configSchema: {
        brokers: { type: 'text', label: 'Broker List', required: true },
        topic: { type: 'text', label: 'Topic Name', required: true },
        groupId: { type: 'text', label: 'Consumer Group ID', required: true },
        offset: {
          type: 'select',
          label: 'Start Offset',
          options: ['earliest', 'latest'],
          default: 'latest',
        },
        autoCommit: { type: 'boolean', label: 'Auto Commit', default: true },
      },
    },
    {
      id: 's3_reader',
      label: 'S3 Reader',
      icon: '☁️',
      type: 'source' as NodeCategory,
      description: 'Read files from AWS S3',
      configSchema: {
        bucket: { type: 'text', label: 'S3 Bucket', required: true },
        prefix: { type: 'text', label: 'Prefix/Path' },
        accessKey: { type: 'password', label: 'Access Key ID', required: true },
        secretKey: {
          type: 'password',
          label: 'Secret Access Key',
          required: true,
        },
        region: { type: 'text', label: 'Region', default: 'us-east-1' },
        filePattern: { type: 'text', label: 'File Pattern (regex)' },
      },
    },
    {
      id: 'mongodb_reader',
      label: 'MongoDB Reader',
      icon: '🍃',
      type: 'source' as NodeCategory,
      description: 'Read documents from MongoDB',
      configSchema: {
        connectionString: {
          type: 'text',
          label: 'Connection String',
          required: true,
        },
        database: { type: 'text', label: 'Database', required: true },
        collection: { type: 'text', label: 'Collection', required: true },
        query: { type: 'json', label: 'Query Filter (JSON)' },
        batchSize: { type: 'number', label: 'Batch Size', default: 1000 },
      },
    },
    {
      id: 'postgresql_reader',
      label: 'PostgreSQL Reader',
      icon: '🐘',
      type: 'source' as NodeCategory,
      description: 'Read data from PostgreSQL',
      configSchema: {
        host: { type: 'text', label: 'Host', required: true },
        port: { type: 'number', label: 'Port', default: 5432 },
        database: { type: 'text', label: 'Database', required: true },
        username: { type: 'text', label: 'Username', required: true },
        password: { type: 'password', label: 'Password', required: true },
        table: { type: 'text', label: 'Table Name', required: true },
      },
    },
    {
      id: 'mysql_reader',
      label: 'MySQL Reader',
      icon: '🐬',
      type: 'source' as NodeCategory,
      description: 'Read data from MySQL',
      configSchema: {
        host: { type: 'text', label: 'Host', required: true },
        port: { type: 'number', label: 'Port', default: 3306 },
        database: { type: 'text', label: 'Database', required: true },
        username: { type: 'text', label: 'Username', required: true },
        password: { type: 'password', label: 'Password', required: true },
        table: { type: 'text', label: 'Table Name', required: true },
      },
    },
    {
      id: 'redis_reader',
      label: 'Redis Reader',
      icon: '🔴',
      type: 'source' as NodeCategory,
      description: 'Read keys from Redis',
      configSchema: {
        host: { type: 'text', label: 'Host', required: true },
        port: { type: 'number', label: 'Port', default: 6379 },
        password: { type: 'password', label: 'Password' },
        database: { type: 'number', label: 'Database', default: 0 },
        keyPattern: { type: 'text', label: 'Key Pattern', default: '*' },
      },
    },
    {
      id: 'elasticsearch_reader',
      label: 'Elasticsearch Reader',
      icon: '🔍',
      type: 'source' as NodeCategory,
      description: 'Query Elasticsearch indices',
      configSchema: {
        hosts: {
          type: 'text',
          label: 'Hosts (comma-separated)',
          required: true,
        },
        index: { type: 'text', label: 'Index Pattern', required: true },
        query: { type: 'json', label: 'Query DSL (JSON)' },
        scrollSize: { type: 'number', label: 'Scroll Size', default: 1000 },
      },
    },
  ],
  transforms: [
    {
      id: 'filter',
      label: 'Filter',
      icon: '🔍',
      type: 'transform' as NodeCategory,
      description: 'Filter rows based on conditions',
      configSchema: {
        condition: {
          type: 'text',
          label: 'Filter Condition',
          required: true,
          placeholder: 'e.g., age > 18',
        },
        filterType: {
          type: 'select',
          label: 'Filter Type',
          options: ['include', 'exclude'],
          default: 'include',
        },
      },
    },
    {
      id: 'map',
      label: 'Map',
      icon: '🗺️',
      type: 'transform' as NodeCategory,
      description: 'Transform column values',
      configSchema: {
        expressions: {
          type: 'json',
          label: 'Column Mappings (JSON)',
          required: true,
        },
        dropOriginal: {
          type: 'boolean',
          label: 'Drop Original Columns',
          default: false,
        },
      },
    },
    {
      id: 'join',
      label: 'Join',
      icon: '🔗',
      type: 'transform' as NodeCategory,
      description: 'Join two data streams',
      configSchema: {
        joinType: {
          type: 'select',
          label: 'Join Type',
          options: ['inner', 'left', 'right', 'outer'],
          default: 'inner',
        },
        leftKey: { type: 'text', label: 'Left Key Column', required: true },
        rightKey: { type: 'text', label: 'Right Key Column', required: true },
      },
    },
    {
      id: 'aggregate',
      label: 'Aggregate',
      icon: '📊',
      type: 'transform' as NodeCategory,
      description: 'Group and aggregate data',
      configSchema: {
        groupBy: {
          type: 'text',
          label: 'Group By Columns (comma-separated)',
          required: true,
        },
        aggregations: {
          type: 'json',
          label: 'Aggregations (JSON)',
          required: true,
        },
      },
    },
    {
      id: 'deduplicate',
      label: 'Deduplicate',
      icon: '🎯',
      type: 'transform' as NodeCategory,
      description: 'Remove duplicate rows',
      configSchema: {
        columns: { type: 'text', label: 'Key Columns (comma-separated)' },
        keepFirst: {
          type: 'boolean',
          label: 'Keep First Occurrence',
          default: true,
        },
      },
    },
    {
      id: 'sort',
      label: 'Sort',
      icon: '⬆️',
      type: 'transform' as NodeCategory,
      description: 'Sort rows by columns',
      configSchema: {
        columns: {
          type: 'text',
          label: 'Sort Columns (comma-separated)',
          required: true,
        },
        ascending: { type: 'boolean', label: 'Ascending Order', default: true },
      },
    },
    {
      id: 'window',
      label: 'Window',
      icon: '📈',
      type: 'transform' as NodeCategory,
      description: 'Apply window functions',
      configSchema: {
        partitionBy: { type: 'text', label: 'Partition By Columns' },
        orderBy: { type: 'text', label: 'Order By Column', required: true },
        windowFunction: {
          type: 'select',
          label: 'Function',
          options: ['row_number', 'rank', 'dense_rank', 'lag', 'lead'],
          default: 'row_number',
        },
      },
    },
    {
      id: 'pivot',
      label: 'Pivot',
      icon: '🔄',
      type: 'transform' as NodeCategory,
      description: 'Pivot rows to columns',
      configSchema: {
        index: { type: 'text', label: 'Index Column', required: true },
        columns: { type: 'text', label: 'Pivot Column', required: true },
        values: { type: 'text', label: 'Values Column', required: true },
        aggFunc: {
          type: 'select',
          label: 'Aggregation',
          options: ['sum', 'mean', 'count', 'max', 'min'],
          default: 'sum',
        },
      },
    },
    {
      id: 'unpivot',
      label: 'Unpivot',
      icon: '🔃',
      type: 'transform' as NodeCategory,
      description: 'Unpivot columns to rows',
      configSchema: {
        idColumns: {
          type: 'text',
          label: 'ID Columns (comma-separated)',
          required: true,
        },
        valueColumns: {
          type: 'text',
          label: 'Value Columns (comma-separated)',
          required: true,
        },
        varName: {
          type: 'text',
          label: 'Variable Column Name',
          default: 'variable',
        },
        valueName: {
          type: 'text',
          label: 'Value Column Name',
          default: 'value',
        },
      },
    },
    {
      id: 'validate',
      label: 'Validate',
      icon: '✅',
      type: 'transform' as NodeCategory,
      description: 'Validate data quality',
      configSchema: {
        rules: {
          type: 'json',
          label: 'Validation Rules (JSON)',
          required: true,
        },
        onError: {
          type: 'select',
          label: 'On Error',
          options: ['fail', 'warn', 'drop'],
          default: 'warn',
        },
      },
    },
  ],
  sinks: [
    {
      id: 'rdbms_writer',
      label: 'RDBMS Writer',
      icon: '💾',
      type: 'sink' as NodeCategory,
      description: 'Write data to relational databases',
      configSchema: {
        connectionString: {
          type: 'text',
          label: 'Connection String',
          required: true,
        },
        database: { type: 'text', label: 'Database', required: true },
        table: { type: 'text', label: 'Table Name', required: true },
        writeMode: {
          type: 'select',
          label: 'Write Mode',
          options: ['append', 'overwrite', 'upsert'],
          default: 'append',
        },
        batchSize: { type: 'number', label: 'Batch Size', default: 1000 },
      },
    },
    {
      id: 'swarmchestrate_writer',
      label: 'SwarmChestrate Writer',
      icon: '🐝',
      type: 'sink' as NodeCategory,
      description: 'Write to SwarmChestrate distributed storage',
      configSchema: {
        collection: { type: 'text', label: 'Collection Name', required: true },
        replicationFactor: {
          type: 'number',
          label: 'Replication Factor',
          default: 3,
        },
        consistencyLevel: {
          type: 'select',
          label: 'Consistency',
          options: ['eventual', 'strong', 'quorum'],
          default: 'quorum',
        },
      },
    },
    {
      id: 'csv_writer',
      label: 'CSV Writer',
      icon: '📝',
      type: 'sink' as NodeCategory,
      description: 'Write data to CSV files',
      configSchema: {
        filePath: { type: 'text', label: 'Output File Path', required: true },
        delimiter: { type: 'text', label: 'Delimiter', default: ',' },
        includeHeader: {
          type: 'boolean',
          label: 'Include Header',
          default: true,
        },
        encoding: {
          type: 'select',
          label: 'Encoding',
          options: ['utf-8', 'latin-1'],
          default: 'utf-8',
        },
      },
    },
    {
      id: 's3_writer',
      label: 'S3 Writer',
      icon: '☁️',
      type: 'sink' as NodeCategory,
      description: 'Write files to AWS S3',
      configSchema: {
        bucket: { type: 'text', label: 'S3 Bucket', required: true },
        prefix: { type: 'text', label: 'Prefix/Path' },
        accessKey: { type: 'password', label: 'Access Key ID', required: true },
        secretKey: {
          type: 'password',
          label: 'Secret Access Key',
          required: true,
        },
        region: { type: 'text', label: 'Region', default: 'us-east-1' },
        format: {
          type: 'select',
          label: 'File Format',
          options: ['csv', 'parquet', 'json'],
          default: 'parquet',
        },
      },
    },
    {
      id: 'kafka_producer',
      label: 'Kafka Producer',
      icon: '📤',
      type: 'sink' as NodeCategory,
      description: 'Publish messages to Kafka topics',
      configSchema: {
        brokers: { type: 'text', label: 'Broker List', required: true },
        topic: { type: 'text', label: 'Topic Name', required: true },
        keyColumn: { type: 'text', label: 'Key Column (Optional)' },
        compression: {
          type: 'select',
          label: 'Compression',
          options: ['none', 'gzip', 'snappy', 'lz4'],
          default: 'none',
        },
      },
    },
    {
      id: 'mongodb_writer',
      label: 'MongoDB Writer',
      icon: '🍃',
      type: 'sink' as NodeCategory,
      description: 'Write documents to MongoDB',
      configSchema: {
        connectionString: {
          type: 'text',
          label: 'Connection String',
          required: true,
        },
        database: { type: 'text', label: 'Database', required: true },
        collection: { type: 'text', label: 'Collection', required: true },
        writeMode: {
          type: 'select',
          label: 'Write Mode',
          options: ['insert', 'upsert', 'replace'],
          default: 'insert',
        },
      },
    },
    {
      id: 'elasticsearch_writer',
      label: 'Elasticsearch Writer',
      icon: '🔎',
      type: 'sink' as NodeCategory,
      description: 'Index documents in Elasticsearch',
      configSchema: {
        hosts: {
          type: 'text',
          label: 'Hosts (comma-separated)',
          required: true,
        },
        index: { type: 'text', label: 'Index Name', required: true },
        idColumn: { type: 'text', label: 'Document ID Column' },
        batchSize: { type: 'number', label: 'Batch Size', default: 1000 },
      },
    },
    {
      id: 'api_writer',
      label: 'REST API Writer',
      icon: '🌐',
      type: 'sink' as NodeCategory,
      description: 'Send data to REST APIs',
      configSchema: {
        url: { type: 'text', label: 'API Endpoint', required: true },
        method: {
          type: 'select',
          label: 'HTTP Method',
          options: ['POST', 'PUT', 'PATCH'],
          default: 'POST',
        },
        headers: { type: 'json', label: 'Headers (JSON)' },
        authentication: {
          type: 'select',
          label: 'Auth Type',
          options: ['none', 'bearer', 'basic'],
          default: 'none',
        },
        apiKey: { type: 'password', label: 'API Key/Token' },
        batchSize: { type: 'number', label: 'Batch Size', default: 100 },
      },
    },
    {
      id: 'webhook_writer',
      label: 'Webhook Writer',
      icon: '🔔',
      type: 'sink' as NodeCategory,
      description: 'Send data to webhook endpoints',
      configSchema: {
        url: { type: 'text', label: 'Webhook URL', required: true },
        method: {
          type: 'select',
          label: 'HTTP Method',
          options: ['POST', 'PUT'],
          default: 'POST',
        },
        headers: { type: 'json', label: 'Custom Headers (JSON)' },
        retryCount: { type: 'number', label: 'Retry Count', default: 3 },
      },
    },
    {
      id: 'postgresql_writer',
      label: 'PostgreSQL Writer',
      icon: '🐘',
      type: 'sink' as NodeCategory,
      description: 'Write data to PostgreSQL',
      configSchema: {
        host: { type: 'text', label: 'Host', required: true },
        port: { type: 'number', label: 'Port', default: 5432 },
        database: { type: 'text', label: 'Database', required: true },
        username: { type: 'text', label: 'Username', required: true },
        password: { type: 'password', label: 'Password', required: true },
        table: { type: 'text', label: 'Table Name', required: true },
        writeMode: {
          type: 'select',
          label: 'Write Mode',
          options: ['append', 'overwrite', 'upsert'],
          default: 'append',
        },
      },
    },
  ],
};

// ==============================================================================
// Mock Job Data
// ==============================================================================

const MOCK_JOBS: Job[] = [
  {
    id: 'job_001',
    workflowId: 'wf_001',
    workflowName: 'Customer Data Sync',
    status: 'running',
    progress: 65,
    rowsProcessed: 325000,
    duration: 145,
    throughput: 2241,
    agentNodes: ['agent-01', 'agent-02', 'agent-03'],
    startTime: new Date(Date.now() - 145000).toISOString(),
  },
  {
    id: 'job_002',
    workflowId: 'wf_002',
    workflowName: 'Sales Analytics Pipeline',
    status: 'running',
    progress: 35,
    rowsProcessed: 87500,
    duration: 82,
    throughput: 1067,
    agentNodes: ['agent-04', 'agent-05'],
    startTime: new Date(Date.now() - 82000).toISOString(),
  },
  {
    id: 'job_003',
    workflowId: 'wf_003',
    workflowName: 'Product Catalog Update',
    status: 'completed',
    progress: 100,
    rowsProcessed: 125000,
    duration: 187,
    throughput: 668,
    agentNodes: ['agent-01', 'agent-06'],
    startTime: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'job_004',
    workflowId: 'wf_004',
    workflowName: 'Event Stream Processing',
    status: 'failed',
    progress: 42,
    rowsProcessed: 210000,
    duration: 98,
    throughput: 2143,
    agentNodes: ['agent-02', 'agent-07'],
    startTime: new Date(Date.now() - 900000).toISOString(),
    error: 'Connection timeout to target database',
  },
  {
    id: 'job_005',
    workflowId: 'wf_005',
    workflowName: 'Daily Backup Pipeline',
    status: 'completed',
    progress: 100,
    rowsProcessed: 2150000,
    duration: 456,
    throughput: 4715,
    agentNodes: ['agent-01', 'agent-02', 'agent-03', 'agent-04'],
    startTime: new Date(Date.now() - 1800000).toISOString(),
  },
];

// ==============================================================================
// Helper Functions
// ==============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;

  return num.toString();
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function getStatusColor(status: Job['status']): string {
  switch (status) {
    case 'running':
      return '#4ec9b0';
    case 'completed':
      return '#6c9b3f';
    case 'failed':
      return '#e74c3c';
    case 'pending':
      return '#f39c12';
    default:
      return '#95a5a6';
  }
}

function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==============================================================================
// Workflow Builder Component
// ==============================================================================

const WorkflowBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNodeType, setDraggedNodeType] = useState<any>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [searchTerm, setSearchTerm] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  // Count nodes by type
  const nodeCounts = {
    sources: nodes.filter((n) => n.type === 'source').length,
    transforms: nodes.filter((n) => n.type === 'transform').length,
    sinks: nodes.filter((n) => n.type === 'sink').length,
  };

  // Filter nodes by search term
  const filteredLibrary = {
    sources: NODE_LIBRARY.sources.filter(
      (n) =>
        n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    transforms: NODE_LIBRARY.transforms.filter(
      (n) =>
        n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    sinks: NODE_LIBRARY.sinks.filter(
      (n) =>
        n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  };

  // Drag handlers
  const handleDragStart = (nodeType: any) => (e: React.DragEvent) => {
    setDraggedNodeType(nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    if (!draggedNodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Initialize config with default values
    const config: NodeConfig = {};

    Object.entries(draggedNodeType.configSchema).forEach(
      ([key, schema]: [string, any]) => {
        if (schema.default !== undefined) {
          config[key] = schema.default;
        }
      }
    );

    const newNode: WorkflowNode = {
      id: generateNodeId(),
      type: draggedNodeType.type,
      nodeType: draggedNodeType.id,
      label: draggedNodeType.label,
      icon: draggedNodeType.icon,
      position: { x: Math.max(0, x - 60), y: Math.max(0, y - 40) },
      config,
    };

    setNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
    setDraggedNodeType(null);
  };

  // Node handlers
  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes(nodes.filter((n) => n.id !== selectedNode));
    setConnections(
      connections.filter(
        (c) => c.sourceId !== selectedNode && c.targetId !== selectedNode
      )
    );
    setSelectedNode(null);
  };

  const handleConfigChange = (key: string, value: any) => {
    if (!selectedNode) return;
    setNodes(
      nodes.map((node) =>
        node.id === selectedNode
          ? { ...node, config: { ...node.config, [key]: value } }
          : node
      )
    );
  };

  // Workflow operations
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all nodes?')) {
      setNodes([]);
      setConnections([]);
      setSelectedNode(null);
    }
  };

  const handleValidate = () => {
    const errors: string[] = [];

    // Check for at least one source
    if (nodeCounts.sources === 0) {
      errors.push('Workflow must have at least one source node');
    }

    // Check for at least one sink
    if (nodeCounts.sinks === 0) {
      errors.push('Workflow must have at least one sink node');
    }

    // Validate each node's configuration
    nodes.forEach((node) => {
      const nodeType = [
        ...NODE_LIBRARY.sources,
        ...NODE_LIBRARY.transforms,
        ...NODE_LIBRARY.sinks,
      ].find((n) => n.id === node.nodeType);

      if (nodeType) {
        Object.entries(nodeType.configSchema).forEach(
          ([key, schema]: [string, any]) => {
            if (schema.required && !node.config[key]) {
              errors.push(
                `${node.label}: Missing required field "${schema.label}"`
              );
            }
          }
        );
      }
    });

    if (errors.length === 0) {
      alert('✅ Workflow validation passed!');
    } else {
      alert('❌ Validation errors:\n\n' + errors.join('\n'));
    }
  };

  const exportToTOSCA = () => {
    const workflow: Workflow = {
      id: `wf_${Date.now()}`,
      name: workflowName,
      description: 'OptimusFlow ETL Workflow',
      nodes,
      connections,
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    const toscaTemplate = {
      tosca_definitions_version: 'tosca_simple_yaml_1_3',
      description: `ETL Workflow: ${workflowName}`,
      metadata: workflow.metadata,
      topology_template: {
        node_templates: nodes.reduce((acc, node) => {
          acc[node.id] = {
            type: `optimusflow.nodes.${node.type}.${node.nodeType}`,
            properties: node.config,
            attributes: {
              position: node.position,
              label: node.label,
              icon: node.icon,
            },
          };

          return acc;
        }, {} as any),
        relationship_templates: connections.reduce((acc, conn) => {
          acc[conn.id] = {
            type: 'optimusflow.relationships.DataFlow',
            source: conn.sourceId,
            target: conn.targetId,
          };

          return acc;
        }, {} as any),
      },
    };

    const blob = new Blob([JSON.stringify(toscaTemplate, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '_')}_tosca.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importFromTOSCA = () => {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.json,.yaml,.yml';
    input.onchange = (e: any) => {
      const file = e.target.files[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const toscaTemplate = JSON.parse(e.target.result);

          // Extract nodes
          const importedNodes: WorkflowNode[] = [];

          if (toscaTemplate.topology_template?.node_templates) {
            Object.entries(
              toscaTemplate.topology_template.node_templates
            ).forEach(([id, template]: [string, any]) => {
              const typeMatch = template.type.match(
                /optimusflow\.nodes\.(\w+)\.(\w+)/
              );

              if (typeMatch) {
                const [, type, nodeType] = typeMatch;
                const nodeLib = [
                  ...NODE_LIBRARY.sources,
                  ...NODE_LIBRARY.transforms,
                  ...NODE_LIBRARY.sinks,
                ].find((n) => n.id === nodeType);

                if (nodeLib) {
                  importedNodes.push({
                    id,
                    type: type as NodeCategory,
                    nodeType,
                    label: template.attributes?.label || nodeLib.label,
                    icon: template.attributes?.icon || nodeLib.icon,
                    position: template.attributes?.position || {
                      x: 100,
                      y: 100,
                    },
                    config: template.properties || {},
                  });
                }
              }
            });
          }

          // Extract connections
          const importedConnections: Connection[] = [];

          if (toscaTemplate.topology_template?.relationship_templates) {
            Object.entries(
              toscaTemplate.topology_template.relationship_templates
            ).forEach(([id, rel]: [string, any]) => {
              importedConnections.push({
                id,
                sourceId: rel.source,
                targetId: rel.target,
                sourcePort: 'output',
                targetPort: 'input',
              });
            });
          }

          setNodes(importedNodes);
          setConnections(importedConnections);
          setWorkflowName(
            toscaTemplate.description?.replace('ETL Workflow: ', '') ||
              'Imported Workflow'
          );
          alert(
            `✅ Successfully imported workflow with ${importedNodes.length} nodes`
          );
        } catch (error) {
          alert('❌ Error parsing TOSCA template: ' + error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="workflow-builder">
      {/* Node Palette */}
      <div className="node-palette">
        <div className="palette-header">
          <h3>Components</h3>
          <input
            type="text"
            className="palette-search"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="palette-sections">
          {/* Sources */}
          <div className="palette-section">
            <h4>Sources ({filteredLibrary.sources.length})</h4>
            {filteredLibrary.sources.map((node) => (
              <div
                key={node.id}
                className="palette-node"
                draggable
                onDragStart={handleDragStart(node)}
                title={node.description}
              >
                <span className="node-icon">{node.icon}</span>
                <span className="node-label">{node.label}</span>
              </div>
            ))}
          </div>

          {/* Transforms */}
          <div className="palette-section">
            <h4>Transforms ({filteredLibrary.transforms.length})</h4>
            {filteredLibrary.transforms.map((node) => (
              <div
                key={node.id}
                className="palette-node"
                draggable
                onDragStart={handleDragStart(node)}
                title={node.description}
              >
                <span className="node-icon">{node.icon}</span>
                <span className="node-label">{node.label}</span>
              </div>
            ))}
          </div>

          {/* Sinks */}
          <div className="palette-section">
            <h4>Sinks ({filteredLibrary.sinks.length})</h4>
            {filteredLibrary.sinks.map((node) => (
              <div
                key={node.id}
                className="palette-node"
                draggable
                onDragStart={handleDragStart(node)}
                title={node.description}
              >
                <span className="node-icon">{node.icon}</span>
                <span className="node-label">{node.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="palette-actions">
          <button className="palette-action-btn" onClick={importFromTOSCA}>
            <span>📥</span> Import
          </button>
          <button className="palette-action-btn" onClick={exportToTOSCA}>
            <span>📤</span> Export
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`workflow-canvas ${isDraggingOver ? 'dragging-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {nodes.length === 0 ? (
          <div className="canvas-placeholder">
            <div className="placeholder-icon">⚙️</div>
            <h3>Drag components to start building your workflow</h3>
            <p>Connect sources → transforms → sinks to create data pipelines</p>
          </div>
        ) : (
          <div className="canvas-nodes">
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`canvas-node ${node.type} ${
                  selectedNode === node.id ? 'selected' : ''
                }`}
                style={{
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`,
                }}
                onClick={() => handleNodeClick(node.id)}
              >
                <div className="node-icon">{node.icon}</div>
                <div className="node-label">{node.label}</div>
                <div className="node-ports">
                  {node.type !== 'source' && <div className="port input" />}
                  {node.type !== 'sink' && <div className="port output" />}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="canvas-toolbar">
          <input
            type="text"
            className="workflow-name-input"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow name..."
          />
          <button className="canvas-btn primary">
            <span>▶️</span> Execute
          </button>
          <button className="canvas-btn" onClick={handleValidate}>
            <span>🧪</span> Validate
          </button>
          <button
            className="canvas-btn"
            onClick={handleClearAll}
            disabled={nodes.length === 0}
          >
            <span>🗑️</span> Clear
          </button>
        </div>

        <div className="node-counter">
          <span>Sources: {nodeCounts.sources}</span>
          <span>Transforms: {nodeCounts.transforms}</span>
          <span>Sinks: {nodeCounts.sinks}</span>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="properties-panel">
        {selectedNodeData ? (
          <>
            <div className="properties-header">
              <h3>
                {selectedNodeData.icon} {selectedNodeData.label}
              </h3>
              <button
                className="close-btn"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </button>
            </div>

            <div className="property-section">
              <label>Node ID</label>
              <input type="text" value={selectedNodeData.id} readOnly />
            </div>

            <div className="property-section">
              <label>Position</label>
              <input
                type="text"
                value={`X: ${Math.round(
                  selectedNodeData.position.x
                )}, Y: ${Math.round(selectedNodeData.position.y)}`}
                readOnly
              />
            </div>

            <div className="properties-divider" />
            <h4>Configuration</h4>

            {(() => {
              const nodeType = [
                ...NODE_LIBRARY.sources,
                ...NODE_LIBRARY.transforms,
                ...NODE_LIBRARY.sinks,
              ].find((n) => n.id === selectedNodeData.nodeType);

              if (!nodeType) return null;

              return Object.entries(nodeType.configSchema).map(
                ([key, schema]: [string, any]) => (
                  <div key={key} className="property-section">
                    <label>
                      {schema.label}
                      {schema.required && <span className="required">*</span>}
                    </label>

                    {schema.type === 'text' && (
                      <input
                        type="text"
                        value={selectedNodeData.config[key] || ''}
                        onChange={(e) =>
                          handleConfigChange(key, e.target.value)
                        }
                        placeholder={schema.placeholder}
                      />
                    )}

                    {schema.type === 'password' && (
                      <input
                        type="password"
                        value={selectedNodeData.config[key] || ''}
                        onChange={(e) =>
                          handleConfigChange(key, e.target.value)
                        }
                      />
                    )}

                    {schema.type === 'number' && (
                      <input
                        type="number"
                        value={
                          selectedNodeData.config[key] || schema.default || ''
                        }
                        onChange={(e) =>
                          handleConfigChange(key, parseInt(e.target.value, 10))
                        }
                      />
                    )}

                    {schema.type === 'textarea' && (
                      <textarea
                        value={selectedNodeData.config[key] || ''}
                        onChange={(e) =>
                          handleConfigChange(key, e.target.value)
                        }
                        rows={3}
                      />
                    )}

                    {schema.type === 'select' && (
                      <select
                        value={selectedNodeData.config[key] || schema.default}
                        onChange={(e) =>
                          handleConfigChange(key, e.target.value)
                        }
                      >
                        {schema.options.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {schema.type === 'boolean' && (
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={
                            selectedNodeData.config[key] ||
                            schema.default ||
                            false
                          }
                          onChange={(e) =>
                            handleConfigChange(key, e.target.checked)
                          }
                        />
                        <span>Enabled</span>
                      </label>
                    )}

                    {schema.type === 'json' && (
                      <textarea
                        value={
                          typeof selectedNodeData.config[key] === 'object'
                            ? JSON.stringify(
                                selectedNodeData.config[key],
                                null,
                                2
                              )
                            : selectedNodeData.config[key] || ''
                        }
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);

                            handleConfigChange(key, parsed);
                          } catch {
                            handleConfigChange(key, e.target.value);
                          }
                        }}
                        rows={4}
                        placeholder="{}"
                      />
                    )}
                  </div>
                )
              );
            })()}

            <div className="property-actions">
              <button
                className="property-btn danger"
                onClick={handleDeleteNode}
              >
                <span>🗑️</span> Delete Node
              </button>
            </div>
          </>
        ) : (
          <div className="properties-empty">
            <div className="empty-icon">📋</div>
            <p>Select a node to configure its properties</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==============================================================================
// Jobs Monitor Component
// ==============================================================================

const JobsMonitor: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [filter, setFilter] = useState<Job['status'] | 'all'>('all');

  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((prev) =>
        prev.map((job) => {
          if (job.status === 'running') {
            const newProgress = Math.min(job.progress + Math.random() * 5, 100);
            const newRows =
              job.rowsProcessed + Math.floor(Math.random() * 1000);
            const newDuration = job.duration + 2;
            const newThroughput = Math.floor(newRows / newDuration);

            return {
              ...job,
              progress: Math.floor(newProgress),
              rowsProcessed: newRows,
              duration: newDuration,
              throughput: newThroughput,
              ...(newProgress >= 100 && { status: 'completed' as const }),
            };
          }

          return job;
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const filteredJobs =
    filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  const stats = {
    total: jobs.length,
    running: jobs.filter((j) => j.status === 'running').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  };

  return (
    <div className="jobs-monitor">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Jobs</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card running">
          <div className="stat-label">Running</div>
          <div className="stat-value">{stats.running}</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.completed}</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-label">Failed</div>
          <div className="stat-value">{stats.failed}</div>
        </div>
      </div>

      <div className="job-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Jobs
        </button>
        <button
          className={`filter-btn ${filter === 'running' ? 'active' : ''}`}
          onClick={() => setFilter('running')}
        >
          Running
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button
          className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
          onClick={() => setFilter('failed')}
        >
          Failed
        </button>

        <div className="filter-actions">
          <button className="action-btn">
            <span>🔄</span> Refresh
          </button>
          <button className="action-btn">
            <span>📊</span> Export
          </button>
        </div>
      </div>

      <div className="job-cards">
        {filteredJobs.map((job) => (
          <div key={job.id} className={`job-card ${job.status}`}>
            <div className="job-header">
              <div className="job-title">
                <h4>{job.workflowName}</h4>
                <span className="job-id">ID: {job.id}</span>
              </div>
              <span className={`status-badge ${job.status}`}>{job.status}</span>
            </div>

            {job.status === 'running' && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${job.progress}%` }}
                />
                <span className="progress-text">{job.progress}%</span>
              </div>
            )}

            {job.error && (
              <div className="job-error">
                <span>⚠️</span> {job.error}
              </div>
            )}

            <div className="job-metrics">
              <div className="metric">
                <span className="metric-label">Rows</span>
                <span className="metric-value">
                  {formatNumber(job.rowsProcessed)}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Duration</span>
                <span className="metric-value">
                  {formatDuration(job.duration)}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Throughput</span>
                <span className="metric-value">
                  {formatNumber(job.throughput)}/s
                </span>
              </div>
            </div>

            <div className="job-agents">
              {job.agentNodes.map((agent) => (
                <span key={agent} className="agent-badge">
                  {agent}
                </span>
              ))}
            </div>

            <div className="job-footer">
              <span className="job-timestamp">
                Started {new Date(job.startTime).toLocaleTimeString()}
              </span>
              <div className="job-actions">
                <button className="job-action-btn">📊 Details</button>
                <button className="job-action-btn">📝 Logs</button>
                {job.status === 'running' ? (
                  <button className="job-action-btn danger">⏹️ Cancel</button>
                ) : job.status === 'failed' ? (
                  <button className="job-action-btn">🔄 Retry</button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================================
// Main ETL Workbench Page
// ==============================================================================

const ETLWorkbenchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ETLTab>('workflow');
  const [clusterStatus, setClusterStatus] = useState<ClusterStatus>({
    totalNodes: 0,
    onlineNodes: 0,
    offlineNodes: 0,
    nodes: [],
  });
  const [activeJobs, setActiveJobs] = useState(2);

  // Fetch cluster status from API
  useEffect(() => {
    const fetchClusterStatus = async () => {
      try {
        const apiUrl = await buildDynamicApiUrl('/api/cluster/status');
        const response = await axios.get(apiUrl);

        if (response.data) {
          const nodes = response.data.nodes || [];

          setClusterStatus({
            totalNodes: nodes.length,
            onlineNodes: nodes.filter((n: any) => n.status === 'online').length,
            offlineNodes: nodes.filter((n: any) => n.status === 'offline')
              .length,
            nodes,
          });
        }
      } catch (error) {
        console.error('Failed to fetch cluster status:', error);
        // Fallback to mock data
        setClusterStatus({
          totalNodes: 8,
          onlineNodes: 8,
          offlineNodes: 0,
          nodes: Array.from({ length: 8 }, (_, i) => ({
            id: `agent-${String(i + 1).padStart(2, '0')}`,
            name: `agent-${String(i + 1).padStart(2, '0')}`,
            status: 'online',
            host: `192.168.1.${100 + i}`,
            port: 8080,
          })),
        });
      }
    };

    fetchClusterStatus();
    const interval = setInterval(fetchClusterStatus, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <DocumentTitle title="ETL Workbench | OptimusDB">
      <div className="etl-workbench-page">
        <div className="workbench-header">
          <div className="header-left">
            <div className="header-icon">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <defs>
                  <linearGradient
                    id="etl-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
                <rect
                  x="2"
                  y="2"
                  width="28"
                  height="28"
                  rx="6"
                  fill="url(#etl-gradient)"
                />
                <path
                  d="M10 10 L16 16 L10 22 M16 10 L22 16 L16 22"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
            <div>
              <h1 className="workbench-title">ETL Workbench</h1>
              <p className="workbench-subtitle">
                Design, execute, and monitor data transformation pipelines
              </p>
            </div>
          </div>

          <div className="header-right">
            <div
              className={`cluster-status ${
                clusterStatus.onlineNodes === clusterStatus.totalNodes
                  ? 'online'
                  : 'partial'
              }`}
            >
              <span className="status-dot" />
              <span className="status-text">
                Cluster: {clusterStatus.onlineNodes}/{clusterStatus.totalNodes}{' '}
                nodes online
              </span>
            </div>
          </div>
        </div>

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            <span className="tab-icon">⚙️</span>
            <div className="tab-content">
              <span className="tab-label">Workflow Builder</span>
              <span className="tab-desc">Design ETL pipelines</span>
            </div>
          </button>

          <button
            className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            <span className="tab-icon">📊</span>
            <div className="tab-content">
              <span className="tab-label">Jobs Monitor</span>
              <span className="tab-desc">Track pipeline execution</span>
            </div>
            {activeJobs > 0 && <span className="tab-badge">{activeJobs}</span>}
          </button>
        </div>

        <div className="tab-content-area">
          {activeTab === 'workflow' ? <WorkflowBuilder /> : <JobsMonitor />}
        </div>
      </div>
    </DocumentTitle>
  );
};

export default ETLWorkbenchPage;
