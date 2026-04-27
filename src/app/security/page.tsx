import { Sidebar } from "@/components/Sidebar";
import { fetchAgentsFromDB } from "@/lib/fetch-agents";

export default async function SecurityPage() {
  const agents = await fetchAgentsFromDB();

  const issues = agents.filter(a => {
    const s = a.security;
    if (!s) return true;
    return !s.sshKeyOnly || !s.fail2ban || !s.diskEncryption ||
      s.firewallStatus !== "active" || !s.auditLogEnabled ||
      s.criticalFindings > 0 || a.secrets?.expiringSoon > 0 || a.secrets?.expired > 0;
  });
  const clean = agents.length - issues.length;
  const totalCritical = agents.reduce((s, a) => s + (a.security?.criticalFindings ?? 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 sm:p-6 pt-16 lg:pt-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Security Overview</h1>
          <p className="text-sm text-gray-300 mt-1">Hardening status across the fleet — live from agent heartbeats</p>
        </header>

        <div className="grid grid-cols-4 gap-4">
          <Card label="Total Agents" value={agents.length} color="text-white" />
          <Card label="Fully Hardened" value={clean} color="text-green-400" />
          <Card label="Issues Found" value={issues.length} color={issues.length > 0 ? "text-yellow-400" : "text-green-400"} />
          <Card label="Critical Vulns" value={totalCritical} color={totalCritical > 0 ? "text-red-400" : "text-green-400"} />
        </div>

        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-10 gap-2 px-4 py-2 text-[10px] text-gray-300 uppercase tracking-wider border-b border-white/5">
            <div className="col-span-2">Agent</div>
            <div className="text-center">Firewall</div>
            <div className="text-center">SSH Key</div>
            <div className="text-center">fail2ban</div>
            <div className="text-center">Encryption</div>
            <div className="text-center">Audit Log</div>
            <div className="text-center">Patch Date</div>
            <div className="text-center">Secrets</div>
            <div className="text-center">Open Ports</div>
          </div>
          {agents.length === 0 && (
            <div className="p-6 text-center text-gray-500 text-sm">No agent data — heartbeats not yet received</div>
          )}
          {agents.map((a) => {
            const s = a.security;
            return (
              <div key={a.id} className="grid grid-cols-10 gap-2 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <div className="col-span-2">
                  <div className="text-sm text-white font-medium">{a.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{a.host?.ip || "—"}</div>
                </div>
                <Check ok={s?.firewallStatus === "active"} label={s?.firewallStatus} />
                <Check ok={!!s?.sshKeyOnly} />
                <Check ok={!!s?.fail2ban} />
                <Check ok={!!s?.diskEncryption} />
                <Check ok={!!s?.auditLogEnabled} />
                <div className="text-center self-center text-xs text-gray-200 font-mono">{s?.patchLevel || "—"}</div>
                <div className="text-center self-center">
                  {(a.secrets?.expired ?? 0) > 0 ? (
                    <span className="text-xs text-red-400">{a.secrets.expired} expired</span>
                  ) : (a.secrets?.expiringSoon ?? 0) > 0 ? (
                    <span className="text-xs text-yellow-400">{a.secrets.expiringSoon} expiring</span>
                  ) : (
                    <span className="text-xs text-green-400">OK</span>
                  )}
                </div>
                <div className="text-center self-center text-[10px] text-gray-400 font-mono">
                  {s?.portsExposed?.length ? s.portsExposed.slice(0, 4).join(", ") : "—"}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-gray-600">Security data collected via agent heartbeat scripts. Values reflect state at last heartbeat.</p>
      </main>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs text-gray-300 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <div className="text-center self-center">
      <span className={ok ? "text-green-400 text-sm" : "text-red-400 text-sm"}>{ok ? "✓" : "✗"}</span>
      {label && label !== "active" && label !== "inactive" && label !== "unknown" && (
        <div className="text-[9px] text-gray-500">{label}</div>
      )}
    </div>
  );
}
