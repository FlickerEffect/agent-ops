"use client";

import { useState } from "react";

interface WorkState { task?: string; context?: string; progress?: string; blockers?: string[]; needs_help?: boolean; help_type?: string; outputs?: string[]; }
interface Agent { id: string; name: string; role: string; status: string; work_state: WorkState | null; capabilities: string[]; available_for: string[]; last_seen: string; model: string; }
interface Task { id: string; goal_id: string | null; title: string; description: string; done_when: string; required_capabilities: string[]; depends_on?: string[]; status: string; claimed_by: string | null; progress_notes: string | null; blocked_reason: string | null; verification_notes: string | null; created_at: string; updated_at: string; }
interface Goal { id: string; title: string; description: string; status: string; priority: string; assigned_to: string | null; lead_agent_id?: string | null; claimed_by: string | null; required_capabilities: string[]; progress: number; created_at: string; updated_at: string; }
interface AuditEvent { id: string; actor_id: string; actor_name?: string | null; actor_scope?: string | null; action: string; entity_type: string; entity_id?: string | null; goal_id?: string | null; task_id?: string | null; request_source?: string | null; metadata?: Record<string, unknown> | null; created_at: string; }

export function CoordinationView({ agents, goals, tasks, pendingTasks, auditEvents }: { agents: Agent[]; goals: Goal[]; tasks: Task[]; pendingTasks: Task[]; auditEvents: AuditEvent[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const working = agents.filter(a => {
    const ws = a.work_state;
    return ws && ws.task && ws.task !== "idle" && ws.task !== "not reporting" && ws.task !== "Routine heartbeat monitoring and fleet coordination";
  });
  const idle = agents.filter(a => !working.includes(a));
  const blocked = agents.filter(a => a.work_state?.needs_help);
  const activeGoals = goals.filter(g => ["open", "in_progress", "blocked"].includes(g.status));
  const completedGoals = goals.filter(g => g.status === "completed");

  async function assignTask(taskId: string, agentId: string) {
    setBusy(taskId);
    try {
      const res = await fetch("/api/ui/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign", task_id: taskId, agent_id: agentId }) });
      if (!res.ok) throw new Error(await res.text());
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function post(url: string, body: Record<string, unknown>) {
    setBusy(JSON.stringify(body));
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <CreateGoal agents={agents} onCreate={(body) => post("/api/ui/goals", { action: "create", ...body })} busy={!!busy} />

      {pendingTasks.length > 0 && (
        <div className="bg-yellow/10 border border-yellow/20 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-yellow">Pending Approval ({pendingTasks.length})</h2>
              <p className="text-xs text-gray-400">Lead-proposed tasks wait here until Chris approves or rejects them.</p>
            </div>
          </div>
          <div className="space-y-3">
            {groupByGoal(pendingTasks).map(group => {
              const goal = goals.find(g => g.id === group.goalId);
              return (
                <div key={group.goalId || "ungrouped"} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="text-white font-medium">{goal?.title || "Ungrouped tasks"}</div>
                      {goal?.lead_agent_id && <div className="text-xs text-gray-400">Lead: {agentName(agents, goal.lead_agent_id)}</div>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button disabled={!!busy} onClick={() => post("/api/ui/tasks", { action: "approve", goal_id: group.goalId })} className="px-3 py-1 rounded bg-green/20 text-green text-xs hover:bg-green/30 disabled:opacity-50">Approve all</button>
                      <button disabled={!!busy} onClick={() => post("/api/ui/tasks", { action: "reject", goal_id: group.goalId, reason: "Rejected in approval UI" })} className="px-3 py-1 rounded bg-red/20 text-red text-xs hover:bg-red/30 disabled:opacity-50">Reject all</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {group.tasks.map(t => <TaskCard key={t.id} task={t} agents={agents} compact onAssign={assignTask} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {blocked.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-red-400 mb-3">🚨 Needs Help</h2>
          {blocked.map(a => (
            <div key={a.id} className="flex items-start gap-3 py-2">
              <div className="w-3 h-3 rounded-full bg-red mt-1 shrink-0" />
              <div>
                <div className="text-white font-medium">{a.name}</div>
                <div className="text-sm text-gray-300">{a.work_state?.task}</div>
                {a.work_state?.help_type && <div className="text-sm text-red-300 mt-1">Needs: {a.work_state.help_type}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Currently Working ({working.length})</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {working.map(a => (
            <div key={a.id} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green shrink-0" /><span className="text-white font-medium">{a.name}</span></div><span className="text-[10px] text-gray-400 font-mono">{timeAgo(a.last_seen)}</span></div>
              <div className="text-sm text-gray-200 mb-1">{a.work_state?.task}</div>
              {a.work_state?.context && <div className="text-xs text-gray-400 mb-2">{a.work_state.context}</div>}
              {a.work_state?.progress && <div className="text-xs text-cyan font-mono">{a.work_state.progress}</div>}
            </div>
          ))}
          {working.length === 0 && <div className="text-sm text-gray-500 col-span-2">No agents currently working</div>}
        </div>
      </div>

      <div>
        <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Available ({idle.length})</h2>
        <div className="flex flex-wrap gap-2">
          {idle.map(a => <div key={a.id} className="glass rounded-lg px-3 py-2 flex items-center gap-2"><div className={("w-2 h-2 rounded-full shrink-0 " + (a.status === "online" ? "bg-green" : "bg-gray-500"))} /><span className="text-sm text-gray-300">{a.name}</span><span className="text-[10px] text-gray-500">{(a.available_for || []).slice(0,3).join(", ")}</span></div>)}
        </div>
      </div>

      <div>
        <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Goals ({activeGoals.length} active)</h2>
        <div className="space-y-4">
          {activeGoals.map(g => {
            const goalTasks = tasks.filter(t => t.goal_id === g.id).concat(pendingTasks.filter(t => t.goal_id === g.id));
            const completedTasks = goalTasks.filter(t => t.status === "complete").length;
            const totalTasks = goalTasks.length;
            const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : g.progress;
            return (
              <div key={g.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1"><div className="flex items-center gap-2 mb-1 flex-wrap"><PriorityBadge priority={g.priority} /><StatusBadge status={g.status} /><span className="text-white font-semibold">{g.title}</span>{g.lead_agent_id && <span className="text-[10px] text-gray-500">lead {agentName(agents, g.lead_agent_id)}</span>}</div>{g.description && <div className="text-sm text-gray-400">{g.description}</div>}</div>
                  {totalTasks > 0 && <div className="text-right ml-4 shrink-0"><div className="text-lg font-bold text-cyan">{progressPct}%</div><div className="text-[10px] text-gray-500">{completedTasks}/{totalTasks} tasks</div></div>}
                </div>
                {totalTasks > 0 && <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden mb-4"><div className="h-full bg-cyan rounded-full transition-all" style={{ width: progressPct + "%" }} /></div>}
                {goalTasks.length > 0 ? <div className="space-y-2">{goalTasks.map(t => <TaskCard key={t.id} task={t} agents={agents} onAssign={assignTask} />)}</div> : <div className="text-xs text-gray-600 italic">No tasks yet - lead agent needs to break this goal into tasks</div>}
              </div>
            );
          })}
          {activeGoals.length === 0 && <div className="text-sm text-gray-500">No active goals</div>}
        </div>
      </div>

      <AuditTimeline events={auditEvents} agents={agents} />

      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Recently Completed ({completedGoals.length})</h2>
          <div className="space-y-1">{completedGoals.slice(0, 8).map(g => <div key={g.id} className="flex items-center gap-2 text-sm text-gray-500"><span>✅</span><span>{g.title}</span><span className="text-[10px]">{g.progress}%</span></div>)}</div>
        </div>
      )}
    </div>
  );
}

function CreateGoal({ agents, onCreate, busy }: { agents: Agent[]; onCreate: (body: Record<string, unknown>) => void; busy: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lead, setLead] = useState("gideon-05");
  return (
    <div className="glass rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-3">Create Goal</h2>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title" className="lg:col-span-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white" />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description / success criteria" className="lg:col-span-2 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white" />
        <div className="flex gap-2">
          <select value={lead} onChange={e => setLead(e.target.value)} className="bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white flex-1">{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <button disabled={busy || !title.trim()} onClick={() => onCreate({ title, description, lead_agent_id: lead, priority: "high", domain: "agentops", success_criteria: description })} className="px-3 py-2 rounded bg-cyan/20 text-cyan text-sm disabled:opacity-50">Create</button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, agents, compact = false, onAssign }: { task: Task; agents: Agent[]; compact?: boolean; onAssign?: (taskId: string, agentId: string) => void }) {
  const claimer = task.claimed_by ? agentName(agents, task.claimed_by) : null;
  const isDone = task.status === "complete" || task.status === "cancelled";
  return (
    <div className={("rounded-lg px-3 py-2.5 border " + taskBorder(task.status))}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1"><TaskStatusIcon status={task.status} /><div className="flex-1 min-w-0"><div className={("text-sm font-medium " + (task.status === "complete" ? "text-gray-500 line-through" : "text-gray-200"))}>{task.title}</div>{!compact && task.done_when && <div className="text-[11px] text-gray-500 mt-0.5">Done when: {task.done_when}</div>}{(task.depends_on || []).length > 0 && <div className="text-[10px] text-yellow mt-1">Depends on {(task.depends_on || []).length} task(s)</div>}{task.progress_notes && <div className="text-[11px] text-indigo-400 mt-1 font-mono">{clip(task.progress_notes, 160)}</div>}{task.blocked_reason && <div className="text-[11px] text-red mt-1">Blocked: {clip(task.blocked_reason, 180)}</div>}{task.verification_notes && <div className="text-[11px] text-green mt-1">{clip(task.verification_notes, 180)}</div>}</div></div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          {claimer && <div className="text-[10px] text-gray-400">{claimer.split(" ")[0]}</div>}
          <div className="text-[10px] text-gray-500">{task.status}</div>
          {!isDone && onAssign && (
            <select
              className="text-[10px] bg-surface-2 text-gray-400 border border-white/10 rounded px-1 py-0.5 mt-1 cursor-pointer"
              defaultValue=""
              onChange={e => { if (e.target.value) onAssign(task.id, e.target.value); e.target.value = ""; }}
            >
              <option value="" disabled>assign…</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name.split(" ")[0]}</option>)}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditTimeline({ events, agents }: { events: AuditEvent[]; agents: Agent[] }) {
  return (
    <div>
      <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Audit Timeline</h2>
      <div className="glass rounded-xl divide-y divide-white/5">
        {events.slice(0, 40).map(e => <div key={e.id} className="p-3 flex items-start gap-3"><div className="text-[10px] text-gray-500 w-24 shrink-0">{timeAgo(e.created_at)}</div><div className="flex-1"><div className="text-sm text-gray-200"><span className="text-cyan">{e.action}</span> by {agentName(agents, e.actor_id) || e.actor_name || e.actor_id}</div><div className="text-[11px] text-gray-500">{e.entity_type} {e.entity_id || ""} {e.request_source ? `via ${e.request_source}` : ""}</div></div></div>)}
        {events.length === 0 && <div className="p-3 text-sm text-gray-500">No audit events yet</div>}
      </div>
    </div>
  );
}

function groupByGoal(tasks: Task[]) { const map = new Map<string, Task[]>(); for (const t of tasks) { const key = t.goal_id || ""; map.set(key, [...(map.get(key) || []), t]); } return [...map.entries()].map(([goalId, tasks]) => ({ goalId, tasks })); }
function agentName(agents: Agent[], id: string) { return agents.find(a => a.id === id)?.name || id; }
function clip(s: string, n: number) { return s.length > n ? s.slice(0, n) + "…" : s; }
function taskBorder(status: string): string { return ({ open: "border-white/5 bg-white/[0.02]", pending_approval: "border-yellow/20 bg-yellow/[0.04]", claimed: "border-indigo-500/20 bg-indigo-500/[0.04]", in_progress: "border-green/20 bg-green/[0.04]", blocked: "border-red/20 bg-red/[0.04]", complete: "border-white/5 bg-white/[0.02]" } as Record<string,string>)[status] || "border-white/5 bg-white/[0.02]"; }
function TaskStatusIcon({ status }: { status: string }) { const icons: Record<string, string> = { pending_approval: "🟠", open: "⬜", claimed: "🔵", in_progress: "🟡", blocked: "🔴", complete: "✅" }; return <span className="text-sm shrink-0 mt-0.5">{icons[status] || "⬜"}</span>; }
function PriorityBadge({ priority }: { priority: string }) { const styles: Record<string, string> = { critical: "bg-red/20 text-red", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow/20 text-yellow", low: "bg-gray-500/20 text-gray-400" }; return <span className={("text-[10px] px-2 py-0.5 rounded-full font-medium " + (styles[priority] || styles.medium))}>{priority}</span>; }
function StatusBadge({ status }: { status: string }) { const styles: Record<string, string> = { open: "bg-blue-500/20 text-blue-400", in_progress: "bg-green/20 text-green", blocked: "bg-red/20 text-red", completed: "bg-gray-500/20 text-gray-400" }; return <span className={("text-[10px] px-2 py-0.5 rounded-full font-medium " + (styles[status] || styles.open))}>{status.replace("_", " ")}</span>; }
function timeAgo(iso: string): string { const diff = Date.now() - new Date(iso).getTime(); const mins = Math.floor(diff / 60000); if (mins < 1) return "now"; if (mins < 60) return mins + "m ago"; const hours = Math.floor(mins / 60); if (hours < 24) return hours + "h ago"; return Math.floor(hours / 24) + "d ago"; }
