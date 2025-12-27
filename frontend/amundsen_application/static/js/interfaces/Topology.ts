export type NodeRole = 'COORDINATOR' | 'FOLLOWER';
export type NodeStatus = 'UP' | 'DOWN' | 'UNKNOWN';

export interface TopologyNode {
  id: string;
  name: string;
  host: string;
  port: number;
  role: NodeRole;
  status: NodeStatus;
  lastHeartbeat: string;
}

export interface TopologyEdge {
  source: string;
  target: string;
  type: string;
}

export interface TopologyGraph {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}
