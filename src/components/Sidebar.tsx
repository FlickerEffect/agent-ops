import Link from "next/link";

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-surface border-r border-white/5 flex flex-col">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">
            F
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Flicker Effect</div>
            <div className="text-[10px] text-gray-300">Agent Ops</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <SidebarLink href="/" icon="📊" label="Dashboard" active />
        <SidebarLink href="/agents" icon="🤖" label="Agents" />
        <SidebarLink href="/security" icon="🛡️" label="Security" />
        <SidebarLink href="/costs" icon="💰" label="Costs" />
        <SidebarLink href="/timeline" icon="📜" label="Timeline" />
        <SidebarLink href="/settings" icon="⚙️" label="Settings" />
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="text-[10px] text-gray-200">teams.flickereffect.net</div>
        <div className="text-[10px] text-gray-300 mt-1">v0.1.0</div>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string; icon: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-accent/10 text-white" : "text-gray-200 hover:text-white hover:bg-white/5"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}
