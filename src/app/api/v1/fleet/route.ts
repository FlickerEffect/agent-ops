import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

// GET /api/v1/fleet — fleet summary, blockers, stale tasks
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "summary";

  try {
    const db = getSupabaseAdmin();

    if (view === "summary") {
      const { data: agents } = await db.from("agents").select("id, name, status, owner, cost_today, cost_week, cost_month");
      const total = agents?.length || 0;
      const online = agents?.filter(a => a.status === "online").length || 0;
      const degraded = agents?.filter(a => a.status === "degraded").length || 0;
      const offline = agents?.filter(a => a.status === "offline").length || 0;
      const stuck = agents?.filter(a => a.status === "stuck").length || 0;
      const totalCostToday = agents?.reduce((sum, a) => sum + (a.cost_today || 0), 0) || 0;
      const totalCostMonth = agents?.reduce((sum, a) => sum + (a.cost_month || 0), 0) || 0;

      return NextResponse.json({
        summary: {
          total, online, degraded, offline, stuck,
          healthyPct: total > 0 ? Math.round((online / total) * 100) : 0,
          costToday: totalCostToday,
          costMonth: totalCostMonth,
        },
      });
    }

    if (view === "blockers") {
      const { data } = await db
        .from("blockers")
        .select("*, agents(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return NextResponse.json({ blockers: data || [] });
    }

    if (view === "stale") {
      // Agents with abandoned projects or no activity in 3+ days
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      const { data } = await db
        .from("agents")
        .select("id, name, current_task, abandoned_projects, last_seen, last_human_interaction")
        .or(`last_seen.lt.${threeDaysAgo},abandoned_projects.neq.{}`);
      return NextResponse.json({ stale: data || [] });
    }

    if (view === "work") {
      const { data } = await db
        .from("agents")
        .select("id, name, role, status, current_task, queue_depth, side_projects")
        .order("name");
      return NextResponse.json({ work: data || [] });
    }

    if (view === "cost") {
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
