import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

// GET /api/v1/agents/:id — get single agent
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = getSupabaseAdmin();
    const { data: agent, error } = await db.from("agents").select("*").eq("id", id).single();
    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Scope check
    if (auth.scope === "self" && auth.agentId !== id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (auth.scope === "owner-fleet" && agent.owner !== auth.owner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get recent events
    const { data: events } = await db
      .from("events")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get active blockers
    const { data: blockers } = await db
      .from("blockers")
      .select("*")
      .eq("agent_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    return NextResponse.json({ agent, events: events || [], blockers: blockers || [] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/v1/agents/:id — update agent (self or admin)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Only self or admin can update
  if (auth.scope !== "admin" && auth.agentId !== id) {
    return NextResponse.json({ error: "Can only update own record" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const db = getSupabaseAdmin();

    // Prevent non-admins from changing certain fields
    if (auth.scope !== "admin") {
      delete body.owner;
      delete body.autonomy_levels;
      delete body.jwt_token_hash;
    }

    body.updated_at = new Date().toISOString();

    const { data, error } = await db.from("agents").update(body).eq("id", id).select().single();
    if (error) throw error;

    return NextResponse.json({ agent: data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
