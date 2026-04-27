import { Sidebar } from "@/components/Sidebar";
import { fetchAgentsFromDB } from "@/lib/fetch-agents";

export default async function SettingsPage() {
  const agents = await fetchAgentsFromDB();

  const modelCounts: Record<string, number> = {};
  for (const a of agents) {
    const m = a.cost?.model || "unknown";
    modelCounts[m] = (modelCounts[m] || 0) + 1;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 sm:p-6 pt-16 lg:pt-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-300 mt-1">Fleet configuration — live from agent data</p>
        </header>

        {/* Fleet stats */}
        <div className="glass rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Fleet Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total Agents" value={agents.length} />
            <Stat label="Online" value={agents.filter(a => a.status === "online").length} color="text-green-400" />
            <Stat label="Degraded" value={agents.filter(a => a.status === "degraded").length} color="text-yellow-400" />
            <Stat label="Offline" value={agents.filter(a => a.status === "offline").length} color="text-red-400" />
          </div>
        </div>

        {/* Models in use */}
        <div className="glass rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">Models in Use</h2>
          {Object.entries(modelCounts).length === 0 && <p className="text-sm text-gray-500">No model data from heartbeats yet</p>}
          {Object.entries(modelCounts).sort((a, b) => b[1] - a[1]).map(([model, count]) => (
            <div key={model} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-gray-200 font-mono">{model}</span>
              <span className="text-xs text-gray-400">{count} agent{count !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>

        {/* Per-agent approved models */}
        <div className="glass rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">Per-Agent Model Config</h2>
          {agents.length === 0 && <p className="text-sm text-gray-500">No agent data</p>}
          {agents.map(a => (
            <div key={a.id} className="flex items-start justify-between py-2 border-b border-white/5 last:border-0 gap-4">
              <div>
                <div className="text-sm text-white font-medium">{a.name}</div>
                <div className="text-[11px] text-gray-500">{a.host?.location || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-300 font-mono">{a.cost?.model || "—"}</div>
                {(a.approvedModels || []).length > 0 && (
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    approved: {a.approvedModels.slice(0, 2).join(", ")}
                    {a.approvedModels.length > 2 ? ` +${a.approvedModels.length - 2}` : ""}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Maintenance windows */}
        <div className="glass rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">Maintenance Windows</h2>
          {agents.map(a => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-gray-200">{a.name}</span>
              <span className="text-xs text-gray-400">{a.maintenanceWindow || "Not configured"}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-600">
          Settings are read from live agent data. To modify an agent&apos;s config, update their openclaw.json directly.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, color = "text-white" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
