"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-[#111827] border-r border-white/5 flex flex-col">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold">
            F
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Flicker Effect</div>
            <div className="text-[10px] text-gray-400">Agent Ops</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <SidebarLink href="/" icon="📊" label="Dashboard" active={pathname === "/"} />
        <SidebarLink href="/agents" icon="🤖" label="Agents" active={pathname === "/agents"} />
        <SidebarLink href="/security" icon="🛡️" label="Security" active={pathname === "/security"} />
        <SidebarLink href="/costs" icon="💰" label="Costs" active={pathname === "/costs"} />
        <SidebarLink href="/timeline" icon="📜" label="Timeline" active={pathname === "/timeline"} />
        <SidebarLink href="/settings" icon="⚙️" label="Settings" active={pathname === "/settings"} />
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="text-[10px] text-gray-400">teams.flickereffect.net</div>
        <div className="text-[10px] text-gray-500 mt-1">v0.1.0</div>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string; icon: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-indigo-500/10 text-white" : "text-gray-300 hover:text-white hover:bg-white/5"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}
