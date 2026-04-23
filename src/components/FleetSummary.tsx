import { getFleetSummary } from "@/lib/mock-data";
import { agents } from "@/lib/mock-data";

export function FleetSummaryCards() {
  const s = getFleetSummary();
  const totalCostToday = agents.reduce((sum, a) => sum + a.cost.today, 0);
  const totalCostMonth = agents.reduce((sum, a) => sum + a.cost.month, 0);
  const outdatedCount = agents.filter((a) => a.versionDrift).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <SummaryCard label="Total Agents" value={s.total} color="text-white" />
      <SummaryCard
        label="Healthy"
        value={`${s.online} (${s.healthyPct}%)`}
        color="text-green"
        sub={`${s.online} online`}
      />
      <SummaryCard
        label="Degraded"
        value={s.degraded}
        color={s.degraded > 0 ? "text-yellow" : "text-gray-300"}
      />
      <SummaryCard
        label="Offline"
        value={s.offline + s.stuck}
        color={s.offline + s.stuck > 0 ? "text-red" : "text-gray-300"}
      />
      <SummaryCard
        label="Outdated"
        value={outdatedCount}
        color={outdatedCount > 0 ? "text-red" : "text-green"}
        sub={outdatedCount > 0 ? "needs updates" : "all current"}
      />
      <SummaryCard
        label="Cost Today"
        value={`$${totalCostToday.toFixed(2)}`}
        color="text-cyan"
        sub={`$${totalCostMonth.toFixed(0)}/mo`}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs text-gray-300 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-200 mt-1">{sub}</div>}
    </div>
  );
}
