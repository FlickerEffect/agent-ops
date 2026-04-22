# Agent Ops Dashboard — Handoff

**Repo:** `github.com/FlickerEffect/agent-ops` (private)  
**Live:** `flicker-ops.vercel.app` (auto-deploys on push)  
**Target domain:** `teams.flickereffect.net`  
**Stack:** Next.js 15 + Tailwind CSS + TypeScript  
**Vercel team:** `flicker-effects-projects`

---

## What Exists

A fully functional static dashboard with 6 pages:

| Page | Route | What it shows |
|------|-------|--------------|
| Dashboard | `/` | Fleet summary cards, "Needs Attention" alerts, filterable agent table |
| Agents | `/agents` | Full agent table with detail slideout on click |
| Security | `/security` | Per-agent hardening matrix (firewall, SSH, encryption, audit, vulns) |
| Costs | `/costs` | Token + USD breakdown by agent (daily/weekly/monthly) |
| Timeline | `/timeline` | Merged event feed across all agents |
| Settings | `/settings` | Org config, notification toggles, model policy (read-only) |

**All data is currently mock.** 6 fake agents with realistic data. The real fleet has ~10 servers across Flicker Effect and 36 Group.

---

## What Needs to Be Done

### 1. Populate Real Agent Data

Replace `src/lib/mock-data.ts` with actual agent inventory. Chris has ~10 servers. You need from him:
- Hostname, IP, provider for each server
- What's running on each (OpenClaw agents, scripts, web apps)
- Owner (Flicker Effect vs 36 Group)
- Environment (prod/staging/dev)

### 2. Wire to Live Data Source

Currently static mock data. Options for making it live:

**Option A (simple):** Each agent pushes status to a JSON file on a shared endpoint. Dashboard fetches on load. Cron job on each server posts heartbeat.

**Option B (proper):** Build a lightweight API (`/api/agents`, `/api/heartbeat`) backed by a database (Postgres on Vercel, or SQLite). Each agent posts heartbeats via a cron job. Dashboard reads from API.

**Option C (OpenClaw native):** Use OpenClaw's built-in status/session APIs if available. Each agent's gateway exposes status data.

### 3. Domain Setup

Add `teams.flickereffect.net` in Vercel project settings → Domains. Then add DNS:
```
CNAME teams.flickereffect.net → cname.vercel-dns.com
```

### 4. Auth

Dashboard is currently public. Add authentication before putting real data on it. Options:
- Vercel Auth (simplest)
- Clerk
- NextAuth with Google/GitHub login
- Basic password protection via middleware

---

## Key Files

```
src/
├── app/
│   ├── page.tsx              # Dashboard (main)
│   ├── agents/page.tsx       # Agents list
│   ├── security/page.tsx     # Security matrix
│   ├── costs/page.tsx        # Cost tracking
│   ├── timeline/page.tsx     # Event timeline
│   └── settings/page.tsx     # Config (read-only)
├── components/
│   ├── Sidebar.tsx           # Nav sidebar (active page highlight)
│   ├── FleetSummary.tsx      # Summary cards
│   ├── NeedsAttention.tsx    # Alert panel
│   ├── AgentTable.tsx        # Filterable table + row click
│   └── AgentDetail.tsx       # Slideout detail panel (all fields)
└── lib/
    ├── types.ts              # TypeScript interfaces for Agent, etc.
    └── mock-data.ts          # ← REPLACE THIS with real data source
```

## Agent Data Schema

Each agent has these field groups (all defined in `src/lib/types.ts`):

- **Identity:** id, name, owner, environment, tags, SLA tier
- **Status:** online/degraded/offline/stuck, heartbeat, current task, queue depth
- **Version:** agent/system/tooling versions, drift detection
- **Host:** hostname, IP, location, CPU/RAM/disk/network/GPU
- **Performance:** errors (1h/24h), task latency, API latency
- **Cost:** model, tokens/day, $/day/week/month
- **Permissions:** list of access scopes
- **Backup:** last backup, last restore test, health
- **Secrets:** total, expiring, expired, last rotation
- **Self-heal:** auto-restart enabled, last restart reason
- **Security:** patches, firewall, SSH, encryption, MFA, audit logs, vuln scan, network risk
- **Governance:** maintenance window, approved models, fallback chain
- **Timeline:** array of events (deploy, crash, config change, alert, etc.)

---

## Vercel Deployment

- **Auto-deploys** on push to `main`
- **Vercel token** (if needed for CLI deploys): ask Chris
- **No env vars required** for current static version
- Build command: `npm run build` (Next.js default)

---

## Design Notes

- Dark theme: `#0a0e1a` background, `#111827` surfaces
- Accent: Indigo (`#6366f1`)
- Status colors: green (online), yellow (degraded), red (offline), orange (stuck)
- Font: Inter (body) + JetBrains Mono (monospace/data)
- Glassmorphism cards with subtle blur
- All text recently bumped for higher contrast against dark background
