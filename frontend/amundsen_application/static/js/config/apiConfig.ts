// ==============================================================================
// FILE: amundsen_application/static/js/config/apiConfig.ts
// ULTIMATE VERSION WITH DOCKER, K3S TRAEFIK, AND K3S NODEPORT SUPPORT
// ==============================================================================
// Supports three access modes:
// 1. Docker Desktop: localhost:18001-18008 (direct port access)
// 2. K3s Traefik: path-based routing (/optimusdb1, /optimusdb2, etc.)
// 3. K3s NodePort: port-based routing (192.168.0.26:30001, :30002, etc.)
// ==============================================================================

/**
 * OptimusDB Node Configuration
 */
export interface OptimusDBNode {
  id: number;
  name: string;
  url: string;
  healthEndpoint: string;
}

/**
 * Environment Detection Result
 */
export interface EnvironmentConfig {
  mode: 'docker-desktop' | 'k3s-traefik' | 'k3s-nodeport';
  frontendBaseUrl: string;
  optimusdbNodes: OptimusDBNode[];
  useTraefikRouting: boolean;
  useNodePort: boolean;
}

/**
 * Configuration Options
 */
export interface ConfigOptions {
  // Force a specific K3s access mode
  // 'auto': Auto-detect based on hostname/port
  // 'traefik': Use Traefik path-based routing (/optimusdb1, /optimusdb2, etc.)
  // 'nodeport': Use NodePort port-based routing (:30001, :30002, etc.)
  k3sAccessMode?: 'auto' | 'traefik' | 'nodeport';
}

// User-configurable options (can be set via window.OptimusDDC.setConfig)
let configOptions: ConfigOptions = {
  k3sAccessMode: 'auto',
};

/**
 * Detect current environment automatically
 */
