-- Agent Ops Database Schema
-- Run this in Supabase SQL editor to set up tables

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL,
  avatar_url TEXT,
  environment TEXT NOT NULL DEFAULT 'prod',
  tags TEXT[] DEFAULT '{}',
  sla_tier TEXT DEFAULT 'medium',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'offline',
  current_task TEXT,
  queue_depth INTEGER DEFAULT 0,
  uptime TEXT,
  
  -- Version
  agent_version TEXT,
  system_version TEXT,
  model TEXT DEFAULT '',
  
  -- Host
  host_name TEXT NOT NULL DEFAULT '',
  host_ip TEXT NOT NULL DEFAULT '',
  host_location TEXT DEFAULT '',
  host_cpu REAL DEFAULT 0,
  host_ram REAL DEFAULT 0,
  host_disk REAL DEFAULT 0,
  host_network TEXT DEFAULT 'healthy',
  workspace_size TEXT,
  
  -- Tailscale
  tailscale_ip TEXT,
  tailscale_status TEXT,
  
  -- Communication & Memory
  memory_structure TEXT DEFAULT 'openclaw-standard',
  channels JSONB DEFAULT '[]',
  workspace_files JSONB DEFAULT '{}',
  
  -- Access
  ssh_access JSONB DEFAULT '[]',
  service_access JSONB DEFAULT '[]',
  mcp_connections JSONB DEFAULT '[]',
  
  -- Projects
  side_projects TEXT[] DEFAULT '{}',
  abandoned_projects TEXT[] DEFAULT '{}',
  
  -- Peer agents
  peer_agents TEXT[] DEFAULT '{}',
  github_repos TEXT[] DEFAULT '{}',
  cron_jobs JSONB DEFAULT '[]',
  
  -- Permissions & Autonomy
  permissions TEXT[] DEFAULT '{}',
  approved_models TEXT[] DEFAULT '{}',
  fallback_chain TEXT[] DEFAULT '{}',
  autonomy_levels JSONB DEFAULT '{}',
  maintenance_window TEXT DEFAULT 'Not configured',
  
  -- Cost
  cost_today REAL DEFAULT 0,
  cost_week REAL DEFAULT 0,
  cost_month REAL DEFAULT 0,
  tokens_today INTEGER DEFAULT 0,
  
  -- Performance
  errors_1h INTEGER DEFAULT 0,
  errors_24h INTEGER DEFAULT 0,
  api_latency INTEGER DEFAULT 0,
  task_start_delay INTEGER DEFAULT 0,
  completion_time INTEGER DEFAULT 0,
  
  -- Backup & Secrets
  last_backup TIMESTAMPTZ,
  backup_healthy BOOLEAN DEFAULT false,
  secrets_total INTEGER DEFAULT 0,
  secrets_expiring INTEGER DEFAULT 0,
  secrets_expired INTEGER DEFAULT 0,
  last_rotation TIMESTAMPTZ,
  
  -- Self-heal
  auto_restart BOOLEAN DEFAULT true,
  last_restart_reason TEXT,
  last_restart_time TIMESTAMPTZ,
  
  -- Security
  security JSONB DEFAULT '{}',
  
  -- Timestamps
  last_heartbeat TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  last_human_interaction TIMESTAMPTZ,
  session_count_today INTEGER DEFAULT 0,
  
  -- Auth
  jwt_token_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blockers table
CREATE TABLE IF NOT EXISTS blockers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  blocked_on TEXT NOT NULL DEFAULT 'human', -- "human" | "agent:<id>" | "external:<what>"
  priority TEXT DEFAULT 'medium', -- "critical" | "high" | "medium" | "low"
  status TEXT DEFAULT 'active', -- "active" | "resolved"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'new', -- "new" | "reviewed" | "actioned" | "dismissed"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blockers_active ON blockers(status, agent_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status, agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner);

-- RLS (Row Level Security) — disabled for now since we use service role key
-- Enable when we add direct Supabase auth
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_all" ON agents FOR ALL USING (true);
CREATE POLICY "service_role_all" ON events FOR ALL USING (true);
CREATE POLICY "service_role_all" ON blockers FOR ALL USING (true);
CREATE POLICY "service_role_all" ON ideas FOR ALL USING (true);
