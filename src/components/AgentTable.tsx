"use client";

import { useState } from "react";
import { agents } from "@/lib/mock-data";
import type { Agent, AgentStatus, Environment } from "@/lib/types";
import { AgentDetail } from "./AgentDetail";

export function AgentTable() {
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");
  const [envFilter, setEnvFilter] = useState<Environment | "all">("all");
  const [selected, setSelected] = useState<Agent | null>(null);

  const filtered = agents.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (envFilter !== "all" && a.environment !== envFilter) return false;
    return true;
  });

  return (
    <>
      <div className="glass rounded-xl overflow-hidden">
        {/* Filters */}
        <div className="flex items-center gap-4 p-4 border-b border-white/5">
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

        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] text-gray-300 uppercase tracking-wider border-b border-white/5">
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Agent</div>
          <div className="col-span-2">Current Task</div>
          <div className="col-span-1 text-center">Queue</div>
          <div className="col-span-1 text-center">Err/24h</div>
          <div className="col-span-1 text-center">Latency</div>
          <div className="col-span-1 text-center">Cost/Day</div>
          <div className="col-span-1 text-center">Version</div>
          <div className="col-span-1 text-center">Host / IP</div>
          <div className="col-span-1 text-right">Last Seen</div>
        </div>

        {/* Rows */}
        {filtered.map((a) => (
          <div
            key={a.id}
            onClick={() => setSelected(a)}
            className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="col-span-1 flex items-center">
              <StatusBadge status={a.status} />
            </div>
            <div className="col-span-2">
              <div className="text-sm text-white font-medium truncate">{a.name}</div>
              <div className="text-[10px] text-gray-200">
                {a.environment} · {a.tags[0]}
              </div>
            </div>
            <div className="col-span-2 text-xs text-gray-200 truncate self-center">
              {a.currentTask || "—"}
            </div>
            <div className="col-span-1 text-center self-center">
              <span className={`text-xs font-mono ${a.queueDepth > 3 ? "text-yellow" : "text-gray-200"}`}>
                {a.queueDepth}
              </span>
            </div>
            <div className="col-span-1 text-center self-center">
              <span className={`text-xs font-mono ${a.errors24h > 5 ? "text-red" : a.errors24h > 0 ? "text-yellow" : "text-gray-300"}`}>
                {a.errors24h}
              </span>
            </div>
            <div className="col-span-1 text-center self-center text-xs font-mono text-gray-200">
              {a.apiLatency > 0 ? `${a.apiLatency}ms` : "—"}
            </div>
            <div className="col-span-1 text-center self-center text-xs font-mono text-cyan">
              ${a.cost.today.toFixed(2)}
            </div>
            <div className="col-span-1 text-center self-center">
              {a.versionDrift ? (
                <span className="text-[10px] px-1.5 py-0.5 bg-yellow/10 text-yellow rounded">drift</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 bg-green/10 text-green rounded">current</span>
              )}
            </div>
            <div className="col-span-1 text-center self-center">
              <div className="text-[10px] text-gray-200 truncate">{a.host.name}</div>
              <div className="text-[10px] text-gray-400 font-mono">{a.host.ip}</div>
            </div>
            <div className="col-span-1 text-right self-center text-[10px] text-gray-300 font-mono">
              {timeAgo(a.lastSeen)}
            </div>
          </div>
        ))}
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

function HostMini({ cpu, ram }: { cpu: number; ram: number }) {
  const cpuColor = cpu > 80 ? "bg-red" : cpu > 50 ? "bg-yellow" : "bg-green";
  const ramColor = ram > 80 ? "bg-red" : ram > 50 ? "bg-yellow" : "bg-green";
  return (
    <div className="flex items-center gap-1">
      <div className="w-8 h-1.5 bg-surface-2 rounded-full overflow-hidden" title={`CPU ${cpu}%`}>
        <div className={`h-full ${cpuColor} rounded-full`} style={{ width: `${cpu}%` }} />
      </div>
      <div className="w-8 h-1.5 bg-surface-2 rounded-full overflow-hidden" title={`RAM ${ram}%`}>
        <div className={`h-full ${ramColor} rounded-full`} style={{ width: `${ram}%` }} />
      </div>
    </div>
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