function detectEnvironment(): EnvironmentConfig {
  const { hostname } = window.location;
  const { port } = window.location;
  const { protocol } = window.location;

  console.log('🔍 Detecting environment...');
  console.log(`   Hostname: ${hostname}`);
  console.log(`   Port: ${port}`);
  console.log(`   Protocol: ${protocol}`);
  console.log(`   K3s Access Mode: ${configOptions.k3sAccessMode}`);

  // ============================================
  // DOCKER DESKTOP DETECTION
  // ============================================
  if (
    (hostname === 'localhost' || hostname === '127.0.0.1') &&
    port === '5015'
  ) {
    console.log('✅ Detected: DOCKER DESKTOP');

    const nodes: OptimusDBNode[] = [];

    for (let i = 1; i <= 8; i++) {
      const nodePort = 18000 + i;

      nodes.push({
        id: i,
        name: `optimusdb${i}`,
        url: `http://localhost:${nodePort}`,
        healthEndpoint: `http://localhost:${nodePort}/swarmkb/agent/status`,
      });
    }

    return {
      mode: 'docker-desktop',
      frontendBaseUrl: `${protocol}//${hostname}:${port}`,
      optimusdbNodes: nodes,
      useTraefikRouting: false,
      useNodePort: false,
    };
  }

  // ============================================
  // K3S DETECTION
  // ============================================
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const baseUrl = port
      ? `${protocol}//${hostname}:${port}`
      : `${protocol}//${hostname}`;

    // Determine K3s access mode
    const k3sMode = configOptions.k3sAccessMode || 'auto';

    // ========================================
    // K3S NODEPORT MODE
    // ========================================
    if (k3sMode === 'nodeport') {
      console.log('✅ Detected: K3S (NodePort mode - port-based access)');

      // NodePort services:
      // Node 1: 30001
      // Node 2: 30002
      // Node 3: 30003

      const nodes: OptimusDBNode[] = [];

      for (let i = 1; i <= 3; i++) {
        const nodePort = 30000 + i;

        nodes.push({
          id: i,
          name: `optimusdb${i}`,
          url: `${protocol}//${hostname}:${nodePort}`,
          healthEndpoint: `${protocol}//${hostname}:${nodePort}/swarmkb/agent/status`,
        });
      }

      return {
        mode: 'k3s-nodeport',
        frontendBaseUrl: baseUrl,
        optimusdbNodes: nodes,
        useTraefikRouting: false,
        useNodePort: true,
      };
    }

    // ========================================
    // K3S TRAEFIK MODE (Default)
    // ========================================
    console.log('✅ Detected: K3S (Traefik mode - path-based routing)');

    const nodes: OptimusDBNode[] = [
      {
        id: 1,
        name: 'optimusdb1',
        url: `${baseUrl}`, // Uses /swarmkb routes (load-balanced or backward compat)
        healthEndpoint: `${baseUrl}/swarmkb/agent/status`,
      },
      {
        id: 2,
        name: 'optimusdb2',
        url: `${baseUrl}/optimusdb2`, // Uses /optimusdb2 prefix
        healthEndpoint: `${baseUrl}/optimusdb2/swarmkb/agent/status`,
      },
      {
        id: 3,
        name: 'optimusdb3',
        url: `${baseUrl}/optimusdb3`, // Uses /optimusdb3 prefix
        healthEndpoint: `${baseUrl}/optimusdb3/swarmkb/agent/status`,
      },
    ];

    return {
      mode: 'k3s-traefik',
      frontendBaseUrl: baseUrl,
      optimusdbNodes: nodes,
      useTraefikRouting: true,
      useNodePort: false,
    };
  }

  // ============================================
  // FALLBACK: DOCKER DESKTOP
  // ============================================
  console.warn('⚠️ Could not detect environment, defaulting to Docker Desktop');

  const nodes: OptimusDBNode[] = [];

  for (let i = 1; i <= 8; i++) {
    const nodePort = 18000 + i;

    nodes.push({
      id: i,
      name: `optimusdb${i}`,
      url: `http://localhost:${nodePort}`,
      healthEndpoint: `http://localhost:${nodePort}/swarmkb/agent/status`,
    });
  }

  return {
    mode: 'docker-desktop',
    frontendBaseUrl: 'http://localhost:5015',
    optimusdbNodes: nodes,
    useTraefikRouting: false,
    useNodePort: false,
  };
}

// ============================================
// GLOBAL ENVIRONMENT CONFIG
// ============================================

function initializeConfig(): EnvironmentConfig {
  try {
    const config = detectEnvironment();

    console.log('🎯 Environment Configuration:');
    console.log(`   Mode: ${config.mode}`);
    console.log(`   Frontend: ${config.frontendBaseUrl}`);
    console.log(`   Traefik Routing: ${config.useTraefikRouting}`);
    console.log(`   NodePort: ${config.useNodePort}`);
    console.log(`   OptimusDB Nodes: ${config.optimusdbNodes.length}`);
    config.optimusdbNodes.forEach((node) => {
      console.log(`     - Node ${node.id}: ${node.url}`);
    });

    return config;
  } catch (error) {
    console.error('❌ Failed to detect environment:', error);

    // Fallback to Docker Desktop
    return {
      mode: 'docker-desktop',
      frontendBaseUrl: 'http://localhost:5015',
      optimusdbNodes: Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: `optimusdb${i + 1}`,
        url: `http://localhost:${18001 + i}`,
        healthEndpoint: `http://localhost:${18001 + i}/swarmkb/agent/status`,
      })),
      useTraefikRouting: false,
      useNodePort: false,
    };
  }
}

// Initialize on load - now environmentConfig is immediately assigned
let environmentConfig: EnvironmentConfig = initializeConfig();

// ============================================
// PUBLIC API
// ============================================

/**
 * Get all available OptimusDB nodes
 */
