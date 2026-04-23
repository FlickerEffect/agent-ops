# Agent Ops API

Base URL: `https://agentops.flickereffect.net/api/v1`

## Authentication

All API endpoints require a Bearer token:
```
Authorization: Bearer <agent-jwt-token>
```

Tokens are created via the web dashboard (admin only) at `/api/v1/tokens`.

### Token Scopes
- `admin` — full access to everything
- `self` — can only read/write own agent data
- `fleet-read` — read-only access to all agents
- `owner-fleet` — read access to all agents owned by same owner

## Endpoints

### Agents

#### `GET /api/v1/agents`
List all agents (filtered by token scope).

#### `GET /api/v1/agents/:id`
Get single agent with recent events and active blockers.

#### `PATCH /api/v1/agents/:id`
Update agent fields. Self or admin only.

#### `POST /api/v1/agents`
Register new agent. Admin only.

### Heartbeat

#### `POST /api/v1/heartbeat`
Agent pushes its current status. Allowed fields:
```json
{
  "status": "online",
  "current_task": "Building dashboard",
  "queue_depth": 0,
  "uptime": "3d 5h",
  "host_cpu": 35,
  "host_ram": 42,
  "host_disk": 16,
  "errors_1h": 0,
  "errors_24h": 1,
  "cost_today": 12.50,
  "tokens_today": 980000,
  "agent_version": "2026.4.15",
  "session_count_today": 5,
  "side_projects": ["Project A", "Project B"],
  "abandoned_projects": ["Stale thing"]
}
```

### Events

#### `GET /api/v1/events?agent_id=&type=&limit=`
List events. Optional filters.

#### `POST /api/v1/events`
Log an event:
```json
{
  "type": "deploy",
  "message": "Pushed v2.0 to production",
  "metadata": { "commit": "abc123" }
}
```
Types: `deploy`, `crash`, `model_change`, `security`, `config`, `restart`, `alert`, `info`, `heartbeat`

### Fleet

#### `GET /api/v1/fleet?view=summary`
Fleet summary (agent counts, health %, total cost).

#### `GET /api/v1/fleet?view=blockers`
All active blockers across the fleet.

#### `GET /api/v1/fleet?view=stale`
Agents with abandoned projects or no activity in 3+ days.

#### `GET /api/v1/fleet?view=work`
Who's doing what right now.

#### `GET /api/v1/fleet?view=cost`
Cost breakdown by agent.

### Tokens

#### `POST /api/v1/tokens`
Generate JWT for an agent. Requires web session (admin Google account).
```json
{
  "agentId": "nathan-01",
  "name": "Nathan Reid",
  "owner": "Chris Steele",
  "scope": "admin"
}
```

## Agent Heartbeat Setup

Add to each agent's OpenClaw cron or heartbeat:
```bash
curl -s -X POST https://agentops.flickereffect.net/api/v1/heartbeat \
  -H "Authorization: Bearer $AGENTOPS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "online",
    "current_task": "...",
    "host_cpu": 25,
    "host_ram": 40,
    "host_disk": 16
  }'
```
