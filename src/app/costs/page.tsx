import { Sidebar } from "@/components/Sidebar";
import { fetchAgentsFromDB } from "@/lib/fetch-agents";

export default async function CostsPage() {
  const agents = await fetchAgentsFromDB();
  const totalToday = agents.reduce((s, a) => s + a.cost.today, 0);
  const totalWeek = agents.reduce((s, a) => s + a.cost.week, 0);
  const totalMonth = agents.reduce((s, a) => s + a.cost.month, 0);
  const totalTokens = agents.reduce((s, a) => s + a.cost.tokensToday, 0);

  const sorted = [...agents].sort((a, b) => b.cost.month - a.cost.month);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 sm:p-6 pt-16 lg:pt-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Cost Tracking</h1>
          <p className="text-sm text-gray-300 mt-1">Token usage and spend by agent</p>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card label="Today" value={`$${totalToday.toFixed(2)}`} sub={`${totalTokens.toLocaleString()} tokens`} color="text-cyan-400" />
          <Card label="This Week" value={`$${totalWeek.toFixed(2)}`} color="text-cyan-400" />
          <Card label="This Month" value={`$${totalMonth.toFixed(2)}`} color="text-cyan-400" />
          <Card label="Projected/Year" value={`$${(totalMonth * 12).toFixed(0)}`} color="text-gray-200" />
        </div>

        {/* Per-agent breakdown */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-8 gap-2 px-4 py-2 text-[10px] text-gray-300 uppercase tracking-wider border-b border-white/5">
            <div className="col-span-2">Agent</div>
            <div className="text-center">Model</div>
            <div className="text-right">Tokens/Day</div>
            <div className="text-right">$/Day</div>
            <div className="text-right">$/Week</div>
            <div className="text-right">$/Month</div>
            <div className="text-right">% of Total</div>
          </div>
          {sorted.map((a) => {
            const pct = totalMonth > 0 ? ((a.cost.month / totalMonth) * 100).toFixed(1) : "0";
            return (
              <div key={a.id} className="grid grid-cols-8 gap-2 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <div className="col-span-2">
                  <div className="text-sm text-white font-medium">{a.name}</div>
                  <div className="text-[10px] text-gray-400">{a.environment}</div>
                </div>
                <div className="text-center self-center text-xs text-gray-200 font-mono truncate">{a.cost.model}</div>
                <div className="text-right self-center text-xs text-gray-200 font-mono">{a.cost.tokensToday.toLocaleString()}</div>
                <div className="text-right self-center text-xs text-cyan-400 font-mono">${a.cost.today.toFixed(2)}</div>
                <div className="text-right self-center text-xs text-gray-200 font-mono">${a.cost.week.toFixed(2)}</div>
                <div className="text-right self-center text-xs text-gray-200 font-mono">${a.cost.month.toFixed(2)}</div>
                <div className="text-right self-center">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-[#1a2234] rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-300 font-mono w-10">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs text-gray-300 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