export async function getAvailableNodes(): Promise<OptimusDBNode[]> {
  console.log(`📡 Getting available nodes (${environmentConfig.mode} mode)`);

  // In K3s Traefik mode, we know exactly which nodes exist from Traefik config
  if (environmentConfig.useTraefikRouting) {
    return environmentConfig.optimusdbNodes;
  }

  // In Docker Desktop or K3s NodePort, probe nodes to see which are healthy
  const healthChecks = environmentConfig.optimusdbNodes.map(async (node) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

      const response = await fetch(node.healthEndpoint, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ Node ${node.id} (${node.url}) is healthy`);

        return node;
      }
      console.warn(`⚠️ Node ${node.id} returned ${response.status}`);

      return null;
    } catch (error) {
      console.warn(`❌ Node ${node.id} is unreachable:`, error);

      return null;
    }
  });

  const results = await Promise.all(healthChecks);
  const healthyNodes = results.filter(
    (node): node is OptimusDBNode => node !== null
  );

  console.log(
    `✅ Found ${healthyNodes.length} healthy nodes out of ${environmentConfig.optimusdbNodes.length}`
  );

  return healthyNodes.length > 0
    ? healthyNodes
    : environmentConfig.optimusdbNodes;
}

/**
 * Build API URL for a specific service and endpoint
 */
export function buildApiUrl(
  service: 'optimusdb' | 'catalogsearch' | 'catalogmetadata',
  path: string,
  nodeId: number = 1
): string {
  if (service === 'optimusdb') {
    const node = environmentConfig.optimusdbNodes.find((n) => n.id === nodeId);

    if (!node) {
      console.warn(`⚠️ Node ${nodeId} not found, using node 1`);

      return `${environmentConfig.optimusdbNodes[0].url}${path}`;
    }

    // Docker Desktop:  http://localhost:18001/swarmkb/command
    // K3s NodePort:    http://192.168.0.26:30001/swarmkb/command
    // K3s Traefik:     http://192.168.0.26/optimusdb1/swarmkb/command

    return `${node.url}${path}`;
  }

  // For catalogsearch and catalogmetadata
  if (environmentConfig.useTraefikRouting) {
    if (service === 'catalogsearch') {
      return `${environmentConfig.frontendBaseUrl}/api/v1/search${path}`;
    }
    if (service === 'catalogmetadata') {
      return `${environmentConfig.frontendBaseUrl}/api/v1/metadata${path}`;
    }
  } else {
    // Docker Desktop or K3s NodePort: Use direct service URLs
    if (service === 'catalogsearch') {
      return `http://localhost:5013${path}`;
    }
    if (service === 'catalogmetadata') {
      return `http://localhost:5014${path}`;
    }
  }

  return `${environmentConfig.frontendBaseUrl}${path}`;
}

/**
 * Build dynamic API URL with load balancing
 */
let roundRobinIndex = 0;

export async function buildDynamicApiUrl(
  path: string,
  strategy: 'round-robin' | 'random' | 'first' = 'round-robin'
): Promise<string> {
  const nodes = await getAvailableNodes();

  if (nodes.length === 0) {
    console.error('❌ No healthy nodes available!');

    return buildApiUrl('optimusdb', path, 1);
  }

  let selectedNode: OptimusDBNode;

  switch (strategy) {
    case 'round-robin':
      selectedNode = nodes[roundRobinIndex % nodes.length];
      roundRobinIndex++;
      break;

    case 'random':
      selectedNode = nodes[Math.floor(Math.random() * nodes.length)];
      break;

    case 'first':
    default:
      selectedNode = nodes[0];
      break;
  }

  console.log(
    `🔄 Load balancing (${strategy}): Selected node ${selectedNode.id}`
  );

  return `${selectedNode.url}${path}`;
}

/**
 * Get catalog frontend URL
 */
export function getCatalogFrontendUrl(): string {
  return environmentConfig.frontendBaseUrl;
}

/**
 * Get current environment mode
 */
export function getEnvironmentMode():
  | 'docker-desktop'
  | 'k3s-traefik'
  | 'k3s-nodeport' {
  return environmentConfig.mode;
}

