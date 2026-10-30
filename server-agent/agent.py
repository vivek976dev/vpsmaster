"""
VPSMaster Server Agent.
Dedicated, secure local daemon running on Ubuntu Linux servers.
Executes predefined, validated administrative operations with least privilege.
Protects system from command injection and unvalidated input.
"""

import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from security.token_auth import verify_agent_token
from commands import (
    system,
    services,
    websites,
    nginx,
    certbot,
    files,
    databases,
    php,
    docker_mgr,
    firewall,
    cron_mgr,
    backups,
    logs_mgr,
    terminal_pty,
    email_mgr
)

app = FastAPI(
    title="VPSMaster Server Agent",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None
)

# Apply CORS for local control panel communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "vpsmaster-agent"}


# ================= SYSTEM ENDPOINTS =================

@app.get("/system/metrics", dependencies=[Depends(verify_agent_token)])
def get_metrics():
    return system.get_system_metrics()


class HostnameRequest(BaseModel):
    hostname: str = Field(..., min_length=1, max_length=63)

@app.post("/system/hostname", dependencies=[Depends(verify_agent_token)])
def set_hostname(req: HostnameRequest):
    return system.set_hostname(req.hostname)


@app.get("/system/timezone", dependencies=[Depends(verify_agent_token)])
def get_timezone():
    return system.get_timezone_info()


class TimezoneRequest(BaseModel):
    timezone: str

@app.post("/system/timezone", dependencies=[Depends(verify_agent_token)])
def set_timezone(req: TimezoneRequest):
    return system.set_timezone(req.timezone)


@app.get("/system/interfaces", dependencies=[Depends(verify_agent_token)])
def get_network():
    return system.get_network_interfaces()


@app.get("/system/updates", dependencies=[Depends(verify_agent_token)])
def check_updates():
    return system.check_system_updates()


@app.post("/system/updates/run", dependencies=[Depends(verify_agent_token)])
def perform_updates():
    return system.perform_system_update()


@app.post("/system/reboot", dependencies=[Depends(verify_agent_token)])
def reboot():
    return system.reboot_server()


@app.post("/system/shutdown", dependencies=[Depends(verify_agent_token)])
def shutdown():
    return system.shutdown_server()


# ================= SERVICE ENDPOINTS =================

@app.get("/services", dependencies=[Depends(verify_agent_token)])
def list_services():
    return services.list_managed_services()


class ServiceActionRequest(BaseModel):
    action: str = Field(..., pattern="^(status|start|stop|restart|reload|enable|disable)$")

@app.post("/services/{service}/action", dependencies=[Depends(verify_agent_token)])
def service_action(service: str, req: ServiceActionRequest):
    try:
        return services.execute_service_action(service, req.action)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/services/{service}/logs", dependencies=[Depends(verify_agent_token)])
