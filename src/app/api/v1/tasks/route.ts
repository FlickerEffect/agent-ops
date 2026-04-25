import { NextResponse } from "next/server";
import { authenticateAgent, ADMIN_EMAILS } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

// GET /api/v1/tasks — list tasks, optionally filtered
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const url = new URL(request.url);
  const goal_id = url.searchParams.get("goal_id");
  const status = url.searchParams.get("status");
  const include_pending = url.searchParams.get("include_pending") === "true";
  const capabilities = url.searchParams.get("capabilities")?.split(",").filter(Boolean) || [];

  const activeStatuses = ["open", "claimed", "in_progress", "blocked"];
  if (include_pending) activeStatuses.push("pending_approval");

  let query = db.from("tasks").select("*").order("created_at");
  if (goal_id) query = query.eq("goal_id", goal_id);
  if (status) query = query.eq("status", status);
  else query = query.in("status", activeStatuses);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  let tasks = data || [];
  if (capabilities.length > 0) {
    tasks = tasks.filter((t: { required_capabilities?: string[] }) => {
      const required: string[] = t.required_capabilities || [];
      if (required.length === 0) return true;
      return required.every((cap: string) => capabilities.includes(cap));
    });
  }

  return NextResponse.json({ tasks });
}

// POST /api/v1/tasks — create or act on a task
export async function POST(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (body.action === "claim") {
    const { data, error } = await db
      .from("tasks")
      .update({ claimed_by: auth.agentId, claimed_at: now, status: "claimed", updated_at: now })
      .eq("id", body.task_id)
      .eq("status", "open")
      .select()
      .single();
    if (error || !data) return NextResponse.json({ error: "Task not available - already claimed or does not exist" }, { status: 409 });
    return NextResponse.json({ ok: true, task: data });
  }

  if (body.action === "start") {
    const { error } = await db.from("tasks")
      .update({ status: "in_progress", started_at: now, updated_at: now })
      .eq("id", body.task_id).eq("claimed_by", auth.agentId);
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "progress") {
    const { error } = await db.from("tasks")
      .update({ progress_notes: body.progress_notes, updated_at: now })
      .eq("id", body.task_id).eq("claimed_by", auth.agentId);
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "block") {
    const { error } = await db.from("tasks")
      .update({ status: "blocked", blocked_reason: body.reason, updated_at: now })
      .eq("id", body.task_id).eq("claimed_by", auth.agentId);
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "complete") {
    const { data: task } = await db.from("tasks")
      .select("goal_id")
      .eq("id", body.task_id)
      .eq("claimed_by", auth.agentId)
      .single();
    if (!task) return NextResponse.json({ error: "Task not found or not claimed by you" }, { status: 404 });

    const { error } = await db.from("tasks")
      .update({ status: "complete", completed_at: now, verification_notes: body.verification_notes, updated_at: now })
      .eq("id", body.task_id).eq("claimed_by", auth.agentId);
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

    // Auto-complete goal if all tasks done
    const goalId = body.goal_id || task.goal_id;
    if (goalId) {
      const { data: remaining } = await db.from("tasks")
        .select("id").eq("goal_id", goalId)
        .neq("status", "complete").neq("status", "cancelled");
      if ((remaining || []).length === 0) {
        await db.from("goals").update({ status: "completed", updated_at: now }).eq("id", goalId);
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unclaim") {
    const { error } = await db.from("tasks")
      .update({ status: "open", claimed_by: null, claimed_at: null, updated_at: now })
      .eq("id", body.task_id).eq("claimed_by", auth.agentId);
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update") {
    const updates: Record<string, unknown> = { updated_at: now };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.done_when !== undefined) updates.done_when = body.done_when;
    if (body.required_capabilities !== undefined) updates.required_capabilities = body.required_capabilities;
    if (body.depends_on !== undefined) updates.depends_on = body.depends_on;

    const { data, error } = await db.from("tasks")
      .update(updates)
      .eq("id", body.task_id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
    return NextResponse.json({ ok: true, task: data });
  }

  // APPROVE: Move task(s) from pending_approval to open
  // Can approve by task_id (single) or goal_id (bulk - all pending tasks for that goal)
  if (body.action === "approve") {
    // Only admin/owner scope or the goal creator can approve
    // For now, any authenticated agent can approve (we'll tighten later with scope checks)
    
    if (body.goal_id) {
      // Bulk approve all pending tasks for a goal
      const { data, error } = await db.from("tasks")
        .update({ status: "open", updated_at: now })
        .eq("goal_id", body.goal_id)
        .eq("status", "pending_approval")
        .select();
      if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
      return NextResponse.json({ ok: true, approved: (data || []).length, tasks: data });
    }

    if (body.task_id) {
      const { data, error } = await db.from("tasks")
        .update({ status: "open", updated_at: now })
        .eq("id", body.task_id)
        .eq("status", "pending_approval")
        .select()
        .single();
      if (error || !data) return NextResponse.json({ error: "Task not found or not in pending_approval status" }, { status: 404 });
      return NextResponse.json({ ok: true, task: data });
    }

    return NextResponse.json({ error: "Approve requires task_id or goal_id" }, { status: 400 });
  }

  // REJECT: Move task(s) back to cancelled or remove them
  if (body.action === "reject") {
    if (body.goal_id) {
      const { data, error } = await db.from("tasks")
        .update({ status: "cancelled", updated_at: now, blocked_reason: body.reason || "Rejected by reviewer" })
        .eq("goal_id", body.goal_id)
        .eq("status", "pending_approval")
        .select();
      if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
      return NextResponse.json({ ok: true, rejected: (data || []).length });
    }

    if (body.task_id) {
      const { data, error } = await db.from("tasks")
        .update({ status: "cancelled", updated_at: now, blocked_reason: body.reason || "Rejected by reviewer" })
        .eq("id", body.task_id)
        .eq("status", "pending_approval")
        .select()
        .single();
      if (error || !data) return NextResponse.json({ error: "Task not found or not in pending_approval status" }, { status: 404 });
      return NextResponse.json({ ok: true, task: data });
    }

    return NextResponse.json({ error: "Reject requires task_id or goal_id" }, { status: 400 });
  }

  // CREATE new task
  if (!body.title) return NextResponse.json({ error: "Missing title for task creation" }, { status: 400 });

  const { data, error } = await db.from("tasks").insert({
    goal_id: body.goal_id,
    title: body.title,
    description: body.description,
    done_when: body.done_when,
    required_capabilities: body.required_capabilities || [],
    depends_on: body.depends_on || [],
    status: body.status === "pending_approval" ? "pending_approval" : "open",
    created_by: auth.agentId,
  }).select().single();

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ ok: true, task: data });
}
