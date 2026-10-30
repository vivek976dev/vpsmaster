"""
Security validator for Server Agent.
Ensures strict validation of all input parameters to prevent path traversal,
command injection, arbitrary execution, and unauthorized modifications.
"""

import os
import re
from pathlib import Path
from typing import List, Optional

# Whitelist of allowed system services that can be managed
ALLOWED_SERVICES = {
    "nginx",
    "apache2",
    "httpd",
    "mysql",
    "mariadb",
    "postgresql",
    "redis",
    "redis-server",
    "php7.4-fpm",
    "php8.0-fpm",
    "php8.1-fpm",
    "php8.2-fpm",
    "php8.3-fpm",
    "php8.4-fpm",
    "docker",
    "ssh",
    "sshd",
    "fail2ban",
    "ufw",
    "cron",
    "postfix",
    "dovecot"
}

# Whitelist of allowed service actions
ALLOWED_SERVICE_ACTIONS = {
    "status",
    "start",
    "stop",
    "restart",
    "reload",
    "enable",
    "disable"
}

# Regex patterns
DOMAIN_REGEX = re.compile(r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$")
USERNAME_REGEX = re.compile(r"^[a-z_][a-z0-9_-]{0,31}$")
DATABASE_NAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{1,64}$")
PORT_REGEX = re.compile(r"^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$")
IPV4_REGEX = re.compile(r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$")
TIMEZONE_REGEX = re.compile(r"^[a-zA-Z0-9_+\-]+(/[a-zA-Z0-9_+\-]+)+$|^UTC$")

# Allowed root directories for file operations
ALLOWED_FILE_ROOTS = [
    "/var/www",
    "/etc/nginx/sites-available",
    "/etc/nginx/sites-enabled",
    "/var/log",
    "/tmp/vpsmaster",
    "./storage"  # Local fallback for dev/testing
]


def validate_service_name(service: str) -> str:
    """Validate that the requested service is in the allowed whitelist."""
    normalized = service.lower().strip()
    if normalized not in ALLOWED_SERVICES:
        raise ValueError(f"Service '{service}' is not in the allowed management whitelist.")
    return normalized


def validate_service_action(action: str) -> str:
    """Validate service action."""
    normalized = action.lower().strip()
    if normalized not in ALLOWED_SERVICE_ACTIONS:
        raise ValueError(f"Action '{action}' is not permitted for service management.")
    return normalized


def validate_domain(domain: str) -> str:
    """Validate domain name format."""
    normalized = domain.lower().strip()
    if not DOMAIN_REGEX.match(normalized):
        raise ValueError(f"Invalid domain name format: '{domain}'")
    return normalized


def validate_database_name(name: str) -> str:
    """Validate database or database user name."""
    clean = name.strip()
    if not DATABASE_NAME_REGEX.match(clean):
        raise ValueError(f"Invalid database/user identifier: '{name}'. Only alphanumeric and underscore allowed.")
    return clean


def validate_port(port: int | str) -> int:
    """Validate port number (1-65535)."""
    p = int(port)
    if not (1 <= p <= 65535):
        raise ValueError(f"Port {p} is out of valid range (1-65535)")
    return p


def validate_safe_path(target_path: str, base_dir: Optional[str] = None) -> str:
    """
    Ensure the path is strictly within an authorized directory.
    Prevents path traversal attacks (e.g. ../../etc/shadow).
    """
    clean_target = os.path.abspath(target_path)

    if base_dir:
        clean_base = os.path.abspath(base_dir)
        try:
            # Common path check
            common = os.path.commonpath([clean_target, clean_base])
            if common != clean_base:
                raise ValueError(f"Access denied: Path '{target_path}' escapes base directory '{base_dir}'.")
        except ValueError:
            raise ValueError(f"Access denied: Path traversal detected for '{target_path}'.")
        return clean_target

    # If no specific base_dir given, check against global allowed roots
    is_allowed = False
    for root in ALLOWED_FILE_ROOTS:
        clean_root = os.path.abspath(root)
        try:
            if os.path.commonpath([clean_target, clean_root]) == clean_root:
                is_allowed = True
                break
        except ValueError:
            continue

    if not is_allowed and not clean_target.startswith(os.path.abspath(".")):
        raise ValueError(f"Access denied: Target path '{target_path}' is outside authorized directories.")

    return clean_target

