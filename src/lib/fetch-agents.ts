import { getSupabaseAdmin } from "@/lib/db";
import { agents as mockAgents } from "@/lib/mock-data";
import type { Agent } from "@/lib/types";

export async function fetchAgentsFromDB(): Promise<Agent[]> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("agents").select("*").order("name");
    if (error || !data || data.length === 0) return mockAgents;
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      owner: r.owner,
      environment: r.environment ?? "prod",
      tags: r.tags ?? [],
      slaTier: r.sla_tier ?? "medium",
      status: r.status ?? "offline",
      lastHeartbeat: r.last_heartbeat ?? new Date().toISOString(),
      lastSeen: r.last_seen ?? new Date().toISOString(),
      lastHumanInteraction: r.last_human_interaction,
      sessionCountToday: r.session_count_today ?? 0,
      currentTask: r.current_task ?? null,
      queueDepth: r.queue_depth ?? 0,
      uptime: r.uptime ?? "unknown",
      sideProjects: r.side_projects ?? [],
      abandonedProjects: r.abandoned_projects ?? [],
      agentVersion: r.agent_version ?? "unknown",
      latestVersion: r.agent_version ?? "unknown",
      systemVersion: r.agent_version ?? "unknown",
      toolingVersion: "Node v22.x",
      versionDrift: false,
      host: {
        name: r.host_name ?? "",
        ip: r.host_ip ?? "",
        location: r.host_location ?? "",
        cpu: r.host_cpu ?? 0,
        ram: r.host_ram ?? 0,
        disk: r.host_disk ?? 0,
        network: r.host_network ?? "healthy",
        workspaceSize: r.workspace_size,
      },
      tailscale: r.tailscale_ip ? { ip: r.tailscale_ip, hostname: "", status: r.tailscale_status ?? "offline" } : undefined,
      channels: r.channels ?? [],
      memoryStructure: r.memory_structure ?? "openclaw-standard",
      workspaceFiles: r.workspace_files ?? {},
      sshAccess: r.ssh_access ?? [],
      serviceAccess: r.service_access ?? [],
      mcpConnections: r.mcp_connections ?? [],
      cronJobs: r.cron_jobs ?? [],
      errors1h: r.errors_1h ?? 0,
      errors24h: r.errors_24h ?? 0,
      taskStartDelay: 0,
      completionTime: 0,
      apiLatency: r.api_latency ?? 0,
      cost: {
        today: r.cost_today ?? 0,
        week: r.cost_week ?? 0,
        month: r.cost_month ?? 0,
        tokensToday: r.tokens_today ?? 0,
        model: r.model ?? "unknown",
      },
      permissions: r.permissions ?? [],
      lastBackup: null,
      lastRestoreTest: null,
      backupHealthy: r.backup_healthy ?? false,
      secrets: {
        total: r.secrets_total ?? 0,
        expiringSoon: r.secrets_expiring ?? 0,
        expired: r.secrets_expired ?? 0,
        lastRotation: r.last_rotation ?? null,
      },
      autoRestart: r.auto_restart ?? false,
      lastRestartReason: r.last_restart_reason ?? null,
      lastRestartTime: r.last_restart_time ?? null,
      security: r.security ?? {
        patchLevel: "unknown", lastOsUpdate: "unknown", firewallStatus: "unknown",
        portsExposed: [], sshPasswordDisabled: true, sshKeyOnly: true, fail2ban: false,
        diskEncryption: false, mfaEnabled: false, auditLogEnabled: false, auditRetentionDays: 0,
        lastVulnScan: null, criticalFindings: 0, networkLocation: "cloud",
      },
      maintenanceWindow: r.maintenance_window ?? "Not configured",
      approvedModels: r.approved_models ?? [],
      fallbackChain: r.fallback_chain ?? [],
      peerAgents: r.peer_agents ?? [],
      timeline: [],
    })) as Agent[];
  } catch {
    return mockAgents;
  }
}
