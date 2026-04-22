import { Sidebar } from "@/components/Sidebar";
import { AgentTable } from "@/components/AgentTable";

export default function AgentsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-56 p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-sm text-gray-300 mt-1">All agents in the fleet</p>
        </header>
        <AgentTable />
      </main>
    </div>
  );
}
