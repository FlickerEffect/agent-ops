import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AGENT_JWT_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret"
);

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
    .sign(JWT_SECRET);
}

export async function verifyAgentToken(token: string): Promise<AgentTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AgentTokenPayload;
  } catch {
    return null;
  }
}

// Middleware helper for API routes
export async function authenticateAgent(request: Request): Promise<AgentTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyAgentToken(authHeader.slice(7));
}
