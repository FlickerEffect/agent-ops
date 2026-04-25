"use client";

interface WorkState {
  task?: string;
  context?: string;
  started?: string;
  progress?: string;
  blockers?: string[];
  needs_help?: boolean;
  help_type?: string;
  outputs?: string[];
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: string;
  work_state: WorkState | null;
  capabilities: string[];
  available_for: string[];
  last_seen: string;
  model: string;
}

interface Task {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  done_when: string;
  required_capabilities: string[];
  status: string;
  claimed_by: string | null;
  progress_notes: string | null;
  blocked_reason: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  claimed_by: string | null;
  required_capabilities: string[];
  progress: number;
  created_at: string;
  updated_at: string;
}

export function CoordinationView({ agents, goals, tasks }: { agents: Agent[]; goals: Goal[]; tasks: Task[] }) {
  const working = agents.filter(a => {
    const ws = a.work_state;
    return ws && ws.task && ws.task !== "idle" && ws.task !== "not reporting" && ws.task !== "Routine heartbeat monitoring and fleet coordination";
  });
  const idle = agents.filter(a => !working.includes(a));
  const blocked = agents.filter(a => a.work_state?.needs_help);
  const activeGoals = goals.filter(g => ["open", "in_progress", "blocked"].includes(g.status));
  const completedGoals = goals.filter(g => g.status === "completed");

  return (
    <div className="space-y-6">
      {/* Blocked agents */}
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
                {(a.work_state?.blockers || []).length > 0 && (
                  <div className="text-sm text-yellow mt-1">Blockers: {(a.work_state?.blockers || []).join(", ")}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Currently working */}
      <div>
        <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Currently Working ({working.length})</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {working.map(a => (
            <div key={a.id} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green shrink-0" />
                  <span className="text-white font-medium">{a.name}</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{timeAgo(a.last_seen)}</span>
              </div>
              <div className="text-sm text-gray-200 mb-1">{a.work_state?.task}</div>
              {a.work_state?.context && <div className="text-xs text-gray-400 mb-2">{a.work_state.context}</div>}
              {a.work_state?.progress && <div className="text-xs text-cyan font-mono">{a.work_state.progress}</div>}
              {(a.work_state?.outputs || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(a.work_state?.outputs || []).map((o, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">{o}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {working.length === 0 && <div className="text-sm text-gray-500 col-span-2">No agents currently working</div>}
        </div>
      </div>

      {/* Available */}
      <div>
        <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Available ({idle.length})</h2>
        <div className="flex flex-wrap gap-2">
          {idle.map(a => (
            <div key={a.id} className="glass rounded-lg px-3 py-2 flex items-center gap-2">
              <div className={"w-2 h-2 rounded-full shrink-0 " + (a.status === "online" ? "bg-green" : "bg-gray-500")} />
              <span className="text-sm text-gray-300">{a.name}</span>
              {(a.available_for || []).length > 0 && (
                <span className="text-[10px] text-gray-500">{(a.available_for || []).slice(0,3).join(", ")}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Goals with nested tasks */}
      <div>
        <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Goals ({activeGoals.length} active)</h2>
        <div className="space-y-4">
          {activeGoals.map(g => {
            const goalTasks = tasks.filter(t => t.goal_id === g.id);
            const openTasks = goalTasks.filter(t => t.status === "open").length;
            const inProgressTasks = goalTasks.filter(t => ["claimed","in_progress"].includes(t.status)).length;
            const completedTasks = goalTasks.filter(t => t.status === "complete").length;
            const totalTasks = goalTasks.length;
            const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : g.progress;

            return (
              <div key={g.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <PriorityBadge priority={g.priority} />
                      <StatusBadge status={g.status} />
                      <span className="text-white font-semibold">{g.title}</span>
                    </div>
                    {g.description && <div className="text-sm text-gray-400">{g.description}</div>}
                  </div>
                  {totalTasks > 0 && (
                    <div className="text-right ml-4 shrink-0">
                      <div className="text-lg font-bold text-cyan">{progressPct}%</div>
                      <div className="text-[10px] text-gray-500">{completedTasks}/{totalTasks} tasks</div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {totalTasks > 0 && (
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-cyan rounded-full transition-all" style={{ width: progressPct + "%" }} />
                  </div>
                )}

                {/* Tasks */}
                {goalTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                      Tasks — {openTasks} open · {inProgressTasks} in progress · {completedTasks} done
                    </div>
                    {goalTasks.map(t => {
                      const claimer = t.claimed_by ? agents.find(a => a.id === t.claimed_by) : null;
                      return (
                        <div key={t.id} className={"rounded-lg px-3 py-2.5 border " + taskBorder(t.status)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <TaskStatusIcon status={t.status} />
                              <div className="flex-1 min-w-0">
                                <div className={"text-sm font-medium " + (t.status === "complete" ? "text-gray-500 line-through" : "text-gray-200")}>{t.title}</div>
                                {t.status !== "complete" && t.done_when && (
                                  <div className="text-[11px] text-gray-500 mt-0.5">Done when: {t.done_when}</div>
                                )}
                                {t.progress_notes && t.status !== "complete" && (
                                  <div className="text-[11px] text-indigo-400 mt-1 font-mono">{t.progress_notes.slice(0, 120)}{t.progress_notes.length > 120 ? "…" : ""}</div>
                                )}
                                {t.blocked_reason && (
                                  <div className="text-[11px] text-red mt-1">Blocked: {t.blocked_reason}</div>
                                )}
                                {t.verification_notes && t.status === "complete" && (
                                  <div className="text-[11px] text-green mt-1">{t.verification_notes.slice(0, 100)}{t.verification_notes.length > 100 ? "…" : ""}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {claimer && (
                                <div className="text-[10px] text-gray-400">{claimer.name.split(" ")[0]}</div>
                              )}
                              {(t.required_capabilities || []).length > 0 && t.status === "open" && (
                                <div className="text-[9px] text-gray-600 mt-0.5">{(t.required_capabilities || []).join(", ")}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {goalTasks.length === 0 && (
                  <div className="text-xs text-gray-600 italic">No tasks yet — domain lead needs to break this goal into tasks</div>
                )}
              </div>
            );
          })}
          {activeGoals.length === 0 && <div className="text-sm text-gray-500">No active goals</div>}
        </div>
      </div>

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">Completed ({completedGoals.length})</h2>
          <div className="space-y-1">
            {completedGoals.slice(0, 5).map(g => (
              <div key={g.id} className="flex items-center gap-2 text-sm text-gray-500">
                <span>✅</span>
                <span>{g.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function taskBorder(status: string): string {
  const m: Record<string, string> = {
    open: "border-white/5 bg-white/[0.02]",
    claimed: "border-indigo-500/20 bg-indigo-500/[0.04]",
    in_progress: "border-green/20 bg-green/[0.04]",
    blocked: "border-red/20 bg-red/[0.04]",
    complete: "border-white/5 bg-white/[0.02]",
  };
  return m[status] || m.open;
}

function TaskStatusIcon({ status }: { status: string }) {
  const icons: Record<string, string> = {
    open: "⬜",
    claimed: "🔵",
    in_progress: "🟡",
    blocked: "🔴",
    complete: "✅",
  };
  return <span className="text-sm shrink-0 mt-0.5">{icons[status] || "⬜"}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red/20 text-red",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-yellow/20 text-yellow",
    low: "bg-gray-500/20 text-gray-400",
  };
  return <span className={"text-[10px] px-2 py-0.5 rounded-full font-medium " + (styles[priority] || styles.medium)}>{priority}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-blue-500/20 text-blue-400",
    in_progress: "bg-green/20 text-green",
    blocked: "bg-red/20 text-red",
    completed: "bg-gray-500/20 text-gray-400",
  };
  return <span className={"text-[10px] px-2 py-0.5 rounded-full font-medium " + (styles[status] || styles.open)}>{status.replace("_", " ")}</span>;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return mins + "m ago";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h ago";
  return Math.floor(hours / 24) + "d ago";
}
