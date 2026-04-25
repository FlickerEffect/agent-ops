import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  const [agentsRes, goalsRes, tasksRes, pendingTasksRes] = await Promise.all([
    db.from("agents").select("id, name, role, status, work_state, capabilities, available_for, last_seen, model").order("name"),
    db.from("goals").select("*").order("priority").order("created_at", {ascending: false}),
    db.from("tasks").select("*").in("status", ["open","claimed","in_progress","blocked"]).order("created_at"),
    db.from("tasks").select("*").eq("status", "pending_approval").order("created_at"),
  ]);
  return NextResponse.json({
    agents: agentsRes.data || [],
    goals: goalsRes.data || [],
    tasks: tasksRes.data || [],
    pending_tasks: pendingTasksRes.data || [],
    timestamp: new Date().toISOString(),
  });
}
