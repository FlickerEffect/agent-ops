import { NextResponse } from "next/server";
import { authenticateAgent, ADMIN_EMAILS } from "@/lib/auth-tokens";
import { getToken } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/db";
import type { NextRequest } from "next/server";

// Safe fields for any valid token
const PUBLIC_FIELDS = "id, name, role, owner, status, environment, sla_tier, current_task, queue_depth, uptime, host_cpu, host_ram, host_disk, host_network, host_location, model, cost_today, cost_week, cost_month, tokens_today, last_heartbeat, last_seen, errors_1h, errors_24h, api_latency, agent_version, memory_structure, channels, side_projects, abandoned_projects, peer_agents, cron_jobs, permissions, approved_models, fallback_chain, auto_restart, last_restart_reason, last_restart_time, backup_healthy, secrets_total, secrets_expiring, secrets_expired, last_rotation, autonomy_levels, maintenance_window, workspace_files, workspace_files_content, tailscale_ip, tailscale_status, tags, sla_tier, session_count_today, last_human_interaction";

// Sensitive fields — admin and fleet-read only
const SENSITIVE_FIELDS = ", host_ip, host_name, ssh_access, service_access, mcp_connections, security, jwt_token_hash";

// GET /api/v1/agents
export async function GET(request: NextRequest) {
  const agentAuth = await authenticateAgent(request);
  const sessionAuth = await getToken({ req: request });
  const isWebAdmin = sessionAuth && ADMIN_EMAILS.includes(sessionAuth.email as string);

  if (!agentAuth && !isWebAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine what fields to return
  const canSeeSensitive = isWebAdmin || agentAuth?.scope === "admin" || agentAuth?.scope === "fleet-read";
  const selectFields = canSeeSensitive ? PUBLIC_FIELDS + SENSITIVE_FIELDS : PUBLIC_FIELDS;

  try {
    const db = getSupabaseAdmin();
    let query = db.from("agents").select(selectFields).order("name");

    // Scope filtering
    if (agentAuth?.scope === "self") {
      query = query.eq("id", agentAuth.agentId);
    } else if (agentAuth?.scope === "owner-fleet") {
      query = query.eq("owner", agentAuth.owner);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ agents: data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/v1/agents — register a new agent (admin only)
export async function POST(request: NextRequest) {
  const agentAuth = await authenticateAgent(request);
  const sessionAuth = await getToken({ req: request });
  const isWebAdmin = sessionAuth && ADMIN_EMAILS.includes(sessionAuth.email as string);

  if (!isWebAdmin && agentAuth?.scope !== "admin") {
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
