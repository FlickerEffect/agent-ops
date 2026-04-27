import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";
import { logAudit, requestSource } from "@/lib/audit";
import { apiError } from "@/lib/api-error";

type Task = {
  id: string;
  goal_id: string | null;
  title: string;
  status: string;
  claimed_by: string | null;
  depends_on?: string[] | null;
};

async function dependenciesSatisfied(db: ReturnType<typeof getSupabaseAdmin>, task: Task) {
  const deps = (task.depends_on || []).filter(Boolean);
  if (deps.length === 0) return { ok: true };
  const { data, error } = await db.from("tasks").select("id,status,title").in("id", deps);
  if (error) return { ok: false, reason: "dependency lookup failed", details: error };
  const byId = new Map((data || []).map((t: { id: string; status: string; title?: string }) => [t.id, t]));
  const missing = deps.filter((id) => !byId.has(id));
  const incomplete = deps.filter((id) => byId.get(id)?.status !== "complete");
  if (missing.length || incomplete.length) return { ok: false, reason: "dependencies not complete", missing, incomplete };
  return { ok: true };
}

async function filterClaimableOpenTasks(db: ReturnType<typeof getSupabaseAdmin>, tasks: Task[]) {
  const result: Task[] = [];
  for (const task of tasks) {
    if (task.status !== "open") {
      result.push(task);
      continue;
    }
    const dep = await dependenciesSatisfied(db, task);
    if (dep.ok) result.push(task);
  }
  return result;
}

