export type AgentStatus = "online" | "degraded" | "offline" | "stuck";
export type Environment = "prod" | "staging" | "dev";
export type SLATier = "critical" | "high" | "medium" | "low";
export type NetworkRisk = "cloud" | "corp-vpc" | "home" | "public-subnet";
export type MemoryStructure = "openclaw-standard" | "hermes" | "custom";

export interface Agent {
  id: string;
  name: string;
  avatar?: string; // URL to profile pic
  role: string; // e.g. "Executive Assistant", "CTO", "Growth Lead"
  owner: string;
  environment: Environment;
  tags: string[];
  slaTier: SLATier;

  // Status
  status: AgentStatus;
  lastHeartbeat: string;
  lastSeen: string;
  lastHumanInteraction?: string; // ISO — last time owner talked to agent
  sessionCountToday?: number;
  currentTask: string | null;
  queueDepth: number;
  uptime: string;

  // Projects
  sideProjects?: string[];
  abandonedProjects?: string[];

  // Version
  agentVersion: string;
  latestVersion: string;
  systemVersion: string;
  toolingVersion: string;
  versionDrift: boolean;

  // Host
  host: {
    name: string;
    cpu: number;
    ram: number;
    disk: number;
    network: "healthy" | "degraded" | "down";
    gpu?: { usage: number; temp: number };
    ip: string;
    location: string;
    workspaceSize?: string; // e.g. "2.1 GB"
  };

  // Tailscale
  tailscale?: {
    ip: string;
    hostname: string;
    status: "online" | "offline" | "idle";
    lastSeen?: string;
  };

  // Communication
  channels: {
    type: string; // "telegram" | "discord" | "whatsapp" | "slack" | "none"
    handle?: string; // e.g. "@marko_growthbot"
    groupIds?: string[];
  }[];

  // Memory
  memoryStructure: MemoryStructure;
  workspaceFiles?: {
    soul?: boolean;
    agents?: boolean;
    memory?: boolean;
    user?: boolean;
    tools?: boolean;
    heartbeat?: boolean;
  };

  // Access — SSH
  sshAccess?: {
    host: string;
    ip: string;
    user: string;
  }[];

  // Access — APIs & Services
  serviceAccess?: {
    service: string; // e.g. "GitHub", "Gmail", "Hetzner", "Cloudflare"
    scope?: string; // e.g. "FlickerEffect org", "chris00steele@gmail.com"
    method: "PAT" | "OAuth" | "API key" | "SSH key";
  }[];

  // MCP Connections
  mcpConnections?: {
    name: string;
    url?: string;
    type: "stdio" | "http" | "sse";
    status: "connected" | "failed" | "disabled";
  }[];

  // GitHub repos
  githubRepos?: string[];

  // Cron jobs
  cronJobs?: {
    schedule: string;
    task: string;
    lastRun?: string;
  }[];

  // Errors & Latency
  errors1h: number;
  errors24h: number;
  taskStartDelay: number;
  completionTime: number;
  apiLatency: number;

  // Cost
  cost: {
    today: number;
    week: number;
    month: number;
    tokensToday: number;
    model: string;
  };

  // Permissions
  permissions: string[];

  // Backup
  lastBackup: string | null;
  lastRestoreTest: string | null;
  backupHealthy: boolean;

  // Secrets
  secrets: {
    total: number;
    expiringSoon: number;
    expired: number;
    lastRotation: string | null;
  };

  // Auto-restart
  autoRestart: boolean;
  lastRestartReason: string | null;
  lastRestartTime: string | null;

  // Security
  security: {
    patchLevel: string;
    lastOsUpdate: string;
    firewallStatus: "active" | "inactive" | "unknown";
    portsExposed: number[];
    sshPasswordDisabled: boolean;
    sshKeyOnly: boolean;
    fail2ban: boolean;
    diskEncryption: boolean;
    mfaEnabled: boolean;
    auditLogEnabled: boolean;
    auditRetentionDays: number;
    lastVulnScan: string | null;
    criticalFindings: number;
    networkLocation: NetworkRisk;
  };

  // Governance
  maintenanceWindow: string;
  approvedModels: string[];
  fallbackChain: string[];

  // Peer agents
  peerAgents?: string[];

  // Timeline
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  time: string;
  type: "deploy" | "crash" | "model_change" | "security" | "config" | "restart" | "alert";
  message: string;
}

export interface FleetSummary {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  stuck: number;
  healthyPct: number;
}
