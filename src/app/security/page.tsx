import { Sidebar } from "@/components/Sidebar";
import { agents } from "@/lib/mock-data";

export default function SecurityPage() {
  const issues = agents.filter(
    (a) =>
      !a.security.sshKeyOnly ||
      !a.security.fail2ban ||
      !a.security.diskEncryption ||
      a.security.firewallStatus !== "active" ||
      !a.security.auditLogEnabled ||
      a.security.criticalFindings > 0 ||
      a.secrets.expiringSoon > 0 ||
      a.secrets.expired > 0
  );
  const clean = agents.length - issues.length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-56 p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Security Overview</h1>
          <p className="text-sm text-gray-300 mt-1">Hardening status across the fleet</p>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card label="Total Agents" value={agents.length} color="text-white" />
          <Card label="Fully Hardened" value={clean} color="text-green-400" />
          <Card label="Issues Found" value={issues.length} color={issues.length > 0 ? "text-yellow-400" : "text-green-400"} />
          <Card label="Critical Vulns" value={agents.reduce((s, a) => s + a.security.criticalFindings, 0)} color="text-red-400" />
        </div>

        {/* Per-agent security table */}
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
            <div className="text-center">Vuln Scan</div>
          </div>
          {agents.map((a) => (
            <div key={a.id} className="grid grid-cols-10 gap-2 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              <div className="col-span-2">
                <div className="text-sm text-white font-medium">{a.name}</div>
                <div className="text-[10px] text-gray-400 font-mono">{a.host.ip}</div>
              </div>
              <Check ok={a.security.firewallStatus === "active"} />
              <Check ok={a.security.sshKeyOnly} />
              <Check ok={a.security.fail2ban} />
              <Check ok={a.security.diskEncryption} />
              <Check ok={a.security.auditLogEnabled} />
              <div className="text-center self-center text-xs text-gray-200 font-mono">{a.security.patchLevel}</div>
              <div className="text-center self-center">
                {a.secrets.expiringSoon > 0 ? (
                  <span className="text-xs text-yellow-400">{a.secrets.expiringSoon} expiring</span>
                ) : a.secrets.expired > 0 ? (
                  <span className="text-xs text-red-400">{a.secrets.expired} expired</span>
                ) : (
                  <span className="text-xs text-green-400">OK</span>
                )}
              </div>
              <div className="text-center self-center text-xs text-gray-200 font-mono">
                {a.security.lastVulnScan ? new Date(a.security.lastVulnScan).toLocaleDateString() : "Never"}
              </div>
            </div>
          ))}
        </div>
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

function Check({ ok }: { ok: boolean }) {
  return (
    <div className="text-center self-center text-sm">
      {ok ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}
    </div>
  );
}
