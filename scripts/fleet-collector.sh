#!/usr/bin/env bash
# Fleet Collector - runs on Henry, SSHes into each agent, collects real metrics
# Updates Supabase directly via REST API
set -euo pipefail

SUPABASE_URL="https://kfyxrcgsqlbdtcezncms.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmeXhyY2dzcWxiZHRjZXpuY21zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc4MDM1MywiZXhwIjoyMDkyMzU2MzUzfQ.-KIkw4gHD-GlADrKYVqmcoSnE3pmfJ1WG68vZXwPonk"
SSH_KEY="/root/.ssh/id_ed25519"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=8 -o BatchMode=yes -i $SSH_KEY"

# Agent registry: id|ip|ssh_user|workspace_path
AGENTS=(
  "nathan-06|178.104.157.99|openclaw|/home/openclaw/.openclaw/workspaces/nathan"
  "katelyn-09|178.104.157.99|openclaw|/home/openclaw/.openclaw/workspaces/chloe"
  "gideon-05|46.224.57.251|openclaw|/home/openclaw/.openclaw/workspaces/gideon"
  "henry-04|204.168.193.91|root|/home/openclaw/.openclaw/workspaces/henry"
  "chloe-36g-03|204.168.131.248|openclaw|/home/openclaw/.openclaw/workspaces/chloe"
  "sloane-08|77.42.81.193|openclaw|/home/openclaw/.openclaw/workspaces/sloane"
  "sam-02|62.238.0.214|root|/home/openclaw/.openclaw/workspaces/sam"
  "marko-07|178.104.178.227|root|/home/openclaw/.openclaw/workspaces/marko"
)

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

