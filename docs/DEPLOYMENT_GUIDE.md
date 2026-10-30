# VPSMaster: Complete End-to-End Deployment Guide
### From Local Workstation to GitHub & From GitHub to an Ubuntu VPS Server OS via Terminal

---

## 📋 Table of Contents
1. [Overview & Prerequisites](#1-overview--prerequisites)
2. [Phase 1: Deploying VPSMaster to GitHub from Local Terminal](#2-phase-1-deploying-vpsmaster-to-github-from-local-terminal)
3. [Phase 2: Deploying from GitHub to an Ubuntu VPS Server OS via SSH Terminal](#3-phase-2-deploying-from-github-to-an-ubuntu-vps-server-os-via-ssh-terminal)
4. [Phase 3: Post-Deployment Security & Domain Configuration](#4-phase-3-post-deployment-security--domain-configuration)
5. [Phase 4: Continuous Deployment & Updating via Terminal](#5-phase-4-continuous-deployment--updating-via-terminal)
6. [Phase 5: Automated GitHub Actions CI/CD Pipeline](#6-phase-5-automated-github-actions-cicd-pipeline)
7. [Phase 6: Terminal Troubleshooting & Diagnostics](#7-phase-6-terminal-troubleshooting--diagnostics)

---

## 1. Overview & Prerequisites

This comprehensive guide details the complete production lifecycle:
1. Pushing the VPSMaster codebase from your development workstation to a **GitHub repository**.
2. Pulling and deploying VPSMaster from GitHub to a clean **Ubuntu Linux VPS** (Ubuntu 22.04, 24.04, or 26.04 LTS) using strictly the Linux Terminal.

```
+---------------------------+         Push Code        +---------------------------+
|   DEVELOPER WORKSTATION   | -----------------------> |    GITHUB REPOSITORY      |
|  (Git / VS Code / Cursor) |                          | (vpsmaster/vpsmaster.git) |
+---------------------------+                          +---------------------------+
                                                                     |
                                                                     | git clone / git pull
                                                                     v
+----------------------------------------------------------------------------------+
|                             UBUNTU VPS SERVER (TERMINAL)                         |
|   1. Clone to /opt/vpsmaster                                                     |
|   2. Execute sudo bash installer/install.sh                                      |
|   3. Systemd Daemons: vpsmaster-backend (:8000) & vpsmaster-agent (:8001)       |
|   4. Nginx Reverse Proxy & SSL Termination (:8443)                               |
+----------------------------------------------------------------------------------+
```

### Pre-Deployment Checklist
- **Workstation**: Git installed (`git --version`) and a GitHub account.
- **Ubuntu VPS Server**: Fresh Ubuntu 22.04, 24.04, or 26.04 LTS server with:
  - Root or `sudo` privileges.
  - Static Public IPv4 address.
  - SSH access enabled (`ssh root@your-server-ip`).
  - Open inbound network ports: `22` (SSH), `80` (HTTP), `443` (HTTPS), and `8443` (VPSMaster Panel).
- **Domain Name (Optional but Recommended)**: A DNS `A` record pointing to your VPS IP (e.g., `panel.yourdomain.com -> 123.45.67.89`).

---

## 2. Phase 1: Deploying VPSMaster to GitHub from Local Terminal

Execute these steps on your development workstation terminal (PowerShell, macOS Terminal, or Linux Bash).

### Step 1.1: Verify Security & Git Exclusion Rules
Ensure sensitive files, virtual environments, build caches, and SQLite databases are excluded before staging.
Confirm `.gitignore` exists at the root of the project:

```bash
# Verify .gitignore content
cat .gitignore
```
*Crucial exclusions: `.env`, `*.db`, `vpsmaster.db`, `venv/`, `node_modules/`, `*.log`.*

### Step 1.2: Initialize Git Repository
In your project root directory (`Control Panel/`):

```bash
# Initialize local git repository
git init

# Set default branch name to 'main'
git branch -M main
```

### Step 1.3: Configure Git User Identity (If Not Configured Globally)
```bash
git config user.name "Your Name or Organization"
git config user.email "your-email@example.com"
```

### Step 1.4: Stage and Commit the Codebase
```bash
# Stage all tracked files
git add .

# Check staging status (ensure no .env or vpsmaster.db files are listed)
git status

# Create the initial commit
git commit -m "feat: Initial commit of VPSMaster Server Control Panel v1.0.0"
```

### Step 1.5: Create the Remote Repository on GitHub
Choose one of the two methods below:

#### Method A: Using GitHub Web Interface
1. Go to [https://github.com/new](https://github.com/new).
2. Enter Repository name: `vpsmaster`.
3. Choose **Public** or **Private**.
4. **Do NOT** initialize with a README, .gitignore, or license (we already have them).
5. Click **Create repository**.
6. Copy the repository URL (e.g., `https://github.com/<your-username>/vpsmaster.git`).

#### Method B: Using GitHub CLI (`gh`)
```bash
# Authenticate (if needed)
gh auth login

# Create repository and push directly
gh repo create vpsmaster --public --source=. --remote=origin --push
```

### Step 1.6: Connect Local Repository to GitHub & Push (For Method A)
```bash
# Add GitHub remote origin (replace with your actual GitHub URL)
git remote add origin https://github.com/<your-username>/vpsmaster.git

# Push code to GitHub
git push -u origin main
```

### Step 1.7: Create a Version Tag & Release (Optional but Recommended)
Tagging provides stable release points for the server installer:

```bash
# Create an annotated git tag
git tag -a v1.0.0 -m "VPSMaster Production Release 1.0.0"

# Push tag to GitHub
git push origin v1.0.0
```

---

## 3. Phase 2: Deploying from GitHub to an Ubuntu VPS Server OS via SSH Terminal

Now, transition to your remote Ubuntu VPS server. Open your terminal and connect via SSH:

### Step 2.1: Connect to your Ubuntu VPS
```bash
ssh root@<YOUR-SERVER-IP>
# Or if using a sudo user:
ssh -i ~/.ssh/id_rsa username@<YOUR-SERVER-IP>
```

### Step 2.2: Update System Repositories & Install Git
Ensure system packages are up-to-date and Git is available:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget ufw
```

### Step 2.3: Clone the Repository from GitHub to `/opt/vpsmaster`

#### Option A: If your GitHub Repository is Public:
```bash
# Clone directly to /opt/vpsmaster
sudo git clone https://github.com/<your-username>/vpsmaster.git /opt/vpsmaster
```

#### Option B: If your GitHub Repository is Private (Using Deploy Key):
Generate a dedicated read-only SSH Deploy Key on the VPS:
```bash
# Generate key on VPS
ssh-keygen -t ed25519 -C "vpsmaster-deploy-key" -f ~/.ssh/vpsmaster_deploy -N ""

# Display public key
cat ~/.ssh/vpsmaster_deploy.pub
```
1. In GitHub, go to your repository -> **Settings** -> **Deploy keys** -> **Add deploy key**.
2. Paste the public key, title it `Ubuntu VPS Deploy Key`, leave "Allow write access" unchecked, and save.
3. Configure SSH to use this key on the VPS:
   ```bash
   cat >> ~/.ssh/config << EOF
   Host github.com
       IdentityFile ~/.ssh/vpsmaster_deploy
       StrictHostKeyChecking accept-new
   EOF
   chmod 600 ~/.ssh/config ~/.ssh/vpsmaster_deploy
   ```
4. Clone via SSH:
   ```bash
   sudo git clone git@github.com:<your-username>/vpsmaster.git /opt/vpsmaster
   ```

### Step 2.4: Execute the Automated Production Installer
Navigate to the installation directory and run the verified installer script:

```bash
cd /opt/vpsmaster
sudo chmod +x installer/*.sh
sudo bash installer/install.sh
```

#### What the Installer Automatically Performs:
1. **Verifies Environment**: Detects Ubuntu version (22.04, 24.04, 26.04) and root privileges.
2. **Installs System Dependencies**: Installs `nginx`, `certbot`, `python3-certbot-nginx`, `python3-venv`, `build-essential`, `ufw`, `fail2ban`.
3. **Builds Python Virtual Environment**: Sets up `/opt/vpsmaster/venv` and installs FastAPI, SQLAlchemy, Bcrypt, PyOTP, and system libraries.
4. **Generates Cryptographic Secrets**: Creates 256-bit cryptographically secure keys for JWT and Agent authentication in `/etc/vpsmaster/vpsmaster.env` with `chmod 600`.
5. **Initializes Database Schema**: Creates database tables and seeds default Super Administrator account (`admin`).
6. **Registers Systemd Services**: Installs `vpsmaster-agent.service` (Port 8001) and `vpsmaster-backend.service` (Port 8000).
7. **Configures Nginx Reverse Proxy**: Creates `/etc/nginx/sites-available/vpsmaster.conf` with SSL on port `8443` and WebSocket `/ws/` support.
8. **Configures UFW Firewall**: Permits ports `22` (SSH), `80` (HTTP), `443` (HTTPS), and `8443` (VPSMaster Panel).

### Step 2.5: Verify Services & Listening Ports
Ensure all processes are healthy:

```bash
# Check service status
sudo systemctl status vpsmaster-agent --no-pager
sudo systemctl status vpsmaster-backend --no-pager
sudo systemctl status nginx --no-pager

# Verify active listening network sockets
sudo ss -tulpn | grep -E "8443|8000|8001|80|443"
```

You should observe:
- `8443`: Nginx listening for HTTPS web traffic.
- `8000`: FastAPI backend listening on `127.0.0.1`.
- `8001`: Server Agent listening on `127.0.0.1`.

---

## 4. Phase 3: Post-Deployment Security & Domain Configuration

### Step 3.1: Access the Panel GUI
1. Open your browser and navigate to:
   ```
   https://<YOUR-SERVER-IP>:8443
   ```
2. **Accept Self-Signed Certificate**: On first visit, your browser will display a security warning because the initial certificate was generated with the server IP. Click **Advanced -> Proceed to site**.
3. Sign in with the default credentials:
   - **Username**: `admin`
   - **Password**: `Admin@123456`

### Step 3.2: Immediately Change Default Password
Navigate to **Users & Roles** in the sidebar, edit the `admin` user, and set a strong password.

### Step 3.3: Enable Two-Factor Authentication (TOTP)
1. Go to your **Profile** or click the user badge in the upper right.
2. Click **Enable 2FA**.
3. Scan the QR code using Google Authenticator, 1Password, or Authy.
4. Enter the 6-digit verification code to confirm activation.

### Step 3.4: Secure the Panel with Let's Encrypt SSL
To replace the self-signed certificate with a trusted Let's Encrypt certificate for your panel domain:

1. Point your domain DNS `A` record to your server IP (e.g., `panel.yourdomain.com -> 123.45.67.89`).
2. Run Certbot via Terminal:
   ```bash
   sudo certbot certonly --nginx -d panel.yourdomain.com
   ```
3. Update `/etc/nginx/sites-available/vpsmaster.conf`:
   ```nginx
   server_name panel.yourdomain.com;
   ssl_certificate /etc/letsencrypt/live/panel.yourdomain.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/panel.yourdomain.com/privkey.pem;
   ```
4. Test and reload Nginx:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
Now you can access `https://panel.yourdomain.com:8443` without any certificate warning!

---

## 5. Phase 4: Continuous Deployment & Updating via Terminal

When you push new bug fixes, features, or UI improvements to GitHub from your workstation, update your live Ubuntu server in seconds using the Terminal:

### Step 4.1: Standard In-Place Upgrade
Connect to the server via SSH:

```bash
# 1. Navigate to installation directory
cd /opt/vpsmaster

# 2. Pull latest code from GitHub
sudo git pull origin main

# 3. Run automated upgrade script (updates dependencies & migrates DB)
sudo bash installer/upgrade.sh
```

### Step 4.2: If Frontend Changes Were Made
If React components or styles were modified, recompile the frontend bundle:

```bash
cd /opt/vpsmaster/frontend
sudo npm install
sudo npm run build
sudo systemctl reload nginx
```

### Step 4.3: Zero-Downtime Service Restart
```bash
sudo systemctl restart vpsmaster-backend
sudo systemctl restart vpsmaster-agent
```

---

## 6. Phase 5: Automated GitHub Actions CI/CD Pipeline

To automatically deploy updates to your Ubuntu server whenever you push to the `main` branch on GitHub:

### Step 5.1: Create GitHub Secrets
In your GitHub repository, navigate to **Settings** -> **Secrets and variables** -> **Actions** and add:
- `SSH_HOST`: Your server IP address.
- `SSH_USER`: `root` or your sudo user.
- `SSH_KEY`: Private SSH key authorized in `/root/.ssh/authorized_keys`.
- `SSH_PORT`: `22` (or your custom SSH port).

### Step 5.2: Create Workflow File in Workstation
Create `.github/workflows/deploy.yml`:

```yaml
name: VPSMaster CD (Continuous Deployment)

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Deploy to Ubuntu VPS via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            cd /opt/vpsmaster
            git pull origin main
            source /opt/vpsmaster/venv/bin/activate
            pip install -r backend/requirements.txt
            cd frontend && npm install && npm run build && cd ..
            systemctl restart vpsmaster-backend vpsmaster-agent
            systemctl reload nginx
```

Commit and push this workflow to GitHub:
```bash
git add .github/workflows/deploy.yml
git commit -m "ci: Add automated GitHub Actions deployment workflow"
git push origin main
```

---

## 7. Phase 6: Terminal Troubleshooting & Diagnostics

### Diagnostic Command Cheat-Sheet

| Diagnostic Goal | Terminal Command |
| :--- | :--- |
| **Inspect Backend Logs** | `sudo journalctl -u vpsmaster-backend -f -n 50` |
| **Inspect Agent Logs** | `sudo journalctl -u vpsmaster-agent -f -n 50` |
| **Inspect Nginx Error Logs** | `sudo tail -f /var/log/nginx/error.log` |
| **Check Port Listening Status** | `sudo ss -tulpn \| grep -E "8443\|8000\|8001"` |
| **Verify Nginx Config Syntax** | `sudo nginx -t` |
| **Check UFW Firewall Rules** | `sudo ufw status verbose` |
| **Restart Core Daemons** | `sudo systemctl restart vpsmaster-backend vpsmaster-agent nginx` |

### Common Issues & Resolutions

#### Issue: Port 8443 Inaccessible in Browser
- **Cause 1: Cloud Firewall / Security Group**: If hosting on AWS EC2, GCP, DigitalOcean, Hetzner, or Linode, cloud security group rules might block port 8443.
  - *Fix*: Go to your Cloud Provider's console -> Networking/Firewall -> Add Inbound Rule: TCP Port `8443` from `0.0.0.0/0`.
- **Cause 2: UFW Rule Missing**:
  - *Fix*: `sudo ufw allow 8443/tcp && sudo ufw reload`.

#### Issue: 502 Bad Gateway on Port 8443
- **Cause**: The FastAPI backend service (`vpsmaster-backend`) is stopped.
  - *Fix*: Run `sudo systemctl restart vpsmaster-backend` and inspect `sudo journalctl -u vpsmaster-backend -n 30` to identify errors.

#### Issue: Git Pull Conflicts on Server
- If files were manually modified on the server:
  ```bash
  cd /opt/vpsmaster
  sudo git stash
  sudo git pull origin main
  sudo bash installer/upgrade.sh
  ```

---

*VPSMaster is engineered for high stability and security. For further assistance, consult the official repository issues or documentation.*

