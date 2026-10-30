# VPSMaster: Security Architecture & Threat Model

## 1. Core Threat Modeling & Mitigations

Control panels operate at the most sensitive layer of server infrastructure. VPSMaster's security model addresses the top server management vulnerabilities:

| Attack Vector | Traditional Risk | VPSMaster Mitigation |
| :--- | :--- | :--- |
| **Command Injection** | Passing unsanitized user inputs to `system()`, `exec()`, or `shell=True` | **Zero shell string execution**. All commands pass through strongly typed arrays via `subprocess.run(["binary", "arg1", "arg2"], shell=False)` after strict regex validation. |
| **Directory Traversal** | Accessing `/etc/shadow` or sensitive keys via `../../` paths | **Canonical Path Resolution**. Resolves paths via `Path.resolve()` and verifies `resolved.is_relative_to(base_dir)`. Symlinks escaping the root are rejected. |
| **Privilege Escalation** | Panel backend compromised as root | **Decoupled Agent Architecture**. The Web API and Database run with non-root or scoped privileges. Communication with the host agent is strictly token-authenticated. |
| **Credential Stuffing & Brute Force** | Automated dictionary attacks against admin login | Native **Bcrypt hashing**, **RFC 6238 TOTP 2FA**, and integration with **Fail2Ban** to ban offensive source IPs after 5 failed attempts. |
| **CSRF / Session Hijacking** | Cross-site attacks on logged-in administrators | Stateless **JWT access tokens** with short lifespans (15-60 min), SameSite cookies / Bearer headers, and IP-binding audit trail. |
| **Malicious File Uploads** | Uploading `.php` shells into arbitrary directories | Strict destination path validation and web server rules blocking execution outside document roots. |

---

## 2. Input Validation Specification (`server-agent/security/validator.py`)

All input received from external clients or the backend API passes through the `ServerValidator` before reaching system execution:

1. **Domain Names**:
   ```regex
   ^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}$
   ```
   Rejects malicious characters, semicolons, shell pipes, and whitespace.

2. **Database Identifiers (Databases & Users)**:
   ```regex
   ^[a-zA-Z0-9_]{1,64}$
   ```
   Prevents SQL injection in DDL statements (`CREATE DATABASE`, `GRANT ALL`).

3. **Port Numbers**:
   Strict numeric boundary: `1 <= port <= 65535`.

4. **Service Names**:
   Must match an explicit compile-time whitelist: `{"nginx", "apache2", "mysql", "mariadb", "postgresql", "redis", "php-fpm", "docker", "ssh"}`.

5. **Safe Paths**:
   ```python
   def validate_safe_path(requested_path: str, base_directory: str = "/var/www") -> Path:
       base = Path(base_directory).resolve()
       target = (base / requested_path.lstrip("/")).resolve()
       if not target.is_relative_to(base):
           raise ValueError("Path traversal attempt detected")
       return target
   ```

---

## 3. Cryptographic Standards

- **Password Hashing**: Direct native `bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))`.
  - Immune to the Passlib 72-byte truncation bug.
- **Tokens**: `python-jose` generating HS256 signed JSON Web Tokens with `exp`, `iat`, `sub`, and role claims.
- **Two-Factor Authentication**: RFC 6238 Time-Based One-Time Password (TOTP) algorithm using 160-bit base32 secret keys.
- **Agent Inter-Process Auth**: Constant-time comparison `secrets.compare_digest(provided_secret, config_secret)` preventing timing side-channel attacks.
- **Backup Verification**: SHA-256 integrity checksums calculated during archive creation and verified prior to extraction.

---

## 4. Audit Logging & Non-Repudiation

Every state-changing administrative action is logged to the `audit_logs` table with:
- **Timestamp**: UTC ISO-8601 timestamp.
- **User ID & Username**: The authenticated identity.
- **Action**: Event identifier (e.g. `website.create`, `firewall.rule_add`, `terminal.exec`).
- **Target Resource**: The entity affected.
- **Source IP & User Agent**: Client network provenance.
- **Status**: Success or failure indicator.

Audit logs cannot be modified or cleared by ordinary users or resellers.