collect_agent() {
  local AGENT_ID IP SSH_USER WS_PATH
  IFS='|' read -r AGENT_ID IP SSH_USER WS_PATH <<< "$1"
  
  echo "[$AGENT_ID] Collecting from $SSH_USER@$IP ..."
  
  # Remote collection script - runs on the agent's server
  REMOTE_DATA=$(ssh $SSH_OPTS "$SSH_USER@$IP" bash -s "$WS_PATH" << 'REMOTE_SCRIPT' 2>/dev/null) || {
    echo "[$AGENT_ID] SSH failed - marking offline"
    # Update as offline
    curl -s -o /dev/null -X PATCH \
      -H "apikey: $SUPABASE_KEY" \
      -H "Authorization: Bearer $SUPABASE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      "$SUPABASE_URL/rest/v1/agents?id=eq.$AGENT_ID" \
      -d "{\"status\":\"offline\",\"last_seen\":\"$NOW\",\"updated_at\":\"$NOW\"}"
    return
  }

WS_PATH="$1"

# Find openclaw.json
OC_CONFIG=""
for cfg in "$WS_PATH/.openclaw/openclaw.json" "$HOME/.openclaw/openclaw.json"; do
  [ -f "$cfg" ] && OC_CONFIG="$cfg" && break
done

python3 << PYEOF
import json, subprocess, os, re, glob

ws = "$WS_PATH"
oc_config = "$OC_CONFIG"

def run(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL, timeout=5).decode().strip()
    except:
        return ""

def read_file(path):
    try:
        with open(path) as f:
            return f.read()
    except:
        return ""

data = {}

# --- System metrics ---
cpu_line = run("top -bn1 | grep '%Cpu'")
if cpu_line:
    parts = cpu_line.split()
    try:
        data["host_cpu"] = int(float(parts[1]) + float(parts[3]))
    except:
        data["host_cpu"] = 0

mem = run("free | awk '/Mem:/{printf \"%.0f\", \\$3/\\$2*100}'")
data["host_ram"] = int(mem) if mem.isdigit() else 0

disk = run("df / | awk 'NR==2{print int(\\$5)}'")
data["host_disk"] = int(disk) if disk.isdigit() else 0

data["uptime"] = run("uptime -p").replace("up ", "") or "unknown"

# Network check
net = run("ping -c1 -W2 1.1.1.1 && echo ok")
data["host_network"] = "healthy" if "ok" in net else "degraded"

# --- OpenClaw version ---
ver = run("openclaw --version 2>/dev/null | head -1")
data["agent_version"] = ver if ver else "unknown"
data["system_version"] = ver if ver else "unknown"

# --- Workspace size ---
ws_size = run(f"du -sh {ws} | awk '{{print \\$1}}'")
data["workspace_size"] = ws_size or "unknown"

# --- Workspace files ---
ws_files = {}
for name, key in [("SOUL.md","soul"),("AGENTS.md","agents"),("USER.md","user"),
                   ("TOOLS.md","tools"),("MEMORY.md","memory"),("HEARTBEAT.md","heartbeat")]:
    ws_files[key] = os.path.exists(os.path.join(ws, name))
data["workspace_files"] = ws_files

# --- Parse SOUL.md / IDENTITY.md for role ---
soul = read_file(os.path.join(ws, "SOUL.md"))
identity = read_file(os.path.join(ws, "IDENTITY.md"))
user_md = read_file(os.path.join(ws, "USER.md"))
tools_md = read_file(os.path.join(ws, "TOOLS.md"))
memory_md = read_file(os.path.join(ws, "MEMORY.md"))

# Role
role = ""
for line in identity.split("\n"):
    if line.strip().startswith("- **Role") or line.strip().startswith("**Role"):
        role = re.sub(r'\*\*|^-\s*', '', line.split(":", 1)[-1]).strip()
        break
if not role:
    for line in soul.split("\n"):
        m = re.match(r'\*\*You are (.+?)[\.\*]', line)
        if m:
            role = m.group(1).strip()
            break

# Owner
owner = ""
for line in user_md.split("\n"):
    if "**Name" in line or "- **Name" in line:
        owner = re.sub(r'\*\*|^-\s*', '', line.split(":", 1)[-1]).strip()
        break

# --- Parse openclaw.json ---
model = "unknown"
channels = []
mcp_connections = []
if oc_config:
    try:
        cfg = json.load(open(oc_config))
        ad = cfg.get("agents", {}).get("defaults", {})
        m = ad.get("model", {})
        if isinstance(m, str):
            model = m
        elif isinstance(m, dict):
            model = m.get("primary", "unknown")
        
        for ch_type, ch_cfg in cfg.get("channels", {}).items():
            if isinstance(ch_cfg, dict) and ch_cfg.get("enabled", True):
                channels.append({"type": ch_type, "handle": ""})
        
        # MCP servers
        for name, mcfg in cfg.get("mcpServers", {}).items():
            mcp_connections.append({
                "name": name,
                "type": mcfg.get("transport", "stdio"),
                "status": "connected"
            })
    except:
        pass

# --- SSH access from TOOLS.md ---
ssh_access = []
in_ssh = False
for line in tools_md.split("\n"):
    if re.search(r"SSH|ssh.*access", line, re.I) and (line.startswith("#") or line.startswith("|")):
        in_ssh = True
        continue
    if in_ssh and line.startswith("#") and "SSH" not in line:
        in_ssh = False
    if in_ssh:
        ips = re.findall(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b', line)
        if ips:
            parts = [p.strip().strip("|").strip() for p in line.split("|") if p.strip()]
            name = parts[0] if parts else ""
            for ip in ips[:1]:
                ssh_access.append({"host": name, "ip": ip, "user": "root"})

# --- Service access from TOOLS.md ---
service_access = []
seen = set()
for line in tools_md.split("\n"):
    for svc in ["GitHub", "Gmail", "Google", "Hetzner", "Cloudflare", "Atlassian", "Figma", "Anthropic", "OpenAI"]:
        if svc.lower() in line.lower() and any(w in line.lower() for w in ["token", "oauth", "key", "pat", "credential"]):
            method = "API key"
            if "oauth" in line.lower(): method = "OAuth"
            elif "pat" in line.lower(): method = "PAT"
            if svc not in seen:
                service_access.append({"service": svc, "method": method})
                seen.add(svc)

# --- Side projects from MEMORY.md ---
side_projects = []
in_proj = False
for line in memory_md.split("\n"):
    if re.match(r'^##\s+Active\s+Projects', line) or re.match(r'^##\s+Projects', line):
        in_proj = True
        continue
    if in_proj and re.match(r'^##\s', line) and "project" not in line.lower():
        in_proj = False
    if in_proj and line.startswith("###"):
        pname = line.replace("#", "").strip()
        if pname:
            side_projects.append(pname)

# --- Peer agents from MEMORY.md ---
peer_agents = []
for line in memory_md.split("\n"):
    if "Agent Fleet" in line or "AI Agent" in line:
        # scan nearby lines for agent names
        continue

# --- Security ---
security = {
    "patchLevel": "unknown",
    "lastOsUpdate": "unknown", 
    "firewallStatus": "unknown",
    "portsExposed": [],
    "sshPasswordDisabled": True,
    "sshKeyOnly": True,
    "fail2ban": False,
    "diskEncryption": False,
    "mfaEnabled": False,
    "auditLogEnabled": False,
    "auditRetentionDays": 0,
    "lastVulnScan": None,
    "criticalFindings": 0,
    "networkLocation": "cloud",
}

ufw = run("ufw status 2>/dev/null | head -1")
if "active" in ufw.lower():
    security["firewallStatus"] = "active"
elif "inactive" in ufw.lower():
    security["firewallStatus"] = "inactive"

# Exposed ports
ports_raw = run("ss -tlnp | awk 'NR>1{split($4,a,\":\"); print a[length(a)]}'")
if ports_raw:
    ports = sorted(set(int(p) for p in ports_raw.split("\n") if p.strip().isdigit()))
    security["portsExposed"] = ports

# SSH password auth
sshd = read_file("/etc/ssh/sshd_config")
if "PasswordAuthentication yes" in sshd:
    security["sshPasswordDisabled"] = False
    security["sshKeyOnly"] = False

# fail2ban
f2b = run("systemctl is-active fail2ban 2>/dev/null")
security["fail2ban"] = f2b == "active"

# Patch level
last_update = run("stat -c '%Y' /var/lib/apt/periodic/update-success-stamp 2>/dev/null || stat -c '%Y' /var/cache/apt/pkgcache.bin 2>/dev/null")
if last_update:
    from datetime import datetime
    try:
        dt = datetime.fromtimestamp(int(last_update))
        security["lastOsUpdate"] = dt.strftime("%Y-%m-%d")
        days = (datetime.now() - dt).days
        security["patchLevel"] = "current" if days < 7 else ("recent" if days < 30 else "stale")
    except:
        pass

# --- Errors from journald ---
errors_1h = run("journalctl --since '1 hour ago' -u 'openclaw*' --no-pager 2>/dev/null | grep -ci 'error\\|exception\\|fatal' || echo 0")
errors_24h = run("journalctl --since '24 hours ago' -u 'openclaw*' --no-pager 2>/dev/null | grep -ci 'error\\|exception\\|fatal' || echo 0")
data["errors_1h"] = int(errors_1h) if errors_1h.isdigit() else 0
data["errors_24h"] = int(errors_24h) if errors_24h.isdigit() else 0

# --- Tailscale ---
ts_json = run("tailscale status --json 2>/dev/null")
if ts_json:
    try:
        ts = json.loads(ts_json)
        s = ts.get("Self", {})
        ips = s.get("TailscaleIPs", [])
        data["tailscale_ip"] = ips[0] if ips else None
        data["tailscale_status"] = "online" if s.get("Online") else "offline"
    except:
        pass

# --- Cron jobs ---
cron_jobs = []
cron_out = run("openclaw cron list --json 2>/dev/null || echo '[]'")
try:
    crons = json.loads(cron_out) if cron_out.startswith("[") else []
    for c in crons[:10]:
        sched = c.get("schedule", {})
        expr = sched.get("expr", "") or f"every {sched.get('everyMs',0)//60000}m"
        cron_jobs.append({
            "schedule": expr,
            "task": c.get("name", "unnamed"),
            "lastRun": c.get("state", {}).get("lastRunAtMs")
        })
except:
    pass

# --- Assemble update ---
if role: data["role"] = role
if owner: data["owner"] = owner
data["model"] = model
data["status"] = "online"
data["channels"] = channels
data["mcp_connections"] = mcp_connections
data["ssh_access"] = ssh_access
data["service_access"] = service_access
data["side_projects"] = side_projects
data["security"] = security
data["workspace_files"] = ws_files
data["cron_jobs"] = cron_jobs

print(json.dumps(data))
PYEOF
REMOTE_SCRIPT

  if [ -z "$REMOTE_DATA" ] || [ "$REMOTE_DATA" = "" ]; then
    echo "[$AGENT_ID] No data returned"
    return
  fi

  # Add timestamps
  PAYLOAD=$(echo "$REMOTE_DATA" | python3 -c "
import json, sys
data = json.load(sys.stdin)
data['last_heartbeat'] = '$NOW'
data['last_seen'] = '$NOW'
data['updated_at'] = '$NOW'
print(json.dumps(data))
" 2>/dev/null)

  if [ -z "$PAYLOAD" ]; then
    echo "[$AGENT_ID] Failed to build payload"
    return
  fi

  # PATCH to Supabase
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    "$SUPABASE_URL/rest/v1/agents?id=eq.$AGENT_ID" \
    -d "$PAYLOAD" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "[$AGENT_ID] OK"
  else
    echo "[$AGENT_ID] Supabase returned HTTP $HTTP_CODE"
    echo "[$AGENT_ID] Payload: $(echo "$PAYLOAD" | head -c 200)"
  fi
}

echo "=== Fleet Collector - $NOW ==="

for agent_spec in "${AGENTS[@]}"; do
  collect_agent "$agent_spec" &
done

wait
echo "=== Done ==="
