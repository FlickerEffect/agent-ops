import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

// Fields safe to return to any authenticated token
const SAFE_FIELDS = "id, name, role, owner, status, environment, sla_tier, current_task, queue_depth, uptime, host_cpu, host_ram, host_disk, host_network, host_location, model, cost_today, cost_week, cost_month, tokens_today, last_heartbeat, last_seen, errors_24h, agent_version, memory_structure, side_projects, abandoned_projects, channels";

// Fields only admins and fleet-read get
const ADMIN_FIELDS = SAFE_FIELDS + ", host_ip, host_name, tailscale_ip, tailscale_status, ssh_access, service_access, mcp_connections, workspace_files_content, security, jwt_token_hash";

// GET /api/v1/fleet — fleet summary, blockers, stale tasks
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "summary";

  // Determine field visibility
  const canSeeSensitive = auth.scope === "admin" || auth.scope === "fleet-read";
  const fields = canSeeSensitive ? ADMIN_FIELDS : SAFE_FIELDS;

  try {
    const db = getSupabaseAdmin();

    if (view === "summary") {
      const { data: agents } = await db
        .from("agents")
        .select("id, name, status, owner, cost_today, cost_week, cost_month");

      // Owner-fleet scope filtering
      const visible = auth.scope === "owner-fleet"
        ? agents?.filter(a => a.owner === auth.owner)
        : agents;

      const total = visible?.length || 0;
      const online = visible?.filter(a => a.status === "online").length || 0;
      const degraded = visible?.filter(a => a.status === "degraded").length || 0;
      const offline = visible?.filter(a => a.status === "offline").length || 0;
      const stuck = visible?.filter(a => a.status === "stuck").length || 0;
      const totalCostToday = visible?.reduce((sum, a) => sum + (a.cost_today || 0), 0) || 0;
      const totalCostMonth = visible?.reduce((sum, a) => sum + (a.cost_month || 0), 0) || 0;

      return NextResponse.json({
        summary: {
          total, online, degraded, offline, stuck,
          healthyPct: total > 0 ? Math.round((online / total) * 100) : 0,
          costToday: totalCostToday,
          costMonth: totalCostMonth,
          scope: auth.scope,
        },
      });
    }

    if (view === "blockers") {
      let query = db
        .from("blockers")
        .select("*, agents(name, owner)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      const { data } = await query;

      // Filter by owner scope
      const visible = auth.scope === "owner-fleet"
        ? data?.filter(b => (b.agents as { owner?: string })?.owner === auth.owner)
        : data;

      return NextResponse.json({ blockers: visible || [] });
    }

    if (view === "stale") {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      let query = db
        .from("agents")
        .select("id, name, owner, current_task, abandoned_projects, last_seen, last_human_interaction");

      if (auth.scope === "owner-fleet") {
        query = query.eq("owner", auth.owner);
      } else if (auth.scope === "self") {
        query = query.eq("id", auth.agentId);
      }

      const { data } = await query.lt("last_seen", threeDaysAgo);
      return NextResponse.json({ stale: data || [] });
    }

    if (view === "work") {
      let query = db
        .from("agents")
        .select("id, name, role, owner, status, current_task, queue_depth, side_projects")
        .order("name");

      if (auth.scope === "owner-fleet") {
        query = query.eq("owner", auth.owner);
      } else if (auth.scope === "self") {
        query = query.eq("id", auth.agentId);
      }

      const { data } = await query;
      return NextResponse.json({ work: data || [] });
    }

    if (view === "cost") {
      // Only admin and fleet-read see full cost breakdown
      if (auth.scope !== "admin" && auth.scope !== "fleet-read") {
        return NextResponse.json({ error: "Insufficient scope for cost data" }, { status: 403 });
      }

      const { data } = await db
        .from("agents")
        .select("id, name, model, cost_today, cost_week, cost_month, tokens_today")
        .order("cost_today", { ascending: false });
      return NextResponse.json({ costs: data || [] });
    }

    return NextResponse.json({ error: "Unknown view. Options: summary, blockers, stale, work, cost" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
