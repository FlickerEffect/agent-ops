import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using service role key
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Database types
export interface DbAgent {
  id: string;
  name: string;
  role: string;
  owner: string;
  avatar_url?: string;
  environment: string;
  tags: string[];
  sla_tier: string;
  status: string;
  current_task?: string;
  queue_depth: number;
  uptime?: string;
  agent_version?: string;
  system_version?: string;
  model: string;
  host_name: string;
  host_ip: string;
  host_location: string;
  host_cpu: number;
  host_ram: number;
  host_disk: number;
  host_network: string;
  workspace_size?: string;
  tailscale_ip?: string;
  tailscale_status?: string;
  memory_structure: string;
  channels: Record<string, unknown>[];
  ssh_access: Record<string, unknown>[];
  service_access: Record<string, unknown>[];
  mcp_connections: Record<string, unknown>[];
  side_projects: string[];
  abandoned_projects: string[];
  peer_agents: string[];
  permissions: string[];
  approved_models: string[];
  autonomy_levels: Record<string, number>;
  cost_today: number;
  cost_week: number;
  cost_month: number;
  tokens_today: number;
  last_heartbeat?: string;
  last_seen?: string;
  last_human_interaction?: string;
  session_count_today: number;
  jwt_token_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface DbEvent {
  id: string;
  agent_id: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DbBlocker {
  id: string;
  agent_id: string;
  description: string;
  blocked_on: string; // "human" | "agent:<id>" | "external"
  priority: string;
  status: string; // "active" | "resolved"
  created_at: string;
  resolved_at?: string;
}

export interface DbIdea {
  id: string;
  agent_id: string;
  description: string;
  category?: string;
  status: string; // "new" | "reviewed" | "actioned" | "dismissed"
  created_at: string;
}
