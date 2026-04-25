import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

// GET /api/v1/goals — list active goals
// Query params: status, needs_breakdown=true (goals with lead_agent_id matching caller and no tasks)
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const needsBreakdown = url.searchParams.get("needs_breakdown") === "true";

  if (needsBreakdown) {
    // Find goals where this agent is lead AND no tasks exist yet
    const { data: goals, error } = await db
      .from("goals")
      .select("*")
      .eq("lead_agent_id", auth.agentId)
      .in("status", ["open", "in_progress"])
      .order("priority")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

    // Filter to goals that have zero tasks
    const goalIds = (goals || []).map((g: { id: string }) => g.id);
    if (goalIds.length === 0) return NextResponse.json({ goals: [] });

    const { data: tasks } = await db
      .from("tasks")
      .select("goal_id")
      .in("goal_id", goalIds);

    const goalsWithTasks = new Set((tasks || []).map((t: { goal_id: string }) => t.goal_id));
    const needingBreakdown = (goals || []).filter((g: { id: string }) => !goalsWithTasks.has(g.id));

    return NextResponse.json({ goals: needingBreakdown });
  }

  let query = db.from("goals").select("*").order("priority").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  else query = query.in("status", ["open", "in_progress", "blocked"]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ goals: data || [] });
}

// POST /api/v1/goals — create goal (admin) or claim goal (agent)
export async function POST(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const db = getSupabaseAdmin();

  if (body.action === "claim") {
    const { error } = await db
      .from("goals")
      .update({ claimed_by: auth.agentId, status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", body.goal_id)
      .eq("status", "open");
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
    return NextResponse.json({ ok: true, claimed: body.goal_id });
  }

  if (body.action === "update_progress") {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.progress !== undefined) update.progress = body.progress;
    if (body.status) update.status = body.status;
    if (body.outcomes) update.outcomes = body.outcomes;
    const { error } = await db.from("goals").update(update).eq("id", body.goal_id);
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "propose_tasks") {
    // Lead agent proposes a task breakdown for a goal
    // Tasks are created with status "pending_approval"
    const goalId = body.goal_id;
    if (!goalId) return NextResponse.json({ error: "Missing goal_id" }, { status: 400 });
    if (!body.tasks || !Array.isArray(body.tasks) || body.tasks.length === 0) {
      return NextResponse.json({ error: "Missing or empty tasks array" }, { status: 400 });
    }

    // Verify the agent is lead for this goal
    const { data: goal } = await db.from("goals").select("lead_agent_id").eq("id", goalId).single();
    if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    if (goal.lead_agent_id !== auth.agentId) {
      return NextResponse.json({ error: "Only the lead agent can propose task breakdowns" }, { status: 403 });
    }

    // Create tasks in pending_approval status
    const taskInserts = body.tasks.map((t: {
      title: string;
      description?: string;
      done_when?: string;
      required_capabilities?: string[];
      depends_on?: string[];
    }) => ({
      goal_id: goalId,
      title: t.title,
      description: t.description || t.title,
      done_when: t.done_when || null,
      required_capabilities: t.required_capabilities || [],
      depends_on: t.depends_on || [],
      status: "pending_approval",
      created_by: auth.agentId,
    }));

    const { data: created, error } = await db.from("tasks").insert(taskInserts).select();
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

    return NextResponse.json({ ok: true, tasks: created, count: (created || []).length });
  }

  // Create new goal
  const { data, error } = await db.from("goals").insert({
    title: body.title,
    description: body.description,
    priority: body.priority || "medium",
    required_capabilities: body.required_capabilities || [],
    assigned_to: body.assigned_to || null,
    lead_agent_id: body.lead_agent_id || null,
    domain: body.domain || null,
    success_criteria: body.success_criteria || null,
    deadline: body.deadline || null,
    created_by: body.created_by || auth.agentId,
  }).select().single();

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ ok: true, goal: data });
}
