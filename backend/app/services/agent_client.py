"""
HTTP Client for communicating with the Server Agent.
Implements secure mutual authentication, timeout controls, and structured error handling.
"""

from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException

from app.core.config import settings


class AgentClient:
    """Async client communicating with the local or remote Server Agent daemon."""

    def __init__(self, base_url: str = settings.AGENT_URL, secret: str = settings.AGENT_SECRET):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "X-Agent-Secret": secret,
            "User-Agent": "VPSMaster-ControlPanel/1.0"
        }

    async def _request(self, method: str, endpoint: str, **kwargs) -> Any:
        url = f"{self.base_url}{endpoint}"
        async with httpx.AsyncClient(timeout=kwargs.pop("timeout", 30.0)) as client:
            try:
                response = await client.request(method, url, headers=self.headers, **kwargs)
                if response.status_code >= 400:
                    detail = response.json().get("detail", response.text) if "application/json" in response.headers.get("content-type", "") else response.text
                    raise HTTPException(status_code=response.status_code, detail=f"Agent Error: {detail}")
                return response.json()
            except httpx.ConnectError:
                raise HTTPException(
                    status_code=503,
                    detail="Server Agent is unreachable. Ensure 'vpsmaster-agent' service is active."
                )
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=504,
                    detail="Server Agent operation timed out."
                )

    # System
    async def get_system_metrics(self) -> Dict[str, Any]:
        return await self._request("GET", "/system/metrics")

    async def set_hostname(self, hostname: str) -> Dict[str, Any]:
        return await self._request("POST", "/system/hostname", json={"hostname": hostname})

    async def get_timezone(self) -> Dict[str, Any]:
        return await self._request("GET", "/system/timezone")

    async def set_timezone(self, timezone: str) -> Dict[str, Any]:
        return await self._request("POST", "/system/timezone", json={"timezone": timezone})

    async def get_interfaces(self) -> List[Dict[str, Any]]:
        return await self._request("GET", "/system/interfaces")

    async def check_updates(self) -> Dict[str, Any]:
        return await self._request("GET", "/system/updates")

    async def run_updates(self) -> Dict[str, Any]:
        return await self._request("POST", "/system/updates/run", timeout=300.0)

    async def reboot(self) -> Dict[str, Any]:
        return await self._request("POST", "/system/reboot")

    async def shutdown(self) -> Dict[str, Any]:
        return await self._request("POST", "/system/shutdown")

    # Services
    async def list_services(self) -> List[Dict[str, Any]]:
        return await self._request("GET", "/services")

    async def service_action(self, service: str, action: str) -> Dict[str, Any]:
        return await self._request("POST", f"/services/{service}/action", json={"action": action})

    async def get_service_logs(self, service: str, lines: int = 100) -> Dict[str, Any]:
        return await self._request("GET", f"/services/{service}/logs", params={"lines": lines})

    # Websites
    async def create_website(self, domain: str, php_version: str = "8.3", aliases: Optional[List[str]] = None, force_https: bool = False) -> Dict[str, Any]:
        return await self._request("POST", "/websites/create", json={
            "domain": domain, "php_version": php_version, "aliases": aliases, "force_https": force_https
        })

    async def delete_website(self, domain: str, delete_files: bool = False) -> Dict[str, Any]:
        return await self._request("POST", "/websites/delete", json={"domain": domain, "delete_files": delete_files})

    async def suspend_website(self, domain: str, suspend: bool) -> Dict[str, Any]:
        return await self._request("POST", "/websites/suspend", json={"domain": domain, "suspend": suspend})

    async def get_website_logs(self, domain: str, log_type: str = "access", lines: int = 100) -> Dict[str, Any]:
        return await self._request("GET", f"/websites/{domain}/logs", params={"log_type": log_type, "lines": lines})

    # SSL
    async def issue_ssl(self, domain: str, email: str) -> Dict[str, Any]:
        return await self._request("POST", "/ssl/issue", json={"domain": domain, "email": email}, timeout=120.0)

    async def renew_ssl(self) -> Dict[str, Any]:
        return await self._request("POST", "/ssl/renew", timeout=180.0)

    async def get_ssl_status(self, domain: str) -> Dict[str, Any]:
        return await self._request("GET", f"/ssl/{domain}/status")

    # Files
    async def list_files(self, path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/list", json={"path": path, "base_dir": base_dir})

    async def read_file(self, path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/read", json={"path": path, "base_dir": base_dir})

    async def write_file(self, path: str, content: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/write", json={"path": path, "content": content, "base_dir": base_dir})

    async def create_file_item(self, path: str, is_dir: bool = False, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/create", json={"path": path, "is_dir": is_dir, "base_dir": base_dir})

    async def rename_file_item(self, old_path: str, new_path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/rename", json={"old_path": old_path, "new_path": new_path, "base_dir": base_dir})

    async def copy_file_item(self, source_path: str, destination_path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/copy", json={"source_path": source_path, "destination_path": destination_path, "base_dir": base_dir})

    async def delete_file_item(self, path: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/delete", json={"path": path, "base_dir": base_dir})

    async def chmod_file(self, path: str, mode: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/chmod", json={"path": path, "mode": mode, "base_dir": base_dir})

    async def compress_files(self, sources: List[str], destination_zip: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/compress", json={"sources": sources, "destination_zip": destination_zip, "base_dir": base_dir})

    async def extract_files(self, zip_path: str, destination_dir: str, base_dir: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/files/extract", json={"zip_path": zip_path, "destination_dir": destination_dir, "base_dir": base_dir})

    # Databases
    async def create_database(self, engine: str, name: str) -> Dict[str, Any]:
        return await self._request("POST", "/databases/create", json={"engine": engine, "name": name})

    async def drop_database(self, engine: str, name: str) -> Dict[str, Any]:
        return await self._request("POST", "/databases/drop", json={"engine": engine, "name": name})

    async def create_db_user(self, engine: str, username: str, password: str, host: str = "localhost") -> Dict[str, Any]:
        return await self._request("POST", "/databases/users/create", json={"engine": engine, "username": username, "password": password, "host": host})

    async def grant_db_privileges(self, engine: str, database: str, username: str, host: str = "localhost") -> Dict[str, Any]:
        return await self._request("POST", "/databases/privileges/grant", json={"engine": engine, "database": database, "username": username, "host": host})

    async def backup_database(self, engine: str, name: str) -> Dict[str, Any]:
        return await self._request("POST", "/databases/backup", json={"engine": engine, "name": name}, timeout=120.0)

    # PHP
    async def get_php_versions(self) -> List[Dict[str, Any]]:
        return await self._request("GET", "/php/versions")

    async def get_php_extensions(self, version: str) -> List[Dict[str, Any]]:
        return await self._request("GET", f"/php/{version}/extensions")

    async def get_php_settings(self, version: str) -> Dict[str, Any]:
        return await self._request("GET", f"/php/{version}/settings")

    async def update_php_settings(self, version: str, settings_map: Dict[str, str]) -> Dict[str, Any]:
        return await self._request("POST", f"/php/{version}/settings", json={"settings": settings_map})

    # Docker
    async def get_containers(self) -> List[Dict[str, Any]]:
        return await self._request("GET", "/docker/containers")

    async def container_action(self, container_id: str, action: str) -> Dict[str, Any]:
        return await self._request("POST", f"/docker/containers/{container_id}/action", json={"action": action})

    async def get_container_logs(self, container_id: str, tail: int = 100) -> Dict[str, Any]:
        return await self._request("GET", f"/docker/containers/{container_id}/logs", params={"tail": tail})

    async def get_docker_images(self) -> List[Dict[str, Any]]:
        return await self._request("GET", "/docker/images")

    # Firewall & Security
    async def get_ufw_status(self) -> Dict[str, Any]:
        return await self._request("GET", "/firewall/ufw/status")

    async def add_ufw_rule(self, port: int, protocol: str = "tcp", action: str = "allow", source_ip: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("POST", "/firewall/ufw/rules", json={"port": port, "protocol": protocol, "action": action, "source_ip": source_ip})

    async def delete_ufw_rule(self, rule_num: int) -> Dict[str, Any]:
        return await self._request("DELETE", f"/firewall/ufw/rules/{rule_num}")

    async def toggle_ufw(self, enable: bool) -> Dict[str, Any]:
        return await self._request("POST", "/firewall/ufw/toggle", json={"enable": enable})

    async def get_fail2ban_status(self) -> Dict[str, Any]:
        return await self._request("GET", "/firewall/fail2ban/status")

    async def unban_ip(self, jail: str, ip: str) -> Dict[str, Any]:
        return await self._request("POST", "/firewall/fail2ban/unban", json={"jail": jail, "ip": ip})

    async def get_ssh_config(self) -> Dict[str, Any]:
        return await self._request("GET", "/firewall/ssh/config")

    async def get_security_audit(self) -> Dict[str, Any]:
        return await self._request("GET", "/firewall/audit")

    # Cron
    async def get_cron_jobs(self) -> List[Dict[str, Any]]:
        return await self._request("GET", "/cron/jobs")

    async def save_cron_jobs(self, jobs: List[Dict[str, str]]) -> Dict[str, Any]:
        return await self._request("POST", "/cron/jobs", json={"jobs": jobs})

    # Backups
    async def backup_website(self, domain: str) -> Dict[str, Any]:
        return await self._request("POST", "/backups/website", json={"domain": domain}, timeout=300.0)

    async def restore_backup(self, archive_path: str, target_dir: str) -> Dict[str, Any]:
        return await self._request("POST", "/backups/restore", json={"archive_path": archive_path, "target_dir": target_dir}, timeout=300.0)

    # Logs
    async def tail_logs(self, source: str = "journal", lines: int = 100, filter_query: Optional[str] = None) -> Dict[str, Any]:
        return await self._request("GET", "/logs/tail", params={"source": source, "lines": lines, "filter_query": filter_query})

    # Terminal
    async def execute_terminal(self, session_id: str, command: str) -> Dict[str, Any]:
        return await self._request("POST", "/terminal/execute", json={"session_id": session_id, "command": command})

    # Email
    async def get_mailboxes(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        return await self._request("GET", "/email/mailboxes", params={"domain": domain} if domain else None)

    async def create_mailbox(self, email: str, password: str, quota_mb: int = 1024) -> Dict[str, Any]:
        return await self._request("POST", "/email/mailboxes", json={"email": email, "password": password, "quota_mb": quota_mb})

    async def delete_mailbox(self, email: str) -> Dict[str, Any]:
        return await self._request("DELETE", "/email/mailboxes", json={"email": email})

    async def get_email_dns(self, domain: str, server_ip: str) -> Dict[str, Any]:
        return await self._request("GET", "/email/dns-records", params={"domain": domain, "server_ip": server_ip})


agent_client = AgentClient()

