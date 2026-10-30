# VPSMaster: REST API & WebSocket Specification

All REST API endpoints are prefixed with `/api/v1`.

## 1. Authentication & Security Headers

All protected endpoints require an HTTP `Authorization` header containing a valid JSON Web Token:

```http
Authorization: Bearer <jwt_access_token>
```

### Response Error Format
```json
{
  "detail": "Descriptive human-readable error message"
}
```

---

## 2. API Endpoints Catalog

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate user (username/password, optional TOTP) | Public |
| `POST` | `/auth/refresh` | Exchange refresh token for new access token | Public |
| `GET` | `/auth/me` | Fetch currently authenticated user profile | All |
| `POST` | `/auth/2fa/setup` | Generate TOTP secret and QR code PNG data URI | All |
| `POST` | `/auth/2fa/enable` | Verify 6-digit TOTP code and enable 2FA | All |
| `POST` | `/auth/2fa/disable` | Disable TOTP 2FA on account | All |

#### Sample Login Request:
```json
{
  "username_or_email": "admin",
  "password": "Admin@123456",
  "totp_code": "123456"
}
```

---

### Dashboard & Real-Time Telemetry (`/api/v1/dashboard`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/overview` | Aggregated system metrics, resource counts, health score | All |
| `WS` | `/ws/metrics` | Bidirectional real-time telemetry streaming socket | All |

#### Sample Telemetry Payload:
```json
{
  "hostname": "vpsmaster-host",
  "uptime_seconds": 128450,
  "load_average": [0.42, 0.35, 0.28],
  "cpu": { "percent": 14.5, "cores": 4 },
  "memory": { "total_bytes": 8589934592, "used_bytes": 2147483648, "percent": 25.0 },
  "disk": { "total_bytes": 53687091200, "used_bytes": 10737418240, "percent": 20.0 },
  "network": { "bytes_sent": 104857600, "bytes_recv": 524288000 },
  "timestamp": 1730312400
}
```

---

### Server Management (`/api/v1/server`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/server/info` | Hardware specifications, OS info, kernel version | Admin |
| `POST` | `/server/hostname` | Set host server system hostname | Admin |
| `GET` | `/server/timezone` | Get active server timezone | Admin |
| `POST` | `/server/timezone` | Configure system timezone (timedatectl) | Admin |
| `GET` | `/server/interfaces` | Network interfaces and IP assignments | Admin |
| `GET` | `/server/updates` | Query upgradable APT packages | Admin |
| `POST` | `/server/updates/run` | Execute non-interactive apt-get upgrade | Admin |
| `POST` | `/server/reboot` | Safely reboot server host | Super Admin |
| `POST` | `/server/shutdown` | Safely power off server host | Super Admin |

---

### Service Daemon Management (`/api/v1/services`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/services` | List managed systemd services and statuses | Admin |
| `POST` | `/services/{service}/action` | Trigger `start`, `stop`, `restart`, `reload`, `enable`, `disable` | Admin |
| `GET` | `/services/{service}/logs` | Tail last N lines from `journalctl` for target unit | Admin |

Supported services: `nginx`, `apache2`, `mysql`, `mariadb`, `postgresql`, `redis`, `php-fpm`, `docker`, `ssh`.

---

### Website Management (`/api/v1/websites`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/websites` | List hosted websites (scoped by owner) | All |
| `POST` | `/websites` | Provision new website, document root, vhost | All |
| `GET` | `/websites/{id}` | Inspect website configuration | Owner/Admin |
| `PUT` | `/websites/{id}` | Update PHP version, aliases, force HTTPS | Owner/Admin |
| `POST` | `/websites/{id}/suspend` | Suspend or activate website vhost | Admin |
| `DELETE` | `/websites/{id}` | Remove website and optionally purge web root files | Owner/Admin |
| `GET` | `/websites/{id}/logs` | Tail access or error logs for website | Owner/Admin |

---

### DNS Zone Management (`/api/v1/dns`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/dns/domains` | List domains and zone records | All |
| `POST` | `/dns/domains` | Register new domain zone | All |
| `GET` | `/dns/domains/{id}` | Inspect domain and all child DNS records | All |
| `POST` | `/dns/domains/{id}/records` | Add DNS record (A, AAAA, CNAME, MX, TXT, NS, CAA) | All |
| `DELETE` | `/dns/records/{id}` | Delete specific DNS record | All |

---

### SSL & Certificates (`/api/v1/ssl`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/ssl/{domain}/status` | Check Let's Encrypt expiry and days remaining | All |
| `POST` | `/ssl/issue` | Request Let's Encrypt certificate via Certbot HTTP-01 | All |
| `POST` | `/ssl/renew` | Trigger certbot renewal scan for expiring certificates | Admin |
| `POST` | `/ssl/custom` | Install custom certificate and private key | Owner/Admin |

---

### Sandboxed File Manager (`/api/v1/files`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/files/list` | List directory contents with metadata | All (Scoped) |
| `POST` | `/files/read` | Read file content into string | All (Scoped) |
| `POST` | `/files/write` | Write text content to target file | All (Scoped) |
| `POST` | `/files/create` | Create new blank file or directory | All (Scoped) |
| `POST` | `/files/rename` | Rename or move file / directory | All (Scoped) |
| `POST` | `/files/delete` | Safely remove file or directory tree | All (Scoped) |
| `POST` | `/files/chmod` | Change file permissions mode (e.g. 0644, 0755) | All (Scoped) |
| `POST` | `/files/compress` | Compress file list into ZIP archive | All (Scoped) |
| `POST` | `/files/extract` | Extract ZIP archive into destination folder | All (Scoped) |

---

### Database Management (`/api/v1/databases`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/databases` | List relational databases and sizes | All |
| `POST` | `/databases` | Create MySQL / MariaDB / PostgreSQL database | All |
| `DELETE` | `/databases/{id}` | Drop database | All |
| `POST` | `/databases/users` | Create DB user and grant privileges | All |
| `POST` | `/databases/{id}/backup` | Generate instant `mysqldump` / `pg_dump` | All |

---

### Security, Firewall & Audit (`/api/v1/security`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/security/firewall/status` | UFW status and active port rules | Admin |
| `POST` | `/security/firewall/rules` | Add custom port/protocol rule | Admin |
| `DELETE` | `/security/firewall/rules/{id}` | Delete UFW rule by number | Admin |
| `POST` | `/security/firewall/toggle` | Enable or disable UFW firewall | Admin |
| `GET` | `/security/fail2ban` | Fail2Ban status and jail statistics | Admin |
| `POST` | `/security/fail2ban/unban` | Unban offending IP address | Admin |
| `GET` | `/security/ssh` | Inspect SSH daemon configuration | Admin |
| `GET` | `/security/audit` | Execute CIS security benchmark checklist | Admin |
| `GET` | `/security/audit-logs` | Retrieve immutable administrative audit log | Super Admin |
| `GET` | `/security/alerts` | Get active unread security alert notifications | All |
| `POST` | `/security/alerts/{id}/read` | Mark security alert as acknowledged | All |

---

### Interactive Terminal (`/api/v1/terminal`)

| Method | Endpoint | Description | Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/terminal/exec` | Execute shell command in audited root session | Super Admin |

