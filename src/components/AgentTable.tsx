"use client";

import { useState } from "react";
import type { Agent, AgentStatus, Environment } from "@/lib/types";
import { AgentDetail } from "./AgentDetail";

export function AgentTable({ agents }: { agents: Agent[] }) {
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");
  const [envFilter, setEnvFilter] = useState<Environment | "all">("all");
  const [selected, setSelected] = useState<Agent | null>(null);

  const filtered = agents.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (envFilter !== "all" && a.environment !== envFilter) return false;
    return true;
  }).sort((a, b) => {
    if (a.versionDrift !== b.versionDrift) return a.versionDrift ? -1 : 1;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  return (
    <>
      <div className="glass rounded-xl overflow-hidden">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/5">
          <span className="text-xs text-gray-300">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AgentStatus | "all")}
            className="text-xs bg-surface-2 text-gray-300 border border-white/10 rounded-lg px-3 py-1.5"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="degraded">Degraded</option>
            <option value="offline">Offline</option>
            <option value="stuck">Stuck</option>
          </select>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value as Environment | "all")}
            className="text-xs bg-surface-2 text-gray-300 border border-white/10 rounded-lg px-3 py-1.5"
          >
            <option value="all">All Env</option>
            <option value="prod">Production</option>
            <option value="staging">Staging</option>
            <option value="dev">Development</option>
          </select>
          <div className="ml-auto text-xs text-gray-200">{filtered.length} agents</div>
        </div>

        {/* Desktop table header — hidden on mobile */}
        <div className="hidden lg:grid grid-cols-13 gap-2 px-4 py-2 text-[10px] text-gray-300 uppercase tracking-wider border-b border-white/5">
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Agent</div>
          <div className="col-span-1">Role</div>
          <div className="col-span-2">Current Task</div>
          <div className="col-span-1 text-center">Err/24h</div>
          <div className="col-span-1 text-center">Cost/Day</div>
          <div className="col-span-1 text-center">Version</div>
          <div className="col-span-1 text-center">Model</div>
          <div className="col-span-1 text-center">Host</div>
          <div className="col-span-1 text-center">Channel</div>
          <div className="col-span-1 text-right">Last Seen</div>
        </div>

        {/* Desktop rows — hidden on mobile */}
        <div className="hidden lg:block">
          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              className="grid grid-cols-13 gap-2 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="col-span-1 flex items-center">
                <StatusBadge status={a.status} />
              </div>
              <div className="col-span-2">
                <div className="text-sm text-white font-medium truncate">{a.name}</div>
                <div className="text-[10px] text-gray-400">{a.owner}</div>
              </div>
              <div className="col-span-1 self-center">
                <div className="text-[11px] text-gray-300 truncate">{a.role}</div>
              </div>
              <div className="col-span-2 text-xs text-gray-200 truncate self-center">
                {a.currentTask || <span className="text-gray-500">Idle</span>}
              </div>
              <div className="col-span-1 text-center self-center">
                <span className={`text-xs font-mono ${a.errors24h > 5 ? "text-red" : a.errors24h > 0 ? "text-yellow" : "text-gray-400"}`}>
                  {a.errors24h}
                </span>
              </div>
              <div className="col-span-1 text-center self-center text-xs font-mono text-cyan">
                ${a.cost.today.toFixed(2)}
              </div>
              <div className="col-span-1 text-center self-center">
                <VersionBadge agentVersion={a.agentVersion} latestVersion={a.latestVersion} versionDrift={a.versionDrift} />
              </div>
              <div className="col-span-1 text-center self-center">
                <span className="text-[10px] text-gray-300 font-mono truncate block">
                  {a.cost.model.split("/").pop()}
                </span>
              </div>
              <div className="col-span-1 text-center self-center">
                <div className="text-[10px] text-gray-300 truncate">{a.host.name}</div>
              </div>
              <div className="col-span-1 text-center self-center">
                <span className="text-[10px] text-gray-300">
                  {a.channels?.[0]?.type || "—"}
                </span>
              </div>
              <div className="col-span-1 text-right self-center text-[10px] text-gray-400 font-mono">
                {timeAgo(a.lastSeen)}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile card layout */}
        <div className="lg:hidden divide-y divide-white/5">
          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              className="p-4 hover:bg-white/[0.02] transition-colors cursor-pointer active:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StatusDot status={a.status} />
                  <div>
                    <div className="text-base text-white font-semibold">{a.name}</div>
                    <div className="text-xs text-gray-400">{a.role}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-cyan">${a.cost.today.toFixed(2)}/d</div>
                  <div className="text-[10px] text-gray-400">{timeAgo(a.lastSeen)}</div>
                </div>
              </div>
              {a.currentTask && (
                <div className="text-xs text-gray-300 bg-white/5 rounded-lg px-3 py-1.5 mt-2 truncate">
                  🔧 {a.currentTask}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-gray-400">
                <span>{a.host.name}</span>
                <span>·</span>
                <VersionBadge agentVersion={a.agentVersion} latestVersion={a.latestVersion} versionDrift={a.versionDrift} compact />
                <span>·</span>
                <span>{a.cost.model.split("/").pop()}</span>
                {a.channels?.[0] && (
                  <>
                    <span>·</span>
                    <span>{a.channels[0].type}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && <AgentDetail agent={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, string> = {
    online: "bg-green/20 text-green",
    degraded: "bg-yellow/20 text-yellow",
    offline: "bg-red/20 text-red",
    stuck: "bg-orange/20 text-orange",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const c: Record<string, string> = { online: "bg-green", degraded: "bg-yellow", offline: "bg-red", stuck: "bg-orange" };
  return <div className={`w-3 h-3 rounded-full ${c[status] || "bg-gray-500"}`} />;
}

function VersionBadge({ agentVersion, latestVersion, versionDrift, compact = false }: { agentVersion: string; latestVersion: string; versionDrift: boolean; compact?: boolean }) {
  const unknown = agentVersion === "unknown" || agentVersion === "2026.4.x" || latestVersion === "Hermes";
  const almostCurrent = versionDrift && !unknown && latestVersion.split(".").slice(0, 2).join(".") === agentVersion.split(".").slice(0, 2).join(".");
  const cls = unknown
    ? "bg-yellow/20 text-yellow"
    : versionDrift
      ? (almostCurrent ? "bg-yellow/20 text-yellow" : "bg-red/20 text-red")
      : "bg-green/20 text-green";
  const label = unknown ? "unknown" : versionDrift ? (almostCurrent ? "1 behind" : "outdated") : "current";
  const title = `${agentVersion} → latest ${latestVersion}`;
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${compact ? "text-[9px]" : "text-[10px]"} ${cls}`}>
      {compact ? agentVersion : label}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
