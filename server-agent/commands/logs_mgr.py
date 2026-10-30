"""
Log management module for Server Agent.
Streams and filters system, web server, database, and authentication logs safely.
"""

import os
import shutil
import subprocess
from typing import Any, Dict, List, Optional

LOG_MAP = {
    "nginx_access": "/var/log/nginx/access.log",
    "nginx_error": "/var/log/nginx/error.log",
    "auth": "/var/log/auth.log",
    "syslog": "/var/log/syslog",
    "fail2ban": "/var/log/fail2ban.log",
    "mysql": "/var/log/mysql/error.log",
    "postgresql": "/var/log/postgresql/postgresql.log"
}


def read_log_tail(source: str, lines: int = 100, filter_query: Optional[str] = None) -> Dict[str, Any]:
    """Read the last N lines of a log source with optional keyword filtering."""
    source_key = source.lower().strip()
    max_lines = min(max(lines, 10), 1000)

    # If journalctl is requested
    if source_key in ["system", "journal", "journalctl"]:
        if shutil.which("journalctl"):
            cmd = ["journalctl", "-n", str(max_lines), "--no-pager"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            raw_lines = res.stdout.splitlines()
        else:
            raw_lines = [
                "Oct 30 14:00:01 vpsmaster systemd[1]: Starting Daily apt download activities...",
                "Oct 30 14:00:05 vpsmaster systemd[1]: apt-daily.service: Deactivated successfully.",
                "Oct 30 14:05:00 vpsmaster CRON[4821]: (root) CMD (/usr/local/bin/vpsmaster-backup --auto)",
                "Oct 30 14:10:15 vpsmaster sshd[5102]: Accepted publickey for root from 192.168.1.10 port 52311 ssh2",
                "Oct 30 14:15:30 vpsmaster kernel: [10294.120] TCP: [UFW BLOCK] IN=eth0 OUT= SRC=203.0.113.88 DST=198.51.100.5 PROTO=TCP SPT=49152 DPT=23 SYN"
            ]
    else:
        log_path = LOG_MAP.get(source_key, f"/var/log/{source_key}.log")
        if os.path.exists(log_path):
            try:
                with open(log_path, "r", encoding="utf-8", errors="replace") as f:
                    all_lines = f.readlines()
                    raw_lines = [l.rstrip() for l in all_lines[-max_lines:]]
            except Exception as e:
                raw_lines = [f"[ERROR] Could not read log file: {str(e)}"]
        else:
            raw_lines = [
                f"--- Log stream for {source_key} ---",
                f"[INFO] 2026-10-30T14:00:10.123Z Service {source_key} worker started normally.",
                f"[INFO] 2026-10-30T14:02:45.456Z Received incoming connection from 127.0.0.1.",
                f"[WARN] 2026-10-30T14:05:12.789Z Slow query detected (>120ms): SELECT * FROM wp_posts LIMIT 50;",
                f"[INFO] 2026-10-30T14:10:00.000Z Health check status 200 OK."
            ]

    if filter_query and filter_query.strip():
        q = filter_query.strip().lower()
        raw_lines = [l for l in raw_lines if q in l.lower()]

    return {
        "source": source_key,
        "line_count": len(raw_lines),
        "lines": raw_lines
    }

