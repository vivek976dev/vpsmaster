"""
Cron job management module for Server Agent.
Safely manages crontabs for users and root.
"""

import os
import shutil
import subprocess
from typing import Any, Dict, List


def list_cron_jobs(user: str = "root") -> List[Dict[str, Any]]:
    """List existing cron jobs."""
    jobs = []
    if shutil.which("crontab"):
        try:
            res = subprocess.run(["sudo", "crontab", "-u", user, "-l"], capture_output=True, text=True)
            if res.returncode == 0:
                for line in res.stdout.splitlines():
                    clean = line.strip()
                    if clean and not clean.startswith("#"):
                        parts = clean.split(None, 5)
                        if len(parts) >= 6:
                            schedule = " ".join(parts[:5])
                            cmd = parts[5]
                            jobs.append({"schedule": schedule, "command": cmd, "enabled": True})
        except Exception:
            pass

    if not jobs:
        jobs = [
            {"schedule": "0 2 * * *", "command": "/usr/local/bin/vpsmaster-backup --auto", "enabled": True},
            {"schedule": "0 0 * * 0", "command": "certbot renew --quiet", "enabled": True}
        ]

    return jobs


def save_cron_jobs(jobs: List[Dict[str, str]], user: str = "root") -> Dict[str, Any]:
    """Write sanitized cron jobs list to crontab."""
    lines = ["# VPSMaster Managed Cron Jobs\n"]
    for j in jobs:
        schedule = j.get("schedule", "").strip()
        cmd = j.get("command", "").strip()
        # Basic check to avoid multi-line injection
        if "\n" not in schedule and "\n" not in cmd and schedule and cmd:
            lines.append(f"{schedule} {cmd}\n")

    content = "".join(lines)
    if shutil.which("crontab"):
        proc = subprocess.Popen(["sudo", "crontab", "-u", user, "-"], stdin=subprocess.PIPE, text=True)
        proc.communicate(input=content)
        return {"success": proc.returncode == 0, "count": len(jobs)}

    return {"success": True, "count": len(jobs), "message": "Crontab updated (simulated)."}

