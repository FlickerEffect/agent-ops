"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#111827] border border-white/10 rounded-lg p-2 text-white"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-56 bg-[#111827] border-r border-white/5 flex flex-col z-40 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
          <SidebarLink href="/" icon="📊" label="Dashboard" active={pathname === "/"} onClick={() => setOpen(false)} />
          <SidebarLink href="/agents" icon="🤖" label="Agents" active={pathname === "/agents"} onClick={() => setOpen(false)} />
          <SidebarLink href="/security" icon="🛡️" label="Security" active={pathname === "/security"} onClick={() => setOpen(false)} />
          <SidebarLink href="/costs" icon="💰" label="Costs" active={pathname === "/costs"} onClick={() => setOpen(false)} />
          <SidebarLink href="/timeline" icon="📜" label="Timeline" active={pathname === "/timeline"} onClick={() => setOpen(false)} />
          <SidebarLink href="/settings" icon="⚙️" label="Settings" active={pathname === "/settings"} onClick={() => setOpen(false)} />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-3">
          {session?.user && (
            <div className="flex items-center gap-2">
              {session.user.image && (
                <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
              )}
              <div className="text-[10px] text-gray-300 truncate">{session.user.email}</div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="w-full text-left text-[11px] text-gray-400 hover:text-red-400 transition-colors"
          >
            Sign out →
          </button>
          <div className="text-[10px] text-gray-500">agentops.flickereffect.net · v0.2.0</div>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ href, icon, label, active, onClick }: { href: string; icon: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-indigo-500/10 text-white" : "text-gray-300 hover:text-white hover:bg-white/5"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}
