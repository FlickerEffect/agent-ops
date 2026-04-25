import { Sidebar } from "@/components/Sidebar";
import { CoordinationView } from "@/components/CoordinationView";
import { getSupabaseAdmin } from "@/lib/db";

async function getData() {
  const db = getSupabaseAdmin();
  const [agentsRes, goalsRes, tasksRes] = await Promise.all([
    db.from("agents").select("id, name, role, status, work_state, capabilities, available_for, last_seen, model").order("name"),
    db.from("goals").select("*").order("priority").order("created_at", { ascending: false }),
    db.from("tasks").select("*").order("created_at"),
  ]);
  return { agents: agentsRes.data || [], goals: goalsRes.data || [], tasks: tasksRes.data || [] };
}

export const dynamic = "force-dynamic";

export default async function CoordinationPage() {
  const { agents, goals, tasks } = await getData();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 sm:p-6 pt-16 lg:pt-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Coordination</h1>
          <p className="text-sm text-gray-300 mt-1">What agents are working on and fleet goals</p>
        </header>
        <CoordinationView agents={agents} goals={goals} tasks={tasks} />
      </main>
    </div>
  );
}
