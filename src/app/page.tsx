import { FleetSummaryCards } from "@/components/FleetSummary";
import { NeedsAttention } from "@/components/NeedsAttention";
import { AgentTable } from "@/components/AgentTable";
import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 sm:p-6 space-y-6 pt-16 lg:pt-6">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Agent Operations</h1>
            <p className="text-sm text-gray-300 mt-1">Flicker Effect fleet overview</p>
          </div>
          <div className="text-xs text-gray-300 font-mono">
            Last refresh: just now
          </div>
        </header>
        <FleetSummaryCards />
        <NeedsAttention />
        <AgentTable />
      </main>
    </div>
  );
}