/**
 * Check if using Traefik routing
 */
export function isTraefikRouting(): boolean {
  return environmentConfig.useTraefikRouting;
}

/**
 * Check if using NodePort
 */
export function isNodePort(): boolean {
  return environmentConfig.useNodePort;
}

/**
 * Set configuration options
 */
export function setConfig(options: Partial<ConfigOptions>): void {
  configOptions = { ...configOptions, ...options };
  console.log('🔧 Configuration updated:', configOptions);

  // Reinitialize with new config
  environmentConfig = initializeConfig();
}

/**
 * Debug: Print current configuration
 */
export function debugConfig(): void {
  console.group('🔧 OptimusDDC Configuration');
  console.log('Environment:', environmentConfig.mode);
  console.log('Frontend:', environmentConfig.frontendBaseUrl);
  console.log('Traefik Routing:', environmentConfig.useTraefikRouting);
  console.log('NodePort:', environmentConfig.useNodePort);
  console.log('Config Options:', configOptions);
  console.log('OptimusDB Nodes:');
  environmentConfig.optimusdbNodes.forEach((node) => {
    console.log(`  ${node.name} (${node.id}): ${node.url}`);
    console.log(`    Health: ${node.healthEndpoint}`);
  });
  console.groupEnd();
}

// ============================================
// GLOBAL WINDOW OBJECT
// ============================================

declare global {
  interface Window {
    OptimusDDC?: {
      getAvailableNodes: typeof getAvailableNodes;
      buildApiUrl: typeof buildApiUrl;
      buildDynamicApiUrl: typeof buildDynamicApiUrl;
      getCatalogFrontendUrl: typeof getCatalogFrontendUrl;
      getEnvironmentMode: typeof getEnvironmentMode;
      isTraefikRouting: typeof isTraefikRouting;
      isNodePort: typeof isNodePort;
      setConfig: typeof setConfig;
      debugConfig: typeof debugConfig;
      config: EnvironmentConfig;
    };
  }
}

if (typeof window !== 'undefined') {
  window.OptimusDDC = {
    getAvailableNodes,
    buildApiUrl,
    buildDynamicApiUrl,
    getCatalogFrontendUrl,
    getEnvironmentMode,
    isTraefikRouting,
    isNodePort,
    setConfig,
    debugConfig,
    config: environmentConfig,
  };

  console.log('✅ OptimusDDC API initialized globally (window.OptimusDDC)');
  console.log('   Run window.OptimusDDC.debugConfig() to see configuration');
  console.log(
    '   Run window.OptimusDDC.setConfig({k3sAccessMode: "nodeport"}) to switch modes'
  );
}

// ==============================================================================
// USAGE EXAMPLES
// ==============================================================================
//
// DOCKER DESKTOP (Auto-detected):
//   Location: http://localhost:5015
//   Node 1: http://localhost:18001/swarmkb/command
//   Node 2: http://localhost:18002/swarmkb/command
//
// K3S TRAEFIK MODE (Auto-detected, default):
//   Location: http://192.168.0.26
//   Node 1: http://192.168.0.26/swarmkb/command (backward compat)
//   Node 2: http://192.168.0.26/optimusdb2/swarmkb/command
//   Node 3: http://192.168.0.26/optimusdb3/swarmkb/command
//
// K3S NODEPORT MODE (Manual switch):
//   Location: http://192.168.0.26
//   Node 1: http://192.168.0.26:30001/swarmkb/command
//   Node 2: http://192.168.0.26:30002/swarmkb/command
//   Node 3: http://192.168.0.26:30003/swarmkb/command
//
//   Switch to NodePort mode:
//   window.OptimusDDC.setConfig({k3sAccessMode: 'nodeport'})
//
//   Switch back to Traefik mode:
//   window.OptimusDDC.setConfig({k3sAccessMode: 'traefik'})
//
// ==============================================================================