// GET /api/v1/tasks — list tasks, optionally filtered
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const url = new URL(request.url);
  const goal_id = url.searchParams.get("goal_id");
  const status = url.searchParams.get("status");
  const include_pending = url.searchParams.get("include_pending") === "true";
  const include_waiting = url.searchParams.get("include_waiting") === "true";
  const capabilities = url.searchParams.get("capabilities")?.split(",").filter(Boolean) || [];

  const activeStatuses = ["open", "claimed", "in_progress", "blocked"];
  if (include_pending) activeStatuses.push("pending_approval");

  let query = db.from("tasks").select("*").order("created_at");
  if (goal_id) query = query.eq("goal_id", goal_id);
  if (status) query = query.eq("status", status);
  else query = query.in("status", activeStatuses);

  const { data, error } = await query;
  if (error) return apiError("Failed to list tasks", 500, error);

  let tasks = data || [];
  if (!include_waiting) tasks = await filterClaimableOpenTasks(db, tasks as Task[]);

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
  const source = requestSource(request);

  try {
    if (body.action === "claim") {
      const { data: before, error: beforeError } = await db.from("tasks").select("*").eq("id", body.task_id).single();
      if (beforeError || !before) return apiError("Task not found", 404, beforeError);
      if (before.status !== "open") return apiError("Task not available - already claimed or not open", 409, { status: before.status });
      const dep = await dependenciesSatisfied(db, before as Task);
      if (!dep.ok) return apiError("Task dependencies are not complete", 409, dep);

      const { data, error } = await db
        .from("tasks")
        .update({ claimed_by: auth.agentId, claimed_at: now, status: "claimed", updated_at: now })
        .eq("id", body.task_id)
        .eq("status", "open")
        .select()
        .single();
      if (error || !data) return apiError("Task not available - already claimed or does not exist", 409, error);
      await logAudit({ actor: auth, action: "task.claim", entityType: "task", entityId: data.id, taskId: data.id, goalId: data.goal_id, requestSource: source, beforeState: before, afterState: data });
      return NextResponse.json({ ok: true, task: data });
    }

    if (body.action === "start") {
      const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
      const { data, error } = await db.from("tasks")
        .update({ status: "in_progress", started_at: now, updated_at: now })
        .eq("id", body.task_id).eq("claimed_by", auth.agentId).select().single();
      if (error) return apiError("Failed to start task", 500, error);
      await logAudit({ actor: auth, action: "task.start", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data?.goal_id, requestSource: source, beforeState: before, afterState: data });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "progress") {
      const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
      const { data, error } = await db.from("tasks")
        .update({ progress_notes: body.progress_notes, updated_at: now })
        .eq("id", body.task_id).eq("claimed_by", auth.agentId).select().single();
      if (error) return apiError("Failed to update task progress", 500, error);
      await logAudit({ actor: auth, action: "task.progress", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data?.goal_id, requestSource: source, beforeState: before, afterState: data });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "block") {
      const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
      const { data, error } = await db.from("tasks")
        .update({ status: "blocked", blocked_reason: body.reason, updated_at: now })
        .eq("id", body.task_id).eq("claimed_by", auth.agentId).select().single();
      if (error) return apiError("Failed to block task", 500, error);
      await logAudit({ actor: auth, action: "task.block", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data?.goal_id, requestSource: source, beforeState: before, afterState: data });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "complete") {
      const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).eq("claimed_by", auth.agentId).single();
      if (!before) return apiError("Task not found or not claimed by you", 404);

      const { data, error } = await db.from("tasks")
        .update({ status: "complete", completed_at: now, verification_notes: body.verification_notes, updated_at: now })
        .eq("id", body.task_id).eq("claimed_by", auth.agentId).select().single();
      if (error) return apiError("Failed to complete task", 500, error);
      await logAudit({ actor: auth, action: "task.complete", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data?.goal_id, requestSource: source, beforeState: before, afterState: data });

      const goalId = body.goal_id || before.goal_id;
      if (goalId) {
        const { data: goalBefore } = await db.from("goals").select("*").eq("id", goalId).single();
        const { data: allGoalTasks } = await db.from("tasks").select("id,status").eq("goal_id", goalId);
        const total = (allGoalTasks || []).filter((t: { status: string }) => t.status !== "cancelled").length;
        const completed = (allGoalTasks || []).filter((t: { status: string }) => t.status === "complete").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const remaining = (allGoalTasks || []).filter((t: { status: string }) => !["complete", "cancelled"].includes(t.status));
        const goalUpdate: Record<string, unknown> = { progress, updated_at: now };
        if (remaining.length === 0) goalUpdate.status = "completed";
        const { data: goalAfter } = await db.from("goals").update(goalUpdate).eq("id", goalId).select().single();
        if (goalAfter) await logAudit({ actor: auth, action: remaining.length === 0 ? "goal.auto_complete" : "goal.progress", entityType: "goal", entityId: goalId, goalId, requestSource: source, beforeState: goalBefore, afterState: goalAfter, metadata: { completed, total } });
      }
      return NextResponse.json({ ok: true });
    }

    // Admin-only: force-assign a task to a specific agent
    if (body.action === "assign") {
      if (!body.task_id || !body.agent_id) return apiError("assign requires task_id and agent_id", 400);
      const isAdmin = auth.scope === "admin" || auth.scope === "fleet-read";
      const sessionAuth = await import("next-auth/jwt").then(m => m.getToken({ req: request as any }));
      const isWebAdmin = sessionAuth && (await import("@/lib/auth-tokens").then(m => m.ADMIN_EMAILS)).includes(sessionAuth.email as string);
      if (!isAdmin && !isWebAdmin) return apiError("Admin access required to assign tasks", 403);

      const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
      const { data, error } = await db.from("tasks")
        .update({
          status: "claimed",
          claimed_by: body.agent_id,
          claimed_at: now,
          blocked_reason: null,
          updated_at: now,
        })
        .eq("id", body.task_id)
        .select().single();
      if (error) return apiError("Failed to assign task", 500, error);
      await logAudit({ actor: auth, action: "task.assign", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data?.goal_id, requestSource: source, beforeState: before, afterState: data, metadata: { assigned_to: body.agent_id } });
      return NextResponse.json({ ok: true, task: data });
    }

    if (body.action === "unclaim") {
      const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
      const { data, error } = await db.from("tasks")
        .update({ status: "open", claimed_by: null, claimed_at: null, updated_at: now })
        .eq("id", body.task_id).eq("claimed_by", auth.agentId).select().single();
      if (error) return apiError("Failed to unclaim task", 500, error);
      await logAudit({ actor: auth, action: "task.unclaim", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data?.goal_id, requestSource: source, beforeState: before, afterState: data });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update") {
      const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
      const updates: Record<string, unknown> = { updated_at: now };
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.done_when !== undefined) updates.done_when = body.done_when;
      if (body.required_capabilities !== undefined) updates.required_capabilities = body.required_capabilities;
      if (body.depends_on !== undefined) updates.depends_on = body.depends_on;

      const { data, error } = await db.from("tasks").update(updates).eq("id", body.task_id).select().single();
      if (error) return apiError("Failed to update task", 500, error);
      await logAudit({ actor: auth, action: "task.update", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data?.goal_id, requestSource: source, beforeState: before, afterState: data });
      return NextResponse.json({ ok: true, task: data });
    }

    if (body.action === "approve") {
      if (body.goal_id) {
        const { data: before } = await db.from("tasks").select("*").eq("goal_id", body.goal_id).eq("status", "pending_approval");
        const { data, error } = await db.from("tasks")
          .update({ status: "open", updated_at: now })
          .eq("goal_id", body.goal_id)
          .eq("status", "pending_approval")
          .select();
        if (error) return apiError("Failed to approve tasks", 500, error);
        await logAudit({ actor: auth, action: "tasks.approve", entityType: "goal", entityId: body.goal_id, goalId: body.goal_id, requestSource: source, beforeState: before, afterState: data, metadata: { approved: (data || []).length } });
        return NextResponse.json({ ok: true, approved: (data || []).length, tasks: data });
      }

      if (body.task_id) {
        const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
        const { data, error } = await db.from("tasks")
          .update({ status: "open", updated_at: now })
          .eq("id", body.task_id)
          .eq("status", "pending_approval")
          .select()
          .single();
        if (error || !data) return apiError("Task not found or not in pending_approval status", 404, error);
        await logAudit({ actor: auth, action: "task.approve", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data.goal_id, requestSource: source, beforeState: before, afterState: data });
        return NextResponse.json({ ok: true, task: data });
      }
      return apiError("Approve requires task_id or goal_id", 400);
    }

    if (body.action === "reject") {
      if (body.goal_id) {
        const { data: before } = await db.from("tasks").select("*").eq("goal_id", body.goal_id).eq("status", "pending_approval");
        const { data, error } = await db.from("tasks")
          .update({ status: "cancelled", updated_at: now, blocked_reason: body.reason || "Rejected by reviewer" })
          .eq("goal_id", body.goal_id)
          .eq("status", "pending_approval")
          .select();
        if (error) return apiError("Failed to reject tasks", 500, error);
        await logAudit({ actor: auth, action: "tasks.reject", entityType: "goal", entityId: body.goal_id, goalId: body.goal_id, requestSource: source, beforeState: before, afterState: data, metadata: { rejected: (data || []).length, reason: body.reason } });
        return NextResponse.json({ ok: true, rejected: (data || []).length });
      }

      if (body.task_id) {
        const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
        const { data, error } = await db.from("tasks")
          .update({ status: "cancelled", updated_at: now, blocked_reason: body.reason || "Rejected by reviewer" })
          .eq("id", body.task_id)
          .eq("status", "pending_approval")
          .select()
          .single();
        if (error || !data) return apiError("Task not found or not in pending_approval status", 404, error);
        await logAudit({ actor: auth, action: "task.reject", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data.goal_id, requestSource: source, beforeState: before, afterState: data, metadata: { reason: body.reason } });
        return NextResponse.json({ ok: true, task: data });
      }
      return apiError("Reject requires task_id or goal_id", 400);
    }

    if (!body.title) return apiError("Missing title for task creation", 400);

    const insert = {
      goal_id: body.goal_id,
      title: body.title,
      description: body.description,
      done_when: body.done_when,
      required_capabilities: body.required_capabilities || [],
      depends_on: body.depends_on || [],
      status: body.status === "pending_approval" ? "pending_approval" : "open",
      created_by: auth.agentId,
    };
    const { data, error } = await db.from("tasks").insert(insert).select().single();
    if (error) return apiError("Failed to create task", 500, error);
    await logAudit({ actor: auth, action: "task.create", entityType: "task", entityId: data.id, taskId: data.id, goalId: data.goal_id, requestSource: source, afterState: data });
    return NextResponse.json({ ok: true, task: data });
  } catch (error) {
    return apiError("Unhandled task API error", 500, error);
  }
}
