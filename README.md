# VPSMaster: Enterprise Ubuntu VPS Management Control Panel

<div align="center">

```
 __      ______   _____ __  __           _            
 \ \    / /  _ \ / ____|  \/  |         | |           
  \ \  / /| |_) | (___ | \  / | __ _ ___| |_ ___ _ __ 
   \ \/ / |  __/ \___ \| |\/| |/ _` / __| __/ _ \ '__|
    \  /  | |    ____) | |  | | (_| \__ \ ||  __/ |   
     \/   |_|   |_____/|_|  |_|\__,_|___/\__\___|_|   
```

**Next-Generation Linux Server Management Platform for Ubuntu 22.04 / 24.04 / 26.04 LTS**  
*A modern, secure, and blazing-fast alternative to cPanel, Plesk, CyberPanel, and CloudPanel.*

[![Ubuntu](https://img.shields.io/badge/Ubuntu-22.04%20%7C%2024.04%20%7C%2026.04-orange.svg?logo=ubuntu)](https://ubuntu.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.12%2B-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript%20%2B%20Tailwind-61DAFB.svg?logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 🌟 Executive Overview

**VPSMaster** is an enterprise-grade VPS management control panel engineered specifically for Ubuntu Linux. Built upon a decoupled **Server Agent** and **Core API** architecture, it provides a comprehensive suite of server administration tools without ever executing arbitrary shell strings from user input.

Whether hosting dozens of PHP/Node.js/Python websites, provisioning isolated MySQL/PostgreSQL databases, managing Let's Encrypt SSL certificates, or orchestrating Docker containers, VPSMaster offers a cloud-native experience wrapped in a modern, responsive UI.

---

## 🏗️ Architecture

VPSMaster enforces a strict separation of concerns to maximize security and future multi-server scalability:

```
+---------------------------------------------------------------------------------+
|                                USER BROWSER                                     |
|               (React 18 + TypeScript + Tailwind CSS + Recharts)                 |
+---------------------------------------+-----------------------------------------+
                                        | HTTPS / WSS
                                        v
+---------------------------------------+-----------------------------------------+
|                         NGINX REVERSE PROXY (:8443)                             |
|          SSL Termination | Static Asset Delivery | WebSocket Upgrades           |
+-------------------+-----------------------------------+-------------------------+
                    |                                   |
         HTTP Proxy | (:8000)                HTTP Proxy | (:8000)
                    v                                   v
+-------------------+-----------------------------------+-------------------------+
|                               FASTAPI BACKEND                                   |
|   - Authentication (Native bcrypt, JWT, RFC 6238 TOTP 2FA)                      |
|   - Multi-Tier RBAC (Super Admin, Administrator, Reseller, Website Owner)        |
|   - SQLite / PostgreSQL Database with SQLAlchemy ORM                            |
|   - Centralized Audit Logging & Security Alerts Engine                          |
|   - Background Health & Backup Scheduler Worker                                 |
+---------------------------------------+-----------------------------------------+
                                        | Internal HTTP + Token Auth
                                        | Header: X-Agent-Secret
                                        v
+---------------------------------------+-----------------------------------------+
|                           SERVER MANAGEMENT AGENT                               |
|                     (FastAPI Daemon on 127.0.0.1:8001)                          |
|   Strict Input Validation -> Predefined Safe System Calls (subprocess exec)     |
|   +-------------------+-------------------+-------------------+                 |
|   | Systemd Units     | Nginx Vhosts      | Let's Encrypt     |                 |
|   | MySQL / Postgres  | PHP-FPM Pools     | Sandboxed Files   |                 |
|   | Docker Daemon     | UFW Firewall      | Fail2Ban Jails    |                 |
|   | Tar.gz Backups    | Crontab Manager   | Mailboxes/DKIM    |                 |
|   +-------------------+-------------------+-------------------+                 |
+---------------------------------------------------------------------------------+
```

---

## 🚀 Key Modules & Capabilities

### 1. Main Dashboard & Real-Time Telemetry
- **Live WebSocket Telemetry**: Streaming CPU, RAM, Disk I/O, Network Tx/Rx, and System Load.
- **Hardware & OS Insights**: Hostname, Public IP, Kernel, OS Version, and Uptime.
- **Top Processes**: Real-time process explorer sorted by CPU/Memory utilization.

### 2. Website & Domain Management
- **Multi-Tenant Hosting**: Isolated web roots (`/var/www/<domain>/public_html`) with proper `www-data` ownership.
- **Nginx & Apache Configurations**: Automated virtualhost templating with instant `nginx -t` validation and graceful reload.
- **Multi-PHP Switching**: Assign PHP 7.4, 8.0, 8.1, 8.2, 8.3, or 8.4 per website.
- **DNS Zone Management**: Integrated zone editor supporting A, AAAA, CNAME, MX, TXT, NS, and CAA records with BIND export.

### 3. Automated SSL / TLS (Let's Encrypt)
- **One-Click ACME Issuance**: Automated HTTP-01 challenge issuance via Certbot.
- **Auto-Renewal & Monitoring**: Background daemon monitors expiry and triggers renewal before expiration.
- **Force HTTPS**: Seamless 301 redirection at the Nginx edge.
- **Custom Certificate Upload**: Support for third-party wildcard and EV certificates.

### 4. Sandboxed Web File Manager
- **Zero Path Traversal**: Enforces strict canonical path resolution under authorized web roots (`/var/www`).
- **File Operations**: Browse, create, upload, download, rename, duplicate, and delete files/folders.
- **Archive Utilities**: ZIP and TAR.GZ compression and extraction.
- **In-Browser Code Editor**: Edit configuration files, PHP scripts, and HTML with syntax highlighting.
- **Permissions**: Manage `chmod` permissions (e.g., 0755, 0644) and ownership.

### 5. Relational Database Management
- **Engines**: MySQL, MariaDB, and PostgreSQL.
- **Database & User Provisioning**: Create isolated databases and users with granular grants.
- **Instant Backups**: Trigger instant `mysqldump` and `pg_dump` backups.
- **Connection Helper**: Auto-generates application `.env` / `wp-config.php` database connection strings.

### 6. Docker Container Orchestration
- **Container Lifecycle**: Inspect, start, stop, restart, and remove containers.
- **Live Output**: Real-time stdout/stderr console logs.
- **Image Repository**: View local images, tags, virtual size, and creation history.

### 7. Email Server Management
- **Virtual Mailboxes**: Postfix & Dovecot virtual mail account provisioning.
- **Quotas**: Storage quota enforcement per mailbox.
- **Email Deliverability Guide**: Built-in helper for SPF, DKIM (RSA-2048), DMARC policies, and MX records.

### 8. Advanced Security & Hardening
- **UFW Firewall**: Graphical rule builder (port, protocol, action, source IP).
- **Fail2Ban Intrusion Prevention**: Monitor active jails (`sshd`, `nginx-http-auth`) and unban offending IPs.
- **SSH Hardening**: Review port settings, password authentication, and disable root login.
- **Security Audit Scanner**: CIS-inspired system hardening benchmark scoring out of 100.
- **Audit Logging**: Immutable audit trail of every administrative mutation.

### 9. Disaster Recovery & Backups
- **Backup Types**: Full server snapshot, website files, or database dumps.
- **Integrity**: Every backup archive is verified with SHA-256 checksums.
- **Storage Drivers**: Local filesystem, Amazon S3, and remote SFTP destinations.
- **One-Click Restore**: Restore archives directly into target directories with overwrite safeguards.

### 10. Web-Based Terminal
- **Interactive Shell**: Browser-based command line interface for Super Administrators.
- **Shortcuts & History**: Command history navigation via Up/Down keys, buffer copy, and quick diagnostic shortcuts.
- **Auditing**: All interactive terminal commands are recorded in the security audit logs.

### 11. Advanced Enterprise & Special Features
- **Multi-Server Fleet Management**: Supervise multiple Ubuntu VPS nodes (Main Hosting, Database Server, Backup Server, Dev Server) from a single control panel.
- **One-Click Website Deployments**: Instant provisioning for WordPress, Laravel, Node.js, Python/Django, and Static HTML sites.
- **AI Server Assistant**: Read-only, advisory diagnostics that interpret server error traces, diagnose 502/OOM/Database crashes, and suggest optimizations without risky unauthorized modifications.
- **One-Click Application Installer**: Install phpMyAdmin, Roundcube Webmail, Portainer, and Redis Commander in one click.
- **Server Health Score**: Dynamic 0-100 real-time composite health engine evaluating CPU, RAM, Disk, daemon status, and unread security alerts.

---

## 🗺️ Tiered Edition Roadmap

VPSMaster is architected modularly to scale across three tiers:

| Tier | Target User | Features Included |
| :--- | :--- | :--- |
| **VPSMaster Basic** | Single VPS / Hobbyist | System info, basic services (Nginx, PHP), simple file manager, firewall toggle, single website hosting. |
| **VPSMaster Pro** *(Current)* | Freelancers / Agencies | Multi-website hosting, MySQL/Postgres databases, Multi-PHP switching, Let's Encrypt SSL, Docker containers, Postfix/Dovecot email, automated backups, cron jobs, and web terminal. |
| **VPSMaster Enterprise** | Cloud Providers / Teams | Multi-server node orchestration, AI Server Assistant, Reseller role isolation, automated S3 storage pruning, and advanced CIS security audits. |

---

## ⚡ Quick Start: Automated Installation

Install VPSMaster on a fresh Ubuntu 22.04, 24.04, or 26.04 server in one command:

```bash
curl -fsSL https://raw.githubusercontent.com/vivek976dev/vpsmaster/main/installer/install.sh -o install.sh
sudo bash install.sh
```

### Initial Credentials
- **Access URL**: `https://<YOUR-SERVER-IP>:8443`
- **Username**: `admin`
- **Password**: `Admin@123456` *(Change immediately upon first login)*

---

## 🚀 GitHub & Terminal Deployment Guide

For step-by-step instructions on deploying VPSMaster to GitHub and pulling it onto an Ubuntu VPS via the Linux Terminal, read:
👉 **[Complete Deployment Guide (GitHub to VPS)](DEPLOYMENT_GUIDE.md)** / **[`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)**

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Vite |
| **Backend API** | Python 3.12+, FastAPI, SQLAlchemy ORM, Pydantic v2, Native Bcrypt, PyOTP (RFC 6238) |
| **Server Agent** | Python 3.12+, FastAPI, psutil, systemd, subprocess, certbot, UFW |
| **Database** | SQLite (Default lightweight) or PostgreSQL 16+ |
| **Web Server** | Nginx (Reverse proxy + Virtualhost web server) |
| **Container Engine**| Docker & Docker Compose |

---

## 🧪 Automated Testing

VPSMaster includes a comprehensive unit and integration test suite:

```bash
# Run unit & API integration tests
python -m unittest tests/test_unit.py

# Verify frontend production build
cd frontend && npm run build
```

---

## 📖 Documentation Directory

- [GitHub & Server Terminal Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Complete Installation Guide](docs/INSTALLATION_GUIDE.md)
- [REST API & WebSocket Documentation](docs/API_DOCUMENTATION.md)
- [Security Model & Threat Prevention](docs/SECURITY_MODEL.md)

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

