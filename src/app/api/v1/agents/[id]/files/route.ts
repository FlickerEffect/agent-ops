import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth-tokens";
import { getToken } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/db";
import type { NextRequest } from "next/server";

const ADMIN_EMAILS = ["chris00steele@gmail.com", "greg@humla.vc"];

// GET /api/v1/agents/:id/files?name=SOUL.md
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Allow both JWT (agent) and session (web user) auth
  const agentAuth = await authenticateAgent(request);
  const sessionAuth = await getToken({ req: request });
  
  if (!agentAuth && (!sessionAuth || !ADMIN_EMAILS.includes(sessionAuth.email as string))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("name");

  try {
    const db = getSupabaseAdmin();
    const { data: agent, error } = await db
      .from("agents")
      .select("workspace_files_content")
      .eq("id", id)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const files = agent.workspace_files_content || {};

    if (fileName) {
      const content = files[fileName];
      if (content === undefined || content === null) {
        return NextResponse.json({ error: `File ${fileName} not found or not synced` }, { status: 404 });
      }
      return NextResponse.json({ file: fileName, content });
    }

    // Return list of available files
    const available = Object.entries(files).map(([name, content]) => ({
      name,
      available: content !== null,
      size: typeof content === "string" ? content.length : 0,
    }));

    return NextResponse.json({ files: available });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