def service_logs(service: str, lines: int = 100):
    try:
        return {"service": service, "logs": services.get_service_logs(service, lines)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================= WEBSITE ENDPOINTS =================

class CreateWebsiteRequest(BaseModel):
    domain: str
    php_version: str = "8.3"
    aliases: Optional[List[str]] = None
    force_https: bool = False

@app.post("/websites/create", dependencies=[Depends(verify_agent_token)])
def create_website(req: CreateWebsiteRequest):
    try:
        return websites.create_website_env(
            domain=req.domain,
            php_version=req.php_version,
            aliases=req.aliases,
            force_https=req.force_https
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class DeleteWebsiteRequest(BaseModel):
    domain: str
    delete_files: bool = False

@app.post("/websites/delete", dependencies=[Depends(verify_agent_token)])
def delete_website(req: DeleteWebsiteRequest):
    try:
        return websites.delete_website_env(req.domain, req.delete_files)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class SuspendWebsiteRequest(BaseModel):
    domain: str
    suspend: bool

@app.post("/websites/suspend", dependencies=[Depends(verify_agent_token)])
def suspend_website(req: SuspendWebsiteRequest):
    try:
        return websites.set_website_state(req.domain, req.suspend)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/websites/{domain}/logs", dependencies=[Depends(verify_agent_token)])
def get_website_logs(domain: str, log_type: str = "access", lines: int = 100):
    try:
        return {"domain": domain, "logs": websites.get_website_logs(domain, log_type, lines)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================= SSL ENDPOINTS =================

class IssueCertRequest(BaseModel):
    domain: str
    email: str

@app.post("/ssl/issue", dependencies=[Depends(verify_agent_token)])
def issue_ssl(req: IssueCertRequest):
    try:
        return certbot.issue_certificate(req.domain, req.email)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/ssl/renew", dependencies=[Depends(verify_agent_token)])
def renew_ssl():
    return certbot.renew_certificates()


@app.get("/ssl/{domain}/status", dependencies=[Depends(verify_agent_token)])
def ssl_status(domain: str):
    return certbot.get_certificate_status(domain)


# ================= FILE MANAGER ENDPOINTS =================

class FilePathRequest(BaseModel):
    path: str
    base_dir: Optional[str] = None

class FileWriteRequest(BaseModel):
    path: str
    content: str
    base_dir: Optional[str] = None

class FileCreateRequest(BaseModel):
    path: str
    is_dir: bool = False
    base_dir: Optional[str] = None

class FileRenameRequest(BaseModel):
    old_path: str
    new_path: str
    base_dir: Optional[str] = None

class FileCopyRequest(BaseModel):
    source_path: str
    destination_path: str
    base_dir: Optional[str] = None

class FileChmodRequest(BaseModel):
    path: str
    mode: str = Field(..., pattern="^[0-7]{3,4}$")
    base_dir: Optional[str] = None

class FileCompressRequest(BaseModel):
    sources: List[str]
    destination_zip: str
    base_dir: Optional[str] = None

class FileExtractRequest(BaseModel):
    zip_path: str
    destination_dir: str
    base_dir: Optional[str] = None

@app.post("/files/list", dependencies=[Depends(verify_agent_token)])
def list_files(req: FilePathRequest):
    try:
        return files.list_directory(req.path, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/files/read", dependencies=[Depends(verify_agent_token)])
def read_file(req: FilePathRequest):
    try:
        return files.read_file_content(req.path, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/files/write", dependencies=[Depends(verify_agent_token)])
def write_file(req: FileWriteRequest):
    try:
        return files.write_file_content(req.path, req.content, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/files/create", dependencies=[Depends(verify_agent_token)])
def create_file_item(req: FileCreateRequest):
    try:
        return files.create_item(req.path, req.is_dir, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/files/rename", dependencies=[Depends(verify_agent_token)])
def rename_file_item(req: FileRenameRequest):
    try:
        return files.rename_item(req.old_path, req.new_path, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/files/copy", dependencies=[Depends(verify_agent_token)])
def copy_file_item(req: FileCopyRequest):
    try:
        return files.copy_item(req.source_path, req.destination_path, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/files/delete", dependencies=[Depends(verify_agent_token)])
def delete_file_item(req: FilePathRequest):
    try:
        return files.delete_item(req.path, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/files/chmod", dependencies=[Depends(verify_agent_token)])
def chmod_file_item(req: FileChmodRequest):
    try:
        return files.set_permissions(req.path, req.mode, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/files/compress", dependencies=[Depends(verify_agent_token)])
def compress_files(req: FileCompressRequest):
    try:
        return files.compress_to_zip(req.sources, req.destination_zip, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/files/extract", dependencies=[Depends(verify_agent_token)])
def extract_files(req: FileExtractRequest):
    try:
        return files.extract_zip(req.zip_path, req.destination_dir, req.base_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================= DATABASE ENDPOINTS =================

class CreateDbRequest(BaseModel):
    engine: str = "mysql"
    name: str

class CreateDbUserRequest(BaseModel):
    engine: str = "mysql"
    username: str
    password: str
    host: str = "localhost"

class GrantPrivilegesRequest(BaseModel):
    engine: str = "mysql"
    database: str
    username: str
    host: str = "localhost"

@app.post("/databases/create", dependencies=[Depends(verify_agent_token)])
def db_create(req: CreateDbRequest):
    try:
        return databases.create_database(req.engine, req.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/databases/drop", dependencies=[Depends(verify_agent_token)])
def db_drop(req: CreateDbRequest):
    try:
        return databases.drop_database(req.engine, req.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/databases/users/create", dependencies=[Depends(verify_agent_token)])
def db_create_user(req: CreateDbUserRequest):
    try:
        return databases.create_db_user(req.engine, req.username, req.password, req.host)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/databases/privileges/grant", dependencies=[Depends(verify_agent_token)])
def db_grant_privileges(req: GrantPrivilegesRequest):
    try:
        return databases.grant_db_privileges(req.engine, req.database, req.username, req.host)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/databases/backup", dependencies=[Depends(verify_agent_token)])
def db_backup(req: CreateDbRequest):
    try:
        return databases.backup_database(req.engine, req.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================= PHP ENDPOINTS =================

@app.get("/php/versions", dependencies=[Depends(verify_agent_token)])
def get_php_versions():
    return php.get_installed_php_versions()


@app.get("/php/{version}/extensions", dependencies=[Depends(verify_agent_token)])
def get_php_exts(version: str):
    return php.get_php_extensions(version)


@app.get("/php/{version}/settings", dependencies=[Depends(verify_agent_token)])
def get_php_settings(version: str):
    return php.get_php_ini_settings(version)


class UpdatePhpSettingsRequest(BaseModel):
    settings: Dict[str, str]

@app.post("/php/{version}/settings", dependencies=[Depends(verify_agent_token)])
def update_php_settings(version: str, req: UpdatePhpSettingsRequest):
    return php.update_php_ini_settings(version, req.settings)


# ================= DOCKER ENDPOINTS =================

@app.get("/docker/containers", dependencies=[Depends(verify_agent_token)])
def get_containers():
    return docker_mgr.list_containers()


class DockerActionRequest(BaseModel):
    action: str = Field(..., pattern="^(start|stop|restart|rm)$")

@app.post("/docker/containers/{container_id}/action", dependencies=[Depends(verify_agent_token)])
def container_action(container_id: str, req: DockerActionRequest):
    try:
        return docker_mgr.execute_container_action(container_id, req.action)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/docker/containers/{container_id}/logs", dependencies=[Depends(verify_agent_token)])
def container_logs(container_id: str, tail: int = 100):
    return {"container_id": container_id, "logs": docker_mgr.get_container_logs(container_id, tail)}


@app.get("/docker/images", dependencies=[Depends(verify_agent_token)])
def get_docker_images():
    return docker_mgr.list_images()


# ================= FIREWALL & SECURITY ENDPOINTS =================

@app.get("/firewall/ufw/status", dependencies=[Depends(verify_agent_token)])
def ufw_status():
    return firewall.get_ufw_status()


class AddUfwRuleRequest(BaseModel):
    port: int
    protocol: str = "tcp"
    action: str = "allow"
    source_ip: Optional[str] = None

@app.post("/firewall/ufw/rules", dependencies=[Depends(verify_agent_token)])
def add_firewall_rule(req: AddUfwRuleRequest):
    try:
        return firewall.add_ufw_rule(req.port, req.protocol, req.action, req.source_ip)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/firewall/ufw/rules/{rule_num}", dependencies=[Depends(verify_agent_token)])
def delete_firewall_rule(rule_num: int):
    return firewall.delete_ufw_rule(rule_num)


class ToggleUfwRequest(BaseModel):
    enable: bool

@app.post("/firewall/ufw/toggle", dependencies=[Depends(verify_agent_token)])
def toggle_firewall(req: ToggleUfwRequest):
    return firewall.toggle_ufw(req.enable)


@app.get("/firewall/fail2ban/status", dependencies=[Depends(verify_agent_token)])
def fail2ban_status():
    return firewall.get_fail2ban_status()


class UnbanIpRequest(BaseModel):
    jail: str
    ip: str

@app.post("/firewall/fail2ban/unban", dependencies=[Depends(verify_agent_token)])
def fail2ban_unban(req: UnbanIpRequest):
    return firewall.unban_ip(req.jail, req.ip)


@app.get("/firewall/ssh/config", dependencies=[Depends(verify_agent_token)])
def ssh_config():
    return firewall.get_ssh_config()


@app.get("/firewall/audit", dependencies=[Depends(verify_agent_token)])
def run_audit():
    return firewall.run_security_audit()


# ================= CRON ENDPOINTS =================

@app.get("/cron/jobs", dependencies=[Depends(verify_agent_token)])
def get_cron_jobs():
    return cron_mgr.list_cron_jobs()


class SaveCronJobsRequest(BaseModel):
    jobs: List[Dict[str, str]]

@app.post("/cron/jobs", dependencies=[Depends(verify_agent_token)])
def save_cron(req: SaveCronJobsRequest):
    return cron_mgr.save_cron_jobs(req.jobs)


# ================= BACKUP ENDPOINTS =================

class BackupWebsiteRequest(BaseModel):
    domain: str

@app.post("/backups/website", dependencies=[Depends(verify_agent_token)])
def backup_site(req: BackupWebsiteRequest):
    try:
        return backups.create_website_backup(req.domain)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class RestoreBackupRequest(BaseModel):
    archive_path: str
    target_dir: str

@app.post("/backups/restore", dependencies=[Depends(verify_agent_token)])
def restore_site(req: RestoreBackupRequest):
    try:
        return backups.restore_backup(req.archive_path, req.target_dir)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ================= LOGS ENDPOINTS =================

@app.get("/logs/tail", dependencies=[Depends(verify_agent_token)])
def tail_logs(source: str = "journal", lines: int = 100, filter_query: Optional[str] = None):
    return logs_mgr.read_log_tail(source, lines, filter_query)


# ================= TERMINAL ENDPOINTS =================

class TerminalExecRequest(BaseModel):
    session_id: str
    command: str

@app.post("/terminal/execute", dependencies=[Depends(verify_agent_token)])
def execute_terminal_cmd(req: TerminalExecRequest):
    session = terminal_pty.get_or_create_session(req.session_id)
    return session.execute_command(req.command)


# ================= EMAIL SERVER ENDPOINTS =================

@app.get("/email/mailboxes", dependencies=[Depends(verify_agent_token)])
def get_mailboxes(domain: Optional[str] = None):
    return email_mgr.list_mailboxes(domain)


class CreateMailboxRequest(BaseModel):
    email: str
    password: str
    quota_mb: int = 1024

@app.post("/email/mailboxes", dependencies=[Depends(verify_agent_token)])
def add_mailbox(req: CreateMailboxRequest):
    try:
        return email_mgr.create_mailbox(req.email, req.password, req.quota_mb)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class DeleteMailboxRequest(BaseModel):
    email: str

@app.delete("/email/mailboxes", dependencies=[Depends(verify_agent_token)])
def remove_mailbox(req: DeleteMailboxRequest):
    return email_mgr.delete_mailbox(req.email)


@app.get("/email/dns-records", dependencies=[Depends(verify_agent_token)])
def get_email_dns(domain: str, server_ip: str = "198.51.100.1"):
    try:
        return email_mgr.generate_email_dns_records(domain, server_ip)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent:app", host="127.0.0.1", port=8001, reload=False)
