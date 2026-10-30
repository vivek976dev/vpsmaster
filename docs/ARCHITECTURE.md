# VPSMaster: System Architecture Documentation

## 1. Architectural Philosophy

VPSMaster is designed with modern security, modularity, and operational resilience at its core. Traditional Linux control panels frequently introduce catastrophic security vulnerabilities by running a single monolithic process as root or passing unsanitized user inputs into `shell=True` commands.

VPSMaster eliminates these failure modes by enforcing:
1. **Decoupled Architecture**: Separation between the User-Facing Control Panel (`backend/`) and the Privileged Host Management Agent (`server-agent/`).
2. **Zero Arbitrary Command Injection**: The Server Agent accepts only strongly typed, strictly validated parameters over a token-authenticated internal socket.
3. **Least Privilege**: The web application and database layer do not possess direct root filesystem access. Privileged operations are delegated exclusively through predefined, audited agent routines.
4. **Future Multi-Node Scalability**: The decoupled design allows the Control Panel to control not just the local VPS, but an arbitrary fleet of remote Ubuntu nodes via secure Agent connections.

---

## 2. Component Diagram

```
+------------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                      |
|                                                                                    |
|               React 18 SPA (TypeScript + Tailwind CSS + Recharts)                 |
|               Single Page App / Real-time WebSockets / Responsive Mobile           |
+------------------------------------------+-----------------------------------------+
                                           | HTTPS :8443
                                           v
+------------------------------------------+-----------------------------------------+
|                                EDGE GATEWAY (NGINX)                                |
|                                                                                    |
|   - TLS 1.2 / 1.3 Termination & Security Headers                                   |
|   - Static Assets Caching & Single Page Application Routing                        |
|   - WebSocket Upgrade Handshake (/ws/metrics -> Backend)                           |
|   - API Proxy (/api/v1/* -> Backend :8000)                                         |
+------------------------------------------+-----------------------------------------+
                                           | HTTP Proxy (:8000)
                                           v
+------------------------------------------+-----------------------------------------+
|                              FASTAPI BACKEND API                                   |
|                                                                                    |
|   [Authentication & Identity]                                                      |
|     - Native Bcrypt Hashing (72-byte truncation protection)                        |
|     - JWT Access Tokens (HS256) & Long-Lived Refresh Tokens                        |
|     - RFC 6238 TOTP Two-Factor Authentication with QR Provisioning                 |
|                                                                                    |
|   [Access Control & RBAC]                                                          |
|     - Roles: super_admin, administrator, reseller, website_owner                   |
|     - Resource Scope Filters (Owner-level website/database isolation)              |
|                                                                                    |
|   [Data & Persistence Layer]                                                       |
|     - SQLAlchemy ORM (Synchronous Thread-Safe Session Engine)                      |
|     - Drivers: SQLite 3 (Default Embedded) or PostgreSQL 16+                        |
|     - Models: User, Website, Domain, DNSRecord, Database, Backup, Cron, Firewall   |
|                                                                                    |
|   [Workers & Background Scheduler]                                                 |
|     - Certificate Expiration Watcher                                               |
|     - Resource Usage Threshold Alerts                                              |
|     - Automated Daily Backup Runner                                                |
+------------------------------------------+-----------------------------------------+
                                           | Internal HTTP (127.0.0.1:8001)
                                           | Header: X-Agent-Secret
                                           v
+------------------------------------------+-----------------------------------------+
|                            SERVER MANAGEMENT AGENT                                 |
|                                                                                    |
|   [Security Gatekeeper: validator.py]                                              |
|     - Domain Name RFC Regex Validation                                             |
|     - Safe Canonical Path Resolution (Disallows Symlink Escapes & ../)              |
|     - Port Range Validation (1 - 65535)                                            |
|     - Service Name Whitelist                                                       |
|                                                                                    |
|   [Predefined Command Handlers (No Shell Injection)]                              |
|     - system.py: Hardware metrics, uptime, load averages, processes (psutil)      |
|     - services.py: systemd daemon supervisor (systemctl status/restart)            |
|     - nginx.py: Virtualhost Jinja2 templating, syntax validation (nginx -t)        |
|     - certbot.py: ACME Let's Encrypt automated certificate issuance                |
|     - files.py: Sandboxed file manager primitives (read/write/chmod/zip)           |
|     - databases.py: MySQL / MariaDB / PostgreSQL users & mysqldump/pg_dump         |
|     - docker_mgr.py: Docker daemon container lifecycle and log streams             |
|     - firewall.py: UFW rules engine & Fail2Ban jail unban                          |
|     - backups.py: tar.gz compression & SHA-256 integrity verification              |
|     - email_mgr.py: Postfix/Dovecot virtual accounts & DKIM/SPF generator          |
+------------------------------------------------------------------------------------+
```

---

## 3. Communication Protocols

### Client to Edge (Browser -> Nginx)
- **HTTPS (Port 8443)**: Standard REST API calls with Bearer Token Authorization header.
- **WSS (Port 8443 /ws/metrics)**: Persistent bidirectional WebSocket channel delivering real-time telemetry packets every 2 seconds.

### Backend to Agent (FastAPI -> Server Agent)
- **Loopback HTTP (127.0.0.1:8001)**: High-speed local requests using `httpx.AsyncClient`.
- **Authentication**: Constant-time token verification via `secrets.compare_digest(request.headers.get("X-Agent-Secret"), AGENT_SECRET)`.
- **Format**: JSON payloads strictly serialized and validated via Pydantic models.

---

## 4. Role-Based Access Control (RBAC) Hierarchy

| Privilege / Scope | Super Admin | Administrator | Reseller | Website Owner |
| :--- | :---: | :---: | :---: | :---: |
| **Server Operations (Reboot, Hostname, Updates)** | ✅ | ✅ | ❌ | ❌ |
| **System Services (Nginx, MySQL, PHP Restart)** | ✅ | ✅ | ❌ | ❌ |
| **Firewall & Security Hardening** | ✅ | ✅ | ❌ | ❌ |
| **Interactive Root Web Terminal** | ✅ | ❌ | ❌ | ❌ |
| **User & Role Management** | ✅ | ❌ | ❌ | ❌ |
| **Create Websites & Resell Accounts** | ✅ | ✅ | ✅ | ❌ |
| **File Manager (Own Websites)** | ✅ | ✅ | ✅ | ✅ |
| **Database Management (Own DBs)** | ✅ | ✅ | ✅ | ✅ |
| **SSL Issuance (Own Domains)** | ✅ | ✅ | ✅ | ✅ |
| **Cron Jobs (Own Tasks)** | ✅ | ✅ | ✅ | ✅ |

---

## 5. Storage & Persistence Layout

```
/opt/vpsmaster/              # Application Base Installation
├── backend/                 # FastAPI REST API & Background Workers
├── server-agent/            # Privileged Host Agent Daemon
├── frontend/dist/           # Compiled Production React SPA Assets
└── venv/                    # Dedicated Python Virtual Environment

/etc/vpsmaster/              # Secure Configuration & Data
├── vpsmaster.env            # Cryptographic secrets & DB credentials (chmod 600)
└── vpsmaster.db             # SQLite Embedded Relational Database (if not Postgres)

/var/www/                    # Multi-Tenant Website Hosting Roots
├── example.com/
│   ├── public_html/         # Document Root (owned by www-data:www-data)
│   ├── logs/                # Isolated access & error logs
│   └── ssl/                 # Domain-specific certificates

/var/backups/vpsmaster/      # Backup Archive Vault
├── backups/                 # .tar.gz archives with companion .sha256 files
```

