#!/usr/bin/env python3
"""Fleet Collector - collects real metrics from all agent servers and updates Supabase."""

import json
import subprocess
import sys
import os
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request

SUPABASE_URL = "https://kfyxrcgsqlbdtcezncms.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmeXhyY2dzcWxiZHRjZXpuY21zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc4MDM1MywiZXhwIjoyMDkyMzU2MzUzfQ.-KIkw4gHD-GlADrKYVqmcoSnE3pmfJ1WG68vZXwPonk"
SSH_KEY = "/root/.ssh/id_ed25519"

AGENTS = [
    {"id": "nathan-06",     "ip": "178.104.157.99",  "user": "openclaw", "ws": "/home/openclaw/.openclaw/workspaces/nathan"},
    {"id": "katelyn-09",    "ip": "178.104.157.99",  "user": "openclaw", "ws": "/home/openclaw/.openclaw/workspaces/chloe"},
    {"id": "gideon-05",     "ip": "46.224.57.251",   "user": "openclaw", "ws": "/home/openclaw/.openclaw/workspaces/gideon"},
    {"id": "henry-04",      "ip": "204.168.193.91",  "user": "root",     "ws": "/home/openclaw/.openclaw/workspaces/henry"},
    {"id": "chloe-36g-03",  "ip": "204.168.131.248", "user": "openclaw", "ws": "/home/openclaw/.openclaw/workspaces/chloe"},
    {"id": "sloane-08",     "ip": "77.42.81.193",    "user": "openclaw", "ws": "/home/openclaw/.openclaw/workspaces/sloane"},
    {"id": "sam-02",        "ip": "62.238.0.214",    "user": "root",     "ws": "/home/openclaw/.openclaw/workspaces/sam"},
    {"id": "marko-07",      "ip": "178.104.178.227", "user": "root",     "ws": "/home/openclaw/.openclaw/workspaces/marko"},
]

