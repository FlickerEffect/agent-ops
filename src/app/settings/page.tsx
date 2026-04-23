import { Sidebar } from "@/components/Sidebar";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-56 p-4 sm:p-6 pt-16 lg:pt-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-300 mt-1">Dashboard configuration</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* General */}
          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">General</h3>
            <Field label="Organization" value="Flicker Effect" />
            <Field label="Dashboard Domain" value="teams.flickereffect.net" />
            <Field label="Default Refresh Interval" value="30 seconds" />
            <Field label="Timezone" value="UTC" />
          </div>

          {/* Notifications */}
          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <Toggle label="Agent offline alerts" enabled />
            <Toggle label="Version drift warnings" enabled />
            <Toggle label="Secret expiry reminders" enabled />
            <Toggle label="Cost threshold alerts" enabled={false} />
            <Field label="Alert Channel" value="Telegram (Chris)" />
          </div>

          {/* Security Policy */}
          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Security Policy</h3>
            <Field label="SSH Key-Only" value="Required (all agents)" />
            <Field label="fail2ban" value="Required (prod)" />
            <Field label="Disk Encryption" value="Recommended" />
            <Field label="Audit Log Retention" value="90 days (prod), 30 days (dev)" />
            <Field label="Vuln Scan Frequency" value="Weekly" />
          </div>

          {/* Model Policy */}
          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Model Policy</h3>
            <Field label="Approved Models" value="claude-opus-4-6, claude-sonnet-4-20250514, claude-haiku" />
            <Field label="Default Model" value="claude-sonnet-4-20250514" />
            <Field label="Cost Limit (per agent/day)" value="$50.00" />
            <Field label="Token Limit (per agent/day)" value="5,000,000" />
          </div>
        </div>

        <div className="text-xs text-gray-400 mt-8">
          Settings are read-only in this demo. Connect to a live backend to enable editing.
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-300">{label}</span>
      <span className="text-xs text-gray-100 font-mono">{value}</span>
    </div>
  );
}

function Toggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-300">{label}</span>
      <div className={`w-9 h-5 rounded-full relative ${enabled ? "bg-green-500/30" : "bg-gray-700"}`}>
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
            enabled ? "left-4 bg-green-400" : "left-0.5 bg-gray-500"
          }`}
        />
      </div>
    </div>
  );
}
