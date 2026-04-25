import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

// POST /api/v1/heartbeat — agent pushes its status + work state
export async function POST(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const db = getSupabaseAdmin();
    const now = new Date().toISOString();

    const update: Record<string, unknown> = {
      last_heartbeat: now,
      last_seen: now,
      updated_at: now,
    };

    // System metrics
    const metricFields = [
      "status", "current_task", "queue_depth", "uptime",
      "host_cpu", "host_ram", "host_disk", "host_network",
      "errors_1h", "errors_24h", "api_latency",
      "cost_today", "cost_week", "cost_month", "tokens_today",
      "agent_version", "system_version",
      "session_count_today", "workspace_size",
      "side_projects", "abandoned_projects",
      "tailscale_status",
    ];

    for (const field of metricFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    // Coordination fields
    if (body.work_state !== undefined) update.work_state = body.work_state;
    if (body.capabilities !== undefined) update.capabilities = body.capabilities;
    if (body.available_for !== undefined) update.available_for = body.available_for;

    const { error } = await db
      .from("agents")
      .update(update)
      .eq("id", auth.agentId);

    if (error) throw error;

    // Log heartbeat event (sparse)
    const { count } = await db
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", auth.agentId)
      .eq("type", "heartbeat")
      .gte("created_at", new Date(Date.now() - 3600000).toISOString());

    if ((count || 0) < 1) {
      const task = body.work_state?.task || body.current_task || "idle";
      await db.from("events").insert({
        agent_id: auth.agentId,
        type: "heartbeat",
        message: `Heartbeat: ${body.status || "online"}, working on: ${task}`,
      });
    }

    return NextResponse.json({ ok: true, timestamp: now });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