def ssh_run(ip, user, cmd, timeout=15):
    """Run a command via SSH."""
    full = ["ssh", "-i", SSH_KEY, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=8",
            "-o", "BatchMode=yes", f"{user}@{ip}", cmd]
    try:
        r = subprocess.run(full, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except:
        return ""

def ssh_read_file(ip, user, path):
    """Read a file via SSH."""
    return ssh_run(ip, user, f"cat '{path}' 2>/dev/null")

def update_supabase(agent_id, data):
    """PATCH agent record in Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/agents?id=eq.{agent_id}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status
    except Exception as e:
        return str(e)

def parse_role_from_files(soul, identity):
    """Extract role from SOUL.md or IDENTITY.md."""
    import re
    for line in identity.split("\n"):
        if "**Role" in line:
            return re.sub(r'\*\*|^-\s*', '', line.split(":", 1)[-1]).strip()
    for line in soul.split("\n"):
        m = re.match(r'\*\*You are (.+?)[\.\*]', line)
        if m:
            return m.group(1).strip()
    return ""

def parse_owner_from_user(user_md):
    """Extract owner from USER.md."""
    import re
    for line in user_md.split("\n"):
        if "**Name" in line:
            return re.sub(r'\*\*|^-\s*', '', line.split(":", 1)[-1]).strip()
    return ""

def parse_ssh_access(tools_md):
    """Extract SSH access from TOOLS.md."""
    import re
    results = []
    in_ssh = False
    for line in tools_md.split("\n"):
        if re.search(r"SSH.*[Aa]ccess|ssh_access", line) and (line.startswith("#") or line.startswith("|") or "###" in line):
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
                    results.append({"host": name, "ip": ip, "user": "root"})
    return results

def parse_service_access(tools_md):
    """Extract service access from TOOLS.md."""
    results = []
    seen = set()
    services = ["GitHub", "Gmail", "Google", "Hetzner", "Cloudflare", "Atlassian",
                 "Figma", "Anthropic", "OpenAI", "xAI", "Supabase"]
    for line in tools_md.split("\n"):
        for svc in services:
            if svc.lower() in line.lower() and any(w in line.lower() for w in ["token", "oauth", "key", "pat", "credential"]):
                method = "API key"
                if "oauth" in line.lower(): method = "OAuth"
                elif "pat" in line.lower(): method = "PAT"
                if svc not in seen:
                    results.append({"service": svc, "method": method})
                    seen.add(svc)
    return results

def parse_side_projects(memory_md):
    """Extract side projects from MEMORY.md."""
    import re
    projects = []
    in_proj = False
    for line in memory_md.split("\n"):
        if re.match(r'^##\s+(Active\s+)?Projects', line):
            in_proj = True
            continue
        if in_proj and re.match(r'^##\s', line) and "project" not in line.lower():
            in_proj = False
        if in_proj and line.startswith("###"):
            name = line.replace("#", "").strip()
            if name:
                projects.append(name)
    return projects

def parse_config(config_str):
    """Parse openclaw.json for model, channels, MCP."""
    model = "unknown"
    channels = []
    mcp = []
    try:
        cfg = json.loads(config_str)
        ad = cfg.get("agents", {}).get("defaults", {})
        m = ad.get("model", {})
        if isinstance(m, str):
            model = m
        elif isinstance(m, dict):
            model = m.get("primary", "unknown")
        
        for ch_type, ch_cfg in cfg.get("channels", {}).items():
            if isinstance(ch_cfg, dict) and ch_cfg.get("enabled", True):
                channels.append({"type": ch_type, "handle": ""})
        
        for name, mcfg in cfg.get("mcpServers", {}).items():
            mcp.append({"name": name, "type": mcfg.get("transport", "stdio"), "status": "connected"})
    except:
        pass
    return model, channels, mcp

def collect_agent(agent):
    """Collect all data for one agent."""
    aid = agent["id"]
    ip = agent["ip"]
    user = agent["user"]
    ws = agent["ws"]
    now = datetime.now(timezone.utc).isoformat()
    
    print(f"[{aid}] Collecting from {user}@{ip} ...")
    
    # Quick connectivity check
    test = ssh_run(ip, user, "echo ok")
    if test != "ok":
        print(f"[{aid}] SSH failed - marking offline")
        update_supabase(aid, {"status": "offline", "last_seen": now, "updated_at": now})
        return
    
    data = {"status": "online", "last_heartbeat": now, "last_seen": now, "updated_at": now}
    
    # --- System metrics ---
    cpu = ssh_run(ip, user, "top -bn1 | grep '%Cpu' | awk '{print int($2 + $4)}'")
    data["host_cpu"] = int(cpu) if cpu.isdigit() else 0
    
    ram = ssh_run(ip, user, "free | awk '/Mem:/{printf \"%.0f\", $3/$2*100}'")
    data["host_ram"] = int(ram) if ram.isdigit() else 0
    
    disk = ssh_run(ip, user, "df / | awk 'NR==2{print int($5)}'")
    data["host_disk"] = int(disk) if disk.isdigit() else 0
    
    uptime = ssh_run(ip, user, "uptime -p")
    data["uptime"] = uptime.replace("up ", "") if uptime else "unknown"
    
    net = ssh_run(ip, user, "ping -c1 -W2 1.1.1.1 >/dev/null 2>&1 && echo healthy || echo degraded")
    data["host_network"] = net if net in ("healthy", "degraded") else "healthy"
    
    # --- OpenClaw version ---
    ver = ssh_run(ip, user, "openclaw --version 2>/dev/null | head -1")
    if ver:
        data["agent_version"] = ver
        data["system_version"] = ver
    
    # --- Workspace size ---
    ws_size = ssh_run(ip, user, f"du -sh '{ws}' 2>/dev/null | awk '{{print $1}}'")
    if ws_size:
        data["workspace_size"] = ws_size
    
    # --- Workspace files ---
    files_check = ssh_run(ip, user, f"for f in SOUL.md AGENTS.md USER.md TOOLS.md MEMORY.md HEARTBEAT.md; do [ -f '{ws}/$f' ] && echo $f; done")
    ws_files = {}
    for name, key in [("SOUL.md","soul"),("AGENTS.md","agents"),("USER.md","user"),
                       ("TOOLS.md","tools"),("MEMORY.md","memory"),("HEARTBEAT.md","heartbeat")]:
        ws_files[key] = name in (files_check or "")
    data["workspace_files"] = ws_files
    
    # --- Read workspace files ---
    soul = ssh_read_file(ip, user, f"{ws}/SOUL.md")
    identity = ssh_read_file(ip, user, f"{ws}/IDENTITY.md")
    user_md = ssh_read_file(ip, user, f"{ws}/USER.md")
    tools_md = ssh_read_file(ip, user, f"{ws}/TOOLS.md")
    memory_md = ssh_read_file(ip, user, f"{ws}/MEMORY.md")
    
    # Role & owner
    role = parse_role_from_files(soul, identity)
    if role:
        data["role"] = role
    
    owner = parse_owner_from_user(user_md)
    if owner:
        data["owner"] = owner
    
    # SSH & service access
    ssh_access = parse_ssh_access(tools_md)
    if ssh_access:
        data["ssh_access"] = ssh_access
    
    service_access = parse_service_access(tools_md)
    if service_access:
        data["service_access"] = service_access
    
    # Side projects
    side_projects = parse_side_projects(memory_md)
    data["side_projects"] = side_projects
    
    # --- OpenClaw config ---
    oc_config = ssh_read_file(ip, user, f"{ws}/.openclaw/openclaw.json")
    if not oc_config:
        oc_config = ssh_read_file(ip, user, f"{os.path.dirname(ws)}/../openclaw.json")
    
    model, channels, mcp = parse_config(oc_config)
    data["model"] = model
    if channels:
        data["channels"] = channels
    if mcp:
        data["mcp_connections"] = mcp
    
    # --- Security ---
    security = {
        "patchLevel": "unknown", "lastOsUpdate": "unknown", "firewallStatus": "unknown",
        "portsExposed": [], "sshPasswordDisabled": True, "sshKeyOnly": True,
        "fail2ban": False, "diskEncryption": False, "mfaEnabled": False,
        "auditLogEnabled": False, "auditRetentionDays": 0,
        "lastVulnScan": None, "criticalFindings": 0, "networkLocation": "cloud",
    }
    
    ufw = ssh_run(ip, user, "ufw status 2>/dev/null | head -1")
    if "active" in (ufw or "").lower():
        security["firewallStatus"] = "active"
    elif "inactive" in (ufw or "").lower():
        security["firewallStatus"] = "inactive"
    
    ports = ssh_run(ip, user, "ss -tlnp 2>/dev/null | awk 'NR>1{split($4,a,\":\"); print a[length(a)]}' | sort -un | tr '\\n' ',' | sed 's/,$//'")
    if ports:
        try:
            security["portsExposed"] = [int(p) for p in ports.split(",") if p.strip().isdigit()]
        except:
            pass
    
    sshd_pw = ssh_run(ip, user, "grep '^PasswordAuthentication' /etc/ssh/sshd_config 2>/dev/null")
    if "yes" in (sshd_pw or "").lower():
        security["sshPasswordDisabled"] = False
        security["sshKeyOnly"] = False
    
    f2b = ssh_run(ip, user, "systemctl is-active fail2ban 2>/dev/null")
    security["fail2ban"] = f2b == "active"
    
    # Last OS update
    last_apt = ssh_run(ip, user, "stat -c '%Y' /var/lib/apt/periodic/update-success-stamp 2>/dev/null || stat -c '%Y' /var/cache/apt/pkgcache.bin 2>/dev/null")
    if last_apt and last_apt.isdigit():
        from datetime import datetime as dt
        try:
            update_dt = dt.fromtimestamp(int(last_apt))
            security["lastOsUpdate"] = update_dt.strftime("%Y-%m-%d")
            days = (dt.now() - update_dt).days
            security["patchLevel"] = "current" if days < 7 else ("recent" if days < 30 else "stale")
        except:
            pass
    
    data["security"] = security
    
    # --- Errors ---
    errors_1h = ssh_run(ip, user, "journalctl --since '1 hour ago' -u 'openclaw*' --no-pager 2>/dev/null | grep -ci 'error\\|exception\\|fatal' || echo 0")
    errors_24h = ssh_run(ip, user, "journalctl --since '24 hours ago' -u 'openclaw*' --no-pager 2>/dev/null | grep -ci 'error\\|exception\\|fatal' || echo 0")
    data["errors_1h"] = int(errors_1h) if (errors_1h or "0").isdigit() else 0
    data["errors_24h"] = int(errors_24h) if (errors_24h or "0").isdigit() else 0
    
    # --- Tailscale ---
    ts_ip = ssh_run(ip, user, "tailscale ip -4 2>/dev/null")
    if ts_ip:
        data["tailscale_ip"] = ts_ip
        ts_status = ssh_run(ip, user, "tailscale status --self 2>/dev/null | awk '{print $5}'")
        data["tailscale_status"] = "online" if ts_status else "offline"
    
    # --- Update Supabase ---
    result = update_supabase(aid, data)
    print(f"[{aid}] Done (Supabase: {result})")

def main():
    print(f"=== Fleet Collector - {datetime.now(timezone.utc).isoformat()} ===")
    
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(collect_agent, a): a["id"] for a in AGENTS}
        for f in as_completed(futures):
            try:
                f.result()
            except Exception as e:
                print(f"[{futures[f]}] Error: {e}")
    
    print("=== Done ===")

if __name__ == "__main__":
    main()
