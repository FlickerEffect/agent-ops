import { Sidebar } from "@/components/Sidebar";
import { fetchAgentsFromDB } from "@/lib/fetch-agents";
import type { TimelineEvent } from "@/lib/types";

interface FlatEvent extends TimelineEvent {
  agentName: string;
  agentId: string;
}

export default async function TimelinePage() {
  const agents = await fetchAgentsFromDB();
  // Flatten all events across agents and sort by time descending
  const events: FlatEvent[] = agents
    .flatMap((a) =>
      a.timeline.map((e) => ({
        ...e,
        agentName: a.name,
        agentId: a.id,
      }))
    )
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const icons: Record<string, string> = {
    deploy: "🚀",
    crash: "💥",
    model_change: "🔄",
    security: "🛡️",
    config: "⚙️",
    restart: "♻️",
    alert: "🚨",
  };

  const typeColors: Record<string, string> = {
    deploy: "text-green-400",
    crash: "text-red-400",
    model_change: "text-blue-400",
    security: "text-yellow-400",
    config: "text-gray-200",
    restart: "text-cyan-400",
    alert: "text-red-400",
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 sm:p-6 pt-16 lg:pt-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Timeline</h1>
          <p className="text-sm text-gray-300 mt-1">All events across the fleet</p>
        </header>

        <div className="glass rounded-xl p-5">
          <div className="space-y-0">
            {events.map((e, i) => (
              <div key={i} className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
                <div className="text-lg mt-0.5">{icons[e.type] || "·"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${typeColors[e.type] || "text-gray-200"} uppercase`}>
                      {e.type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-300 font-medium">{e.agentName}</span>
                  </div>
                  <div className="text-sm text-gray-100 mt-0.5">{e.message}</div>
                </div>
                <div className="text-[10px] text-gray-400 font-mono whitespace-nowrap mt-1">
                  {formatTime(e.time)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
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
