import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { ADMIN_EMAILS } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { apiError } from "@/lib/api-error";

function actor(email?: string | null) {
  return { agentId: email || "web-admin", name: email || "Web Admin", scope: "web-admin" };
}

async function requireAdmin(request: NextRequest) {
  const session = await getToken({ req: request });
  if (!session || !ADMIN_EMAILS.includes(session.email as string)) return null;
  return session.email as string;
}

export async function POST(request: NextRequest) {
  const email = await requireAdmin(request);
  if (!email) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await request.json();
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const a = actor(email);

  try {
    if (body.action === "approve") {
      if (body.goal_id) {
        const { data: before } = await db.from("tasks").select("*").eq("goal_id", body.goal_id).eq("status", "pending_approval");
        const { data, error } = await db.from("tasks").update({ status: "open", updated_at: now }).eq("goal_id", body.goal_id).eq("status", "pending_approval").select();
        if (error) return apiError("Failed to approve tasks", 500, error);
        await logAudit({ actor: a, action: "tasks.approve", entityType: "goal", entityId: body.goal_id, goalId: body.goal_id, requestSource: "POST /api/ui/tasks", beforeState: before, afterState: data, metadata: { approved: (data || []).length } });
        return NextResponse.json({ ok: true, approved: (data || []).length, tasks: data });
      }
      if (body.task_id) {
        const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
        const { data, error } = await db.from("tasks").update({ status: "open", updated_at: now }).eq("id", body.task_id).eq("status", "pending_approval").select().single();
        if (error || !data) return apiError("Task not found or not pending approval", 404, error);
        await logAudit({ actor: a, action: "task.approve", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data.goal_id, requestSource: "POST /api/ui/tasks", beforeState: before, afterState: data });
        return NextResponse.json({ ok: true, task: data });
      }
    }

    if (body.action === "reject") {
      const reason = body.reason || "Rejected in approval UI";
      if (body.goal_id) {
        const { data: before } = await db.from("tasks").select("*").eq("goal_id", body.goal_id).eq("status", "pending_approval");
        const { data, error } = await db.from("tasks").update({ status: "cancelled", blocked_reason: reason, updated_at: now }).eq("goal_id", body.goal_id).eq("status", "pending_approval").select();
        if (error) return apiError("Failed to reject tasks", 500, error);
        await logAudit({ actor: a, action: "tasks.reject", entityType: "goal", entityId: body.goal_id, goalId: body.goal_id, requestSource: "POST /api/ui/tasks", beforeState: before, afterState: data, metadata: { rejected: (data || []).length, reason } });
        return NextResponse.json({ ok: true, rejected: (data || []).length });
      }
      if (body.task_id) {
        const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
        const { data, error } = await db.from("tasks").update({ status: "cancelled", blocked_reason: reason, updated_at: now }).eq("id", body.task_id).eq("status", "pending_approval").select().single();
        if (error || !data) return apiError("Task not found or not pending approval", 404, error);
        await logAudit({ actor: a, action: "task.reject", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data.goal_id, requestSource: "POST /api/ui/tasks", beforeState: before, afterState: data, metadata: { reason } });
        return NextResponse.json({ ok: true, task: data });
      }
    }

    if (body.action === "assign") {
      if (!body.task_id || !body.agent_id) return apiError("assign requires task_id and agent_id", 400);
      const { data: before } = await db.from("tasks").select("*").eq("id", body.task_id).single();
      const { data, error } = await db.from("tasks")
        .update({ status: "claimed", claimed_by: body.agent_id, claimed_at: now, blocked_reason: null, updated_at: now })
        .eq("id", body.task_id).select().single();
      if (error) return apiError("Failed to assign task", 500, error);
      await logAudit({ actor: actor(email), action: "task.assign", entityType: "task", entityId: body.task_id, taskId: body.task_id, goalId: data?.goal_id, requestSource: "POST /api/ui/tasks", beforeState: before, afterState: data, metadata: { assigned_to: body.agent_id } });
      return NextResponse.json({ ok: true, task: data });
    }

    return apiError("Unsupported task UI action", 400);
  } catch (error) {
    return apiError("Unhandled task UI error", 500, error);
  }
}
