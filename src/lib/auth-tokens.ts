import { SignJWT, jwtVerify } from "jose";

// Fix 1: No fallback secret — fail loudly if not configured
function getJwtSecret(): Uint8Array {
  const secret = process.env.AGENT_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AGENT_JWT_SECRET or NEXTAUTH_SECRET must be set. No fallback allowed.");
  }
  return new TextEncoder().encode(secret);
}

export interface AgentTokenPayload {
  agentId: string;
  name: string;
  owner: string;
  scope: "admin" | "self" | "fleet-read" | "owner-fleet";
}

export async function createAgentToken(payload: AgentTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(getJwtSecret());
}

export async function verifyAgentToken(token: string): Promise<AgentTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as AgentTokenPayload;
  } catch {
    return null;
  }
}

export async function authenticateAgent(request: Request): Promise<AgentTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyAgentToken(authHeader.slice(7));
}

// Fix 2: Add greg@humla.vc as admin
export const ADMIN_EMAILS = ["chris00steele@gmail.com", "greg@humla.vc"];
