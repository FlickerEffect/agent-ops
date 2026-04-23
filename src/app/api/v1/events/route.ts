import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getSupabaseAdmin } from "@/lib/db";

// GET /api/v1/events — get events (optional ?agent_id= filter)
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const db = getSupabaseAdmin();
    let query = db
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 200));

    if (agentId) query = query.eq("agent_id", agentId);
    if (type) query = query.eq("type", type);

    // Scope filtering
    if (auth.scope === "self") {
      query = query.eq("agent_id", auth.agentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ events: data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/v1/events — log an event
export async function POST(request: Request) {
  const auth = await authenticateAgent(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const db = getSupabaseAdmin();

    const event = {
      agent_id: auth.scope === "admin" ? (body.agent_id || auth.agentId) : auth.agentId,
      type: body.type || "info",
      message: body.message,
      metadata: body.metadata || null,
    };

    const { data, error } = await db.from("events").insert(event).select().single();
    if (error) throw error;

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
