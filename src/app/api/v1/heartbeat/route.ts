import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

// POST /api/v1/heartbeat — agent pushes its status
export async function POST(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const db = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Update the agent's status fields
    const update: Record<string, unknown> = {
      last_heartbeat: now,
      last_seen: now,
      updated_at: now,
    };

    // Allow agent to push specific fields
    const allowedFields = [
      "status", "current_task", "queue_depth", "uptime",
      "host_cpu", "host_ram", "host_disk", "host_network",
      "errors_1h", "errors_24h", "api_latency",
      "cost_today", "cost_week", "cost_month", "tokens_today",
      "agent_version", "system_version",
      "session_count_today", "workspace_size",
      "side_projects", "abandoned_projects",
      "tailscale_status",
      "workspace_files_content",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    const { error } = await db
      .from("agents")
      .update(update)
      .eq("id", auth.agentId);

    if (error) throw error;

    // Also log a heartbeat event (sparse — only every 6th heartbeat to avoid noise)
    const { count } = await db
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", auth.agentId)
      .eq("type", "heartbeat")
      .gte("created_at", new Date(Date.now() - 3600000).toISOString());

    if ((count || 0) < 1) {
      await db.from("events").insert({
        agent_id: auth.agentId,
        type: "heartbeat",
        message: `Heartbeat: ${body.status || "online"}, task: ${body.current_task || "idle"}`,
      });
    }

    return NextResponse.json({ ok: true, timestamp: now });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
