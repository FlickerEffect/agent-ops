"use client";

import type { Agent } from "@/lib/types";

export function AgentDetail({ agent: a, onClose }: { agent: Agent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-2xl bg-surface border-l border-white/5 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface z-10 p-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <StatusDot status={a.status} />
              <h2 className="text-lg font-bold text-white">{a.name}</h2>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {a.id} · {a.environment} · {a.tags.join(", ")}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 space-y-6">
          {/* Status & Task */}
          <Section title="Status">
            <KV label="Current Task" value={a.currentTask || "Idle"} />
            <KV label="Queue Depth" value={String(a.queueDepth)} />
            <KV label="Uptime" value={a.uptime} />
            <KV label="Last Heartbeat" value={formatTime(a.lastHeartbeat)} />
            <KV label="Last Seen" value={formatTime(a.lastSeen)} />
          </Section>

          {/* Version */}
          <Section title="Version">
            <KV label="Agent" value={a.agentVersion} warn={a.versionDrift} />
            <KV label="Latest" value={a.latestVersion} />
            <KV label="System" value={a.systemVersion} />
            <KV label="Tooling" value={a.toolingVersion} />
            {a.versionDrift && (
              <div className="mt-2 text-xs text-yellow bg-yellow/10 px-3 py-1.5 rounded-lg">
                ⚠ Version drift detected — agent behind latest approved version
              </div>
            )}
          </Section>

          {/* Host Resources */}
          <Section title="Host Resources">
            <KV label="Host" value={a.host.name} />
            <ResourceBar label="CPU" value={a.host.cpu} />
            <ResourceBar label="RAM" value={a.host.ram} />
            <ResourceBar label="Disk" value={a.host.disk} />
            <KV label="Network" value={a.host.network} warn={a.host.network !== "healthy"} />
            {a.host.gpu && (
              <>
                <ResourceBar label="GPU" value={a.host.gpu.usage} />
                <KV label="GPU Temp" value={`${a.host.gpu.temp}°C`} warn={a.host.gpu.temp > 80} />
              </>
            )}
          </Section>

          {/* Errors & Latency */}
          <Section title="Performance">
            <KV label="Errors (1h)" value={String(a.errors1h)} warn={a.errors1h > 0} />
            <KV label="Errors (24h)" value={String(a.errors24h)} warn={a.errors24h > 3} />
            <KV label="Task Start Delay" value={`${a.taskStartDelay}ms`} />
            <KV label="Avg Completion" value={`${(a.completionTime / 1000).toFixed(1)}s`} />
            <KV label="API Latency" value={`${a.apiLatency}ms`} />
          </Section>

          {/* Cost */}
          <Section title="Cost">
            <KV label="Model" value={a.cost.model} mono />
            <KV label="Today" value={`$${a.cost.today.toFixed(2)}`} />
            <KV label="This Week" value={`$${a.cost.week.toFixed(2)}`} />
            <KV label="This Month" value={`$${a.cost.month.toFixed(2)}`} />
            <KV label="Tokens Today" value={a.cost.tokensToday.toLocaleString()} mono />
          </Section>

          {/* Permissions */}
          <Section title="Permissions">
            <div className="flex flex-wrap gap-1.5">
              {a.permissions.map((p) => (
                <span key={p} className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                  {p}
                </span>
              ))}
            </div>
          </Section>

          {/* Backup & Secrets */}
          <Section title="Backup & Secrets">
            <KV label="Last Backup" value={a.lastBackup ? formatTime(a.lastBackup) : "Never"} warn={!a.backupHealthy} />
            <KV label="Last Restore Test" value={a.lastRestoreTest ? formatTime(a.lastRestoreTest) : "Never"} warn={!a.lastRestoreTest} />
            <KV label="Backup Healthy" value={a.backupHealthy ? "Yes" : "No"} warn={!a.backupHealthy} />
            <KV label="Secrets" value={`${a.secrets.total} total`} />
            <KV label="Expiring Soon" value={String(a.secrets.expiringSoon)} warn={a.secrets.expiringSoon > 0} />
            <KV label="Expired" value={String(a.secrets.expired)} warn={a.secrets.expired > 0} />
            <KV label="Last Rotation" value={a.secrets.lastRotation ? formatTime(a.secrets.lastRotation) : "Never"} />
          </Section>

          {/* Auto-restart */}
          <Section title="Self-Heal">
            <KV label="Auto-Restart" value={a.autoRestart ? "Enabled" : "Disabled"} warn={!a.autoRestart} />
            <KV label="Last Restart" value={a.lastRestartTime ? formatTime(a.lastRestartTime) : "Never"} />
            <KV label="Reason" value={a.lastRestartReason || "—"} />
          </Section>

          {/* Security */}
          <Section title="Security">
            <KV label="Patch Level" value={a.security.patchLevel} />
            <KV label="Last OS Update" value={a.security.lastOsUpdate} />
            <KV label="Firewall" value={a.security.firewallStatus} warn={a.security.firewallStatus !== "active"} />
            <KV label="Ports Exposed" value={a.security.portsExposed.length > 0 ? a.security.portsExposed.join(", ") : "None"} mono />
            <KV label="SSH Password Login" value={a.security.sshPasswordDisabled ? "Disabled ✓" : "ENABLED ⚠"} warn={!a.security.sshPasswordDisabled} />
            <KV label="SSH Key-Only" value={a.security.sshKeyOnly ? "Yes ✓" : "No ⚠"} warn={!a.security.sshKeyOnly} />
            <KV label="fail2ban" value={a.security.fail2ban ? "Active ✓" : "Inactive ⚠"} warn={!a.security.fail2ban} />
            <KV label="Disk Encryption" value={a.security.diskEncryption ? "Yes ✓" : "No ⚠"} warn={!a.security.diskEncryption} />
            <KV label="MFA" value={a.security.mfaEnabled ? "Enabled ✓" : "Disabled"} />
            <KV label="Audit Log" value={a.security.auditLogEnabled ? `Enabled (${a.security.auditRetentionDays}d retention)` : "Disabled ⚠"} warn={!a.security.auditLogEnabled} />
            <KV label="Last Vuln Scan" value={a.security.lastVulnScan ? formatTime(a.security.lastVulnScan) : "Never"} warn={!a.security.lastVulnScan} />
            <KV label="Critical Findings" value={String(a.security.criticalFindings)} warn={a.security.criticalFindings > 0} />
            <KV label="Network Location" value={a.security.networkLocation} />
          </Section>

          {/* Governance */}
          <Section title="Governance">
            <KV label="Owner" value={a.owner} />
            <KV label="SLA Tier" value={a.slaTier} />
            <KV label="Maintenance Window" value={a.maintenanceWindow} />
            <KV label="Approved Models" value={a.approvedModels.join(", ") || "None"} mono />
            <KV label="Fallback Chain" value={a.fallbackChain.join(" → ") || "None"} mono />
          </Section>

          {/* Timeline */}
          <Section title="Timeline">
            <div className="space-y-3">
              {a.timeline.map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <TimelineIcon type={e.type} />
                  <div>
                    <div className="text-xs text-gray-300">{e.message}</div>
                    <div className="text-[10px] text-gray-600 font-mono">{formatTime(e.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">{title}</h3>
      <div className="glass rounded-xl p-4 space-y-2">{children}</div>
    </div>
  );
}

function KV({ label, value, warn, mono }: { label: string; value: string; warn?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`text-xs ${warn ? "text-yellow" : "text-gray-300"} ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function ResourceBar({ label, value }: { label: string; value: number }) {
  const color = value > 80 ? "bg-red" : value > 60 ? "bg-yellow" : "bg-green";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-10">{label}</span>
      <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-400 font-mono w-10 text-right">{value}%</span>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const c: Record<string, string> = { online: "bg-green", degraded: "bg-yellow", offline: "bg-red", stuck: "bg-orange" };
  return <div className={`w-2.5 h-2.5 rounded-full ${c[status] || "bg-gray-500"}`} />;
}

function TimelineIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    deploy: "🚀",
    crash: "💥",
    model_change: "🔄",
    security: "🛡️",
    config: "⚙️",
    restart: "♻️",
    alert: "🚨",
  };
  return <span className="text-sm mt-0.5">{icons[type] || "·"}</span>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
