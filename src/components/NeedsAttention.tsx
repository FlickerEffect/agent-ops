import { getNeedsAttention } from "@/lib/mock-data";

export function NeedsAttention() {
  const items = getNeedsAttention();
  if (items.length === 0) return null;

  return (
    <div className="glass rounded-xl p-5">
      <h2 className="text-sm font-semibold text-red flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
        Needs Attention ({items.length})
      </h2>
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
              <StatusDot status={a.status} />
              <div>
                <div className="text-sm text-white font-medium">{a.name}</div>
                <div className="text-xs text-gray-500">{getReasons(a).join(" · ")}</div>
              </div>
            </div>
            <div className="text-xs text-gray-600 font-mono">
              {a.environment}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getReasons(a: ReturnType<typeof getNeedsAttention>[0]): string[] {
  const reasons: string[] = [];
  if (a.status === "offline") reasons.push("Offline");
  if (a.status === "stuck") reasons.push("Stuck");
  if (a.status === "degraded") reasons.push("Degraded");
  if (a.versionDrift) reasons.push("Version drift");
  if (a.errors24h > 5) reasons.push(`${a.errors24h} errors/24h`);
  if (a.secrets.expiringSoon > 0) reasons.push(`${a.secrets.expiringSoon} key(s) expiring`);
  if (a.secrets.expired > 0) reasons.push(`${a.secrets.expired} key(s) expired`);
  if (a.security.criticalFindings > 0) reasons.push(`${a.security.criticalFindings} critical vulns`);
  if (!a.backupHealthy) reasons.push("Backup unhealthy");
  return reasons;
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
