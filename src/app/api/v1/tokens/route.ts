import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createAgentToken, ADMIN_EMAILS } from "@/lib/auth-tokens";
import type { NextRequest } from "next/server";

// POST /api/v1/tokens — generate a JWT token for an agent (admin only, via web session)
export async function POST(request: NextRequest) {
  const session = await getToken({ req: request });
  if (!session || !ADMIN_EMAILS.includes(session.email as string)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body.agentId || !body.name || !body.owner) {
      return NextResponse.json({ error: "Required: agentId, name, owner" }, { status: 400 });
    }

    const token = await createAgentToken({
      agentId: body.agentId,
      name: body.name,
      owner: body.owner,
      scope: body.scope || "self",
    });

    return NextResponse.json({
      token,
      agentId: body.agentId,
      scope: body.scope || "self",
      note: "Store this token securely.",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
