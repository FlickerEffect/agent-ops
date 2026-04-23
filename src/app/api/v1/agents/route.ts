import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

// GET /api/v1/agents — list all agents
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getSupabaseAdmin();
    let query = db.from("agents").select("*").order("name");

    // Scope filtering
    if (auth.scope === "self") {
      query = query.eq("id", auth.agentId);
    } else if (auth.scope === "owner-fleet") {
      query = query.eq("owner", auth.owner);
    }
    // admin and fleet-read see everything

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ agents: data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/v1/agents — register a new agent (admin only)
export async function POST(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth || auth.scope !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("agents").insert(body).select().single();
    if (error) throw error;

    return NextResponse.json({ agent: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
