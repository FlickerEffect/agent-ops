import { Sidebar } from "@/components/Sidebar";
import { AgentTable } from "@/components/AgentTable";
import { fetchAgentsFromDB } from "@/lib/fetch-agents";

export default async function AgentsPage() {
  const agents = await fetchAgentsFromDB();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 sm:p-6 pt-16 lg:pt-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-sm text-gray-300 mt-1">All agents in the fleet</p>
        </header>
        <AgentTable agents={agents} />
      </main>
    </div>
  );
}
