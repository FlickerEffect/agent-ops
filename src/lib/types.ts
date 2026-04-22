export type AgentStatus = "online" | "degraded" | "offline" | "stuck";
export type Environment = "prod" | "staging" | "dev";
export type SLATier = "critical" | "high" | "medium" | "low";
export type NetworkRisk = "cloud" | "corp-vpc" | "home" | "public-subnet";

export interface Agent {
  id: string;
  name: string;
  owner: string;
  environment: Environment;
  tags: string[];
  slaTier: SLATier;

  // Status
  status: AgentStatus;
  lastHeartbeat: string; // ISO
  lastSeen: string; // ISO
  currentTask: string | null;
  queueDepth: number;
  uptime: string;

  // Version
  agentVersion: string;
  latestVersion: string;
  systemVersion: string;
  toolingVersion: string;
  versionDrift: boolean;

  // Host
  host: {
    name: string;
    cpu: number; // 0-100
    ram: number; // 0-100
    disk: number; // 0-100
    network: "healthy" | "degraded" | "down";
    gpu?: { usage: number; temp: number };
    ip: string;
    location: string;
  };

  // Errors & Latency
  errors1h: number;
  errors24h: number;
  taskStartDelay: number; // ms
  completionTime: number; // ms avg
  apiLatency: number; // ms avg

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
  lastBackup: string | null; // ISO
  lastRestoreTest: string | null; // ISO
  backupHealthy: boolean;

  // Secrets
  secrets: {
    total: number;
    expiringSoon: number; // within 7 days
    expired: number;
    lastRotation: string | null; // ISO
  };

  // Auto-restart
  autoRestart: boolean;
  lastRestartReason: string | null;
  lastRestartTime: string | null;

  // Security
  security: {
    patchLevel: string; // date
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

  // Timeline
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  time: string; // ISO
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
