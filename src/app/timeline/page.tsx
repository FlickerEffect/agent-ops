import { Sidebar } from "@/components/Sidebar";
import { getSupabaseAdmin } from "@/lib/db";

interface AuditEvent {
  id: string;
  actor_id: string;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  goal_id: string | null;
  task_id: string | null;
  metadata: Record<string, unknown> | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
}

async function fetchTimeline(): Promise<AuditEvent[]> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("audit_log")
      .select("id, actor_id, actor_name, action, entity_type, entity_id, goal_id, task_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []) as AuditEvent[];
  } catch {
    return [];
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function actionColor(action: string) {
  if (action.includes("complete") || action.includes("auto_complete")) return "text-green-400";
  if (action.includes("block") || action.includes("reject") || action.includes("fail")) return "text-red-400";
  if (action.includes("claim") || action.includes("start")) return "text-indigo-400";
  if (action.includes("create")) return "text-cyan-400";
  if (action.includes("heartbeat") || action.includes("progress")) return "text-gray-400";
  return "text-gray-300";
}

function actionIcon(action: string) {
  if (action.includes("complete")) return "✅";
  if (action.includes("block")) return "🔴";
  if (action.includes("claim")) return "🔵";
  if (action.includes("create")) return "🆕";
  if (action.includes("heartbeat")) return "💓";
  if (action.includes("reject")) return "❌";
  if (action.includes("approve")) return "✅";
  if (action.includes("assign")) return "👤";
  if (action.includes("goal")) return "🎯";
  return "📋";
}

export default async function TimelinePage() {
  const events = await fetchTimeline();

  // Group by day
  const grouped = new Map<string, AuditEvent[]>();
  for (const e of events) {
    const day = new Date(e.created_at).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    grouped.set(day, [...(grouped.get(day) || []), e]);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 sm:p-6 pt-16 lg:pt-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Timeline</h1>
          <p className="text-sm text-gray-300 mt-1">
            {events.length > 0 ? `${events.length} events across all agents` : "No events yet"}
          </p>
        </header>

        {events.length === 0 && (
          <div className="glass rounded-xl p-8 text-center text-gray-500">
            No audit events recorded yet. Events appear here as agents work tasks and goals.
          </div>
        )}

        {[...grouped.entries()].map(([day, dayEvents]) => (
          <div key={day}>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">{day}</div>
            <div className="glass rounded-xl divide-y divide-white/5">
              {dayEvents.map(e => (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02]">
                  <div className="text-base shrink-0 mt-0.5">{actionIcon(e.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${actionColor(e.action)}`}>{e.action}</span>
                      <span className="text-xs text-gray-400">by {e.actor_name || e.actor_id}</span>
                      {e.entity_type && e.entity_type !== "task" && (
                        <span className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded">{e.entity_type}</span>
                      )}
                    </div>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                        {Object.entries(e.metadata).slice(0, 3).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(" · ")}
                      </div>
                    )}
                    {e.task_id && <div className="text-[10px] text-gray-600 font-mono mt-0.5">task {e.task_id.slice(0, 8)}…</div>}
                    {e.goal_id && !e.task_id && <div className="text-[10px] text-gray-600 font-mono mt-0.5">goal {e.goal_id.slice(0, 8)}…</div>}
                  </div>
                  <div className="text-[10px] text-gray-500 shrink-0 whitespace-nowrap">{timeAgo(e.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
