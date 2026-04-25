import type { Agent } from "@/lib/types";

function getNeedsAttention(agents: Agent[]): Agent[] {
  return agents.filter((a) => {
    if (a.status === "offline" || a.status === "stuck") return true;
    if (a.status === "degraded") return true;
    if (a.host?.disk > 80) return true;
    if (a.security?.criticalFindings > 0) return true;
    if (a.secrets?.expired > 0) return true;
    if (a.errors24h > 10) return true;
    return false;
  });
}

export function NeedsAttention({ agents }: { agents: Agent[] }) {
  const items = getNeedsAttention(agents);
  if (items.length === 0) return null;

  return (
    <div className="glass rounded-xl p-5">
      <h2 className="text-sm font-semibold text-red flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
        Needs Attention ({items.length})
      </h2>
      <div className="space-y-3">
        {items.map((a) => {
          const reasons = getReasons(a);
          return (
            <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3 sm:w-48 shrink-0">
                <StatusDot status={a.status} />
                <div className="text-sm text-white font-medium">{a.name}</div>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {reasons.map((r, i) => (
                  <span key={i} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${getReasonStyle(r)}`}>
                    {r}
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-300 font-mono sm:w-16 text-right shrink-0">
                {a.environment}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getReasons(a: Agent): string[] {
  const reasons: string[] = [];
  if (a.status === "offline") reasons.push("Offline");
  if (a.status === "stuck") reasons.push("Stuck");
  if (a.status === "degraded") reasons.push("Degraded");
  if (a.host?.disk > 80) reasons.push(`Disk ${a.host.disk}%`);
  if (a.errors24h > 10) reasons.push(`${a.errors24h} errors/24h`);
  if (a.secrets?.expired > 0) reasons.push(`${a.secrets.expired} key(s) expired`);
  if (a.security?.criticalFindings > 0) reasons.push(`${a.security.criticalFindings} critical vuln(s)`);
  return reasons;
}

function getReasonStyle(reason: string): string {
  if (reason.includes("Offline") || reason.includes("expired") || reason.includes("critical")) {
    return "bg-red/15 text-red";
  }
  if (reason.includes("Stuck") || reason.includes("Disk") || reason.includes("errors")) {
    return "bg-orange/15 text-orange";
  }
  return "bg-yellow/15 text-yellow";
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: "bg-green",
    degraded: "bg-yellow",
    offline: "bg-red",
    stuck: "bg-orange",
  };
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || "bg-gray-500"}`} />;
}
