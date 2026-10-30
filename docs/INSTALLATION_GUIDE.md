# VPSMaster: Production Installation & Administration Guide

## 1. System Requirements

### Supported Operating Systems
- **Ubuntu 24.04 LTS (Noble Numbat)** — *Recommended*
- **Ubuntu 22.04 LTS (Jammy Jellyfish)**
- **Ubuntu 26.04 LTS (where available)**

### Hardware Specifications
- **CPU**: Minimum 1 vCPU (2+ vCPU recommended for multi-tenant production).
- **RAM**: Minimum 1 GB RAM (2 GB+ recommended when running MySQL + PHP-FPM pools).
- **Disk**: 10 GB SSD available storage.
- **Network**: Static public IPv4 address with reverse DNS (PTR) for email deliverability.

---

## 2. Automated One-Command Installation

Log into your target Ubuntu server via SSH as `root`:

```bash
# Download and execute the official installer
curl -fsSL https://raw.githubusercontent.com/vpsmaster/vpsmaster/main/installer/install.sh -o install.sh
chmod +x install.sh
sudo bash install.sh
```

The script will automatically:
1. Verify OS compatibility and root privileges.
2. Update Ubuntu repositories and install essential system tools (`nginx`, `certbot`, `ufw`, `fail2ban`, `python3-venv`, etc.).
3. Configure the dedicated `vpsmaster` system user.
4. Set up an isolated Python virtual environment and install backend dependencies.
5. Generate cryptographically strong JWT and Agent authentication keys.
6. Initialize the relational database and seed the default Super Administrator.
7. Install, register, and start systemd service daemons (`vpsmaster-agent.service`, `vpsmaster-backend.service`).
8. Generate initial self-signed SSL certificates and configure Nginx reverse proxy on port `8443`.
9. Open necessary firewall ports in UFW (22, 80, 443, 8443).
10. Output your initial administrative credentials.

---

## 3. Initial Administrative Login

1. Open your web browser and navigate to:
   ```
   https://<YOUR-SERVER-IP>:8443
   ```
2. **Self-Signed SSL Notice**: Because an initial certificate was created with your IP address, your browser will display an "Untrusted Certificate" warning. Click **Advanced -> Proceed to site** to continue.
3. Sign in using the initial credentials:
   - **Username**: `admin`
   - **Password**: `Admin@123456`
4. **Mandatory Security Step**: Immediately navigate to **Users & Roles** or **Profile** and change the Super Administrator password to a strong passphrase.
5. (Optional but strongly recommended) Enable **Two-Factor Authentication (TOTP)** using Google Authenticator, 1Password, or Authy.

---

## 4. Manual Installation (Step-by-Step)

If you prefer installing manually without running the automated script:

### Step 1: Install System Packages
```bash
sudo apt update && sudo apt install -y \
    curl git nginx certbot python3-certbot-nginx \
    python3 python3-pip python3-venv ufw fail2ban
```

### Step 2: Clone Repository
```bash
sudo mkdir -p /opt/vpsmaster
sudo git clone https://github.com/vpsmaster/vpsmaster.git /opt/vpsmaster
cd /opt/vpsmaster
```

### Step 3: Setup Virtual Environment
```bash
sudo python3 -m venv /opt/vpsmaster/venv
sudo /opt/vpsmaster/venv/bin/pip install --upgrade pip
sudo /opt/vpsmaster/venv/bin/pip install -r /opt/vpsmaster/backend/requirements.txt
```

### Step 4: Build Frontend Assets
```bash
cd /opt/vpsmaster/frontend
sudo apt install -y nodejs npm
sudo npm install
sudo npm run build
```

### Step 5: Configure Environment Secrets
```bash
sudo mkdir -p /etc/vpsmaster
sudo cp /opt/vpsmaster/backend/.env.example /etc/vpsmaster/vpsmaster.env
sudo chmod 600 /etc/vpsmaster/vpsmaster.env
```

### Step 6: Install Services
```bash
sudo cp /opt/vpsmaster/deployment/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vpsmaster-agent vpsmaster-backend
```

### Step 7: Configure Nginx Virtual Host
```bash
sudo cp /opt/vpsmaster/deployment/nginx/vpsmaster.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/vpsmaster.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. Service Lifecycle Management

Check service status or inspect logs via `systemctl` and `journalctl`:

```bash
# Check status of core daemons
sudo systemctl status vpsmaster-agent
sudo systemctl status vpsmaster-backend

# Restart services
sudo systemctl restart vpsmaster-agent
sudo systemctl restart vpsmaster-backend

# View live daemon journal logs
sudo journalctl -u vpsmaster-backend -f
sudo journalctl -u vpsmaster-agent -f
```

---

## 6. Upgrading VPSMaster

To upgrade your panel installation to the latest version:

```bash
sudo bash /opt/vpsmaster/installer/upgrade.sh
```

---

## 7. Troubleshooting Common Issues

### Cannot access port 8443
- Verify UFW firewall rules:
  ```bash
  sudo ufw status verbose
  sudo ufw allow 8443/tcp
  ```
- If hosted on AWS EC2, Google Cloud Platform, or DigitalOcean, ensure the cloud provider's **Security Group** permits inbound TCP traffic on port `8443`.

### Port 80 / 443 already in use by Apache
- If an existing Apache instance is bound to port 80/443:
  ```bash
  sudo systemctl stop apache2
  sudo systemctl disable apache2
  sudo systemctl restart nginx
  ```

