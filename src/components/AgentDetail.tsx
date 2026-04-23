"use client";

import type { Agent } from "@/lib/types";
import { FileViewer } from "./FileViewer";

export function AgentDetail({ agent: a, onClose }: { agent: Agent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0a0e1a] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[#0a0e1a]/95 backdrop-blur z-10 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StatusDot status={a.status} size="lg" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{a.name}</h1>
              <div className="text-sm text-gray-400">{a.role} · {a.owner} · {a.environment}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl p-2">✕</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Quick stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickStat label="Cost Today" value={`$${a.cost.today.toFixed(2)}`} sub={a.cost.model.split("/").pop() || ""} color="cyan" />
          <QuickStat label="Errors (24h)" value={String(a.errors24h)} sub={`${a.errors1h} in last hour`} color={a.errors24h > 5 ? "red" : "green"} />
          <QuickStat label="Uptime" value={a.uptime} sub={`Last seen ${formatTime(a.lastSeen)}`} color="green" />
          <QuickStat label="Tokens Today" value={formatNumber(a.cost.tokensToday)} sub={`$${a.cost.month.toFixed(0)}/mo`} color="indigo" />
        </div>

        {/* Two column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Status & Task */}
            <Section title="Status & Task">
              <KV label="Current Task" value={a.currentTask || "Idle"} large />
              <KV label="Queue Depth" value={String(a.queueDepth)} />
              <KV label="Last Heartbeat" value={formatTime(a.lastHeartbeat)} />
              {a.lastHumanInteraction && <KV label="Last Human Interaction" value={formatTime(a.lastHumanInteraction)} />}
              {a.sessionCountToday !== undefined && <KV label="Sessions Today" value={String(a.sessionCountToday)} />}
            </Section>

            {/* Projects */}
            {(a.sideProjects?.length || a.abandonedProjects?.length) ? (
              <Section title="Projects">
                {a.sideProjects?.length ? (
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 mb-1.5">Active / Side Projects</div>
                    {a.sideProjects.map((p, i) => (
                      <div key={i} className="text-sm text-green py-0.5">• {p}</div>
                    ))}
                  </div>
                ) : null}
                {a.abandonedProjects?.length ? (
                  <div>
                    <div className="text-xs text-gray-400 mb-1.5">Abandoned / Stale</div>
                    {a.abandonedProjects.map((p, i) => (
                      <div key={i} className="text-sm text-yellow/70 py-0.5">⚠ {p}</div>
                    ))}
                  </div>
                ) : null}
              </Section>
            ) : null}

            {/* Host Resources */}
            <Section title="Host">
              <KV label="Hostname" value={a.host.name} />
              <KV label="IP" value={a.host.ip} mono />
              <KV label="Location" value={a.host.location} />
              {a.host.workspaceSize && <KV label="Workspace" value={a.host.workspaceSize} />}
              <div className="mt-3 space-y-2">
                <ResourceBar label="CPU" value={a.host.cpu} />
                <ResourceBar label="RAM" value={a.host.ram} />
                <ResourceBar label="Disk" value={a.host.disk} />
              </div>
              {a.host.network !== "healthy" && (
                <div className="mt-2 text-sm text-yellow bg-yellow/10 px-3 py-2 rounded-lg">
                  ⚠ Network: {a.host.network}
                </div>
              )}
            </Section>

            {/* Tailscale */}
            {a.tailscale && (
              <Section title="Tailscale">
                <KV label="IP" value={a.tailscale.ip} mono />
                <KV label="Hostname" value={a.tailscale.hostname} />
                <KV label="Status" value={a.tailscale.status} warn={a.tailscale.status !== "online"} />
              </Section>
            )}

            {/* Communication */}
            {a.channels.length > 0 && (
              <Section title="Communication">
                {a.channels.map((ch, i) => (
                  <KV key={i} label={ch.type} value={ch.handle || "configured"} />
                ))}
              </Section>
            )}

            {/* Memory & Workspace */}
            <Section title="Memory & Workspace">
              <KV label="Memory Structure" value={a.memoryStructure} />
              {a.workspaceFiles && (
                <div className="mt-3">
                  <FileViewer agentId={a.id} files={a.workspaceFiles} />
                </div>
              )}
            </Section>

            {/* Version */}
            <Section title="Version">
              <KV label="Agent" value={a.agentVersion} warn={a.versionDrift} />
              <KV label="Latest" value={a.latestVersion} />
              <KV label="System" value={a.systemVersion} />
              <KV label="Tooling" value={a.toolingVersion} />
              {a.versionDrift && (
                <div className="mt-2 text-sm text-yellow bg-yellow/10 px-3 py-2 rounded-lg">
                  ⚠ Behind latest version
                </div>
              )}
            </Section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* SSH Access */}
            {a.sshAccess && a.sshAccess.length > 0 && (
              <Section title="SSH Access">
                <div className="space-y-1">
                  {a.sshAccess.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{s.host}</span>
                      <span className="text-gray-400 font-mono text-xs">{s.user}@{s.ip}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Service Access */}
            {a.serviceAccess && a.serviceAccess.length > 0 && (
              <Section title="API & Service Access">
                <div className="space-y-1.5">
                  {a.serviceAccess.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-white">{s.service}</span>
                        {s.scope && <span className="text-gray-400 text-xs ml-2">{s.scope}</span>}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        s.method === "OAuth" ? "bg-green/10 text-green" :
                        s.method === "PAT" ? "bg-indigo-500/10 text-indigo-400" :
                        "bg-yellow/10 text-yellow"
                      }`}>{s.method}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* MCP Connections */}
            {a.mcpConnections && a.mcpConnections.length > 0 && (
              <Section title="MCP Connections">
                {a.mcpConnections.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-white">{m.name}</span>
                      <span className="text-gray-500 text-xs ml-2">{m.type}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      m.status === "connected" ? "bg-green/10 text-green" :
                      m.status === "failed" ? "bg-red/10 text-red" :
                      "bg-gray-700 text-gray-500"
                    }`}>{m.status}</span>
                  </div>
                ))}
              </Section>
            )}

            {/* Peer Agents */}
            {a.peerAgents && a.peerAgents.length > 0 && (
              <Section title="Peer Agents">
                <div className="flex flex-wrap gap-1.5">
                  {a.peerAgents.map((p) => (
                    <span key={p} className="text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg">{p}</span>
                  ))}
                </div>
              </Section>
            )}

            {/* Cron Jobs */}
            {a.cronJobs && a.cronJobs.length > 0 && (
              <Section title="Cron Jobs">
                {a.cronJobs.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <div>
                      <span className="text-gray-300">{c.task}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{c.schedule}</span>
                  </div>
                ))}
              </Section>
            )}

            {/* Cost */}
            <Section title="Cost Breakdown">
              <KV label="Model" value={a.cost.model} mono />
              <KV label="Today" value={`$${a.cost.today.toFixed(2)}`} />
              <KV label="This Week" value={`$${a.cost.week.toFixed(2)}`} />
              <KV label="This Month" value={`$${a.cost.month.toFixed(2)}`} />
              <KV label="Tokens Today" value={formatNumber(a.cost.tokensToday)} mono />
            </Section>

            {/* Permissions */}
            <Section title="Permissions">
              <div className="flex flex-wrap gap-1.5">
                {a.permissions.map((p) => (
                  <span key={p} className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">{p}</span>
                ))}
              </div>
            </Section>

            {/* Security */}
            <Section title="Security">
              <KV label="Firewall" value={a.security.firewallStatus} warn={a.security.firewallStatus !== "active"} />
              <KV label="Ports Exposed" value={a.security.portsExposed.join(", ") || "None"} mono />
              <KV label="SSH Key-Only" value={a.security.sshKeyOnly ? "Yes ✓" : "No ⚠"} warn={!a.security.sshKeyOnly} />
              <KV label="fail2ban" value={a.security.fail2ban ? "Active ✓" : "Inactive"} warn={!a.security.fail2ban} />
              <KV label="Critical Findings" value={String(a.security.criticalFindings)} warn={a.security.criticalFindings > 0} />
              <KV label="Patch Level" value={a.security.patchLevel} />
            </Section>

            {/* Backup & Secrets */}
            <Section title="Backup & Secrets">
              <KV label="Last Backup" value={a.lastBackup ? formatTime(a.lastBackup) : "Never"} warn={!a.backupHealthy} />
              <KV label="Secrets" value={`${a.secrets.total} total, ${a.secrets.expiringSoon} expiring, ${a.secrets.expired} expired`} warn={a.secrets.expired > 0} />
              <KV label="Last Rotation" value={a.secrets.lastRotation ? formatTime(a.secrets.lastRotation) : "Never"} />
            </Section>

            {/* Governance */}
            <Section title="Governance">
              <KV label="SLA Tier" value={a.slaTier} />
              <KV label="Maintenance Window" value={a.maintenanceWindow} />
              <KV label="Approved Models" value={a.approvedModels.join(", ") || "None"} mono />
              <KV label="Auto-Restart" value={a.autoRestart ? "Enabled" : "Disabled"} />
              {a.lastRestartReason && <KV label="Last Restart" value={a.lastRestartReason} />}
            </Section>
          </div>
        </div>

        {/* Timeline — full width */}
        {a.timeline.length > 0 && (
          <Section title="Timeline">
            <div className="space-y-3">
              {a.timeline.map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <TimelineIcon type={e.type} />
                  <div>
                    <div className="text-sm text-gray-200">{e.message}</div>
                    <div className="text-xs text-gray-400 font-mono">{formatTime(e.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function QuickStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    cyan: "text-cyan",
    red: "text-red",
    green: "text-green",
    indigo: "text-indigo-400",
  };
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${colors[color] || "text-white"}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">{title}</h3>
      <div className="glass rounded-xl p-4 space-y-2">{children}</div>
    </div>
  );
}

function KV({ label, value, warn, mono, large }: { label: string; value: string; warn?: boolean; mono?: boolean; large?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`${large ? "text-sm font-medium" : "text-sm"} ${warn ? "text-yellow" : "text-gray-200"} ${mono ? "font-mono" : ""} text-right max-w-[60%] truncate`}>
        {value}
      </span>
    </div>
  );
}

function ResourceBar({ label, value }: { label: string; value: number }) {
  const color = value > 80 ? "bg-red" : value > 60 ? "bg-yellow" : "bg-green";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 w-10">{label}</span>
      <div className="flex-1 h-2.5 bg-surface-2 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm text-gray-300 font-mono w-12 text-right">{value}%</span>
    </div>
  );
}

function StatusDot({ status, size }: { status: string; size?: "lg" }) {
  const c: Record<string, string> = { online: "bg-green", degraded: "bg-yellow", offline: "bg-red", stuck: "bg-orange" };
  const s = size === "lg" ? "w-4 h-4" : "w-2.5 h-2.5";
  return <div className={`${s} rounded-full ${c[status] || "bg-gray-500"}`} />;
}

function TimelineIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    deploy: "🚀", crash: "💥", model_change: "🔄", security: "🛡️", config: "⚙️", restart: "♻️", alert: "🚨",
  };
  return <span className="text-base mt-0.5">{icons[type] || "·"}</span>;
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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
