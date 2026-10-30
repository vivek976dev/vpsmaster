#!/usr/bin/env bash
# ==============================================================================
# VPSMaster: Enterprise Ubuntu VPS Management Control Panel Installer
# Supported: Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, Ubuntu 26.04 LTS
# ==============================================================================

set -euo pipefail

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

INSTALL_DIR="/opt/vpsmaster"
CONFIG_DIR="/etc/vpsmaster"
LOG_FILE="/var/log/vpsmaster-install.log"
PANEL_PORT=8443
AGENT_PORT=8001
BACKEND_PORT=8000

echo -e "${CYAN}${BOLD}"
cat << "EOF"
 __      ______   _____ __  __           _            
 \ \    / /  _ \ / ____|  \/  |         | |           
  \ \  / /| |_) | (___ | \  / | __ _ ___| |_ ___ _ __ 
   \ \/ / |  __/ \___ \| |\/| |/ _` / __| __/ _ \ '__|
    \  /  | |    ____) | |  | | (_| \__ \ ||  __/ |   
     \/   |_|   |_____/|_|  |_|\__,_|___/\__\___|_|   
EOF
echo -e "${NC}"
echo -e "${BOLD}Ubuntu Server Management Control Panel — Automated Installer${NC}"
echo -e "=================================================================="

# 1. Root check
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] This installer must be executed as root (use sudo).${NC}"
   exit 1
fi

# 2. Ubuntu version detection
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME=$NAME
    OS_VERSION=$VERSION_ID
else
    echo -e "${RED}[ERROR] Cannot detect operating system. /etc/os-release is missing.${NC}"
    exit 1
fi

if [[ "$ID" != "ubuntu" ]]; then
    echo -e "${RED}[ERROR] VPSMaster is tailored specifically for Ubuntu Linux. Detected: $OS_NAME${NC}"
    exit 1
fi

echo -e "${GREEN}[INFO] Detected $PRETTY_NAME (Version: $OS_VERSION)${NC}"

# Check supported versions (22.04, 24.04, 26.04)
MAJOR_VERSION=$(echo "$OS_VERSION" | cut -d. -f1)
if [[ "$MAJOR_VERSION" -lt 22 ]]; then
    echo -e "${RED}[ERROR] Ubuntu 22.04 LTS or newer is required. Found $OS_VERSION.${NC}"
    exit 1
fi

# 3. Create log file
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo -e "\n${BLUE}[1/8] Updating Ubuntu package repositories & installing dependencies...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    ufw \
    fail2ban \
    nginx \
    certbot \
    python3-certbot-nginx \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    tar \
    gzip \
    unzip \
    rsync \
    htop \
    net-tools \
    socat \
    openssl

# 4. Create system user and groups
echo -e "\n${BLUE}[2/8] Configuring system security boundaries & vpsmaster user...${NC}"
if ! id "vpsmaster" &>/dev/null; then
    useradd -r -s /bin/false -d "$INSTALL_DIR" -c "VPSMaster Panel Daemon" vpsmaster
fi

mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p "/var/log/vpsmaster"
mkdir -p "/var/backups/vpsmaster"
mkdir -p "/var/www"

# 5. Copy files to installation directory
echo -e "\n${BLUE}[3/8] Deploying VPSMaster control panel core codebase...${NC}"
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# If running directly from git clone / release archive:
if [ -d "$CURRENT_DIR/backend" ] && [ -d "$CURRENT_DIR/server-agent" ]; then
    rsync -av --exclude '.git' --exclude 'frontend/node_modules' "$CURRENT_DIR/" "$INSTALL_DIR/"
fi

# 6. Setup Python Virtual Environment
echo -e "\n${BLUE}[4/8] Building isolated Python virtual environment...${NC}"
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip setuptools wheel
"$INSTALL_DIR/venv/bin/pip" install -r "$INSTALL_DIR/backend/requirements.txt"

# 7. Generate cryptographic secrets
echo -e "\n${BLUE}[5/8] Generating cryptographically secure tokens & configurations...${NC}"
if [ ! -f "$CONFIG_DIR/vpsmaster.env" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    AGENT_SECRET=$(openssl rand -hex 32)

    cat > "$CONFIG_DIR/vpsmaster.env" << EOF
# VPSMaster Production Environment Configuration
PROJECT_NAME="VPSMaster"
ENVIRONMENT="production"
PORT=8000
HOST="127.0.0.1"
DATABASE_URL="sqlite:////etc/vivek976dev/vpsmaster.db"
SECRET_KEY="${JWT_SECRET}"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7

# Server Agent Security
AGENT_URL="http://127.0.0.1:${AGENT_PORT}"
AGENT_SECRET_KEY="${AGENT_SECRET}"

# Default System Storage
STORAGE_PATH="/var/backups/vpsmaster"
EOF
    chmod 600 "$CONFIG_DIR/vpsmaster.env"
    chown -R vpsmaster:vpsmaster "$CONFIG_DIR"
fi

# Link env to install dir
ln -sf "$CONFIG_DIR/vpsmaster.env" "$INSTALL_DIR/backend/.env"
ln -sf "$CONFIG_DIR/vpsmaster.env" "$INSTALL_DIR/server-agent/.env"

# 8. Initialize SQLite / PostgreSQL Database & Seed Admin
echo -e "\n${BLUE}[6/8] Initializing database schema & seeding Super Admin...${NC}"
ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)
ADMIN_PASSWORD="Admin@${ADMIN_PASSWORD}"

cd "$INSTALL_DIR"
PYTHONPATH="$INSTALL_DIR/backend" "$INSTALL_DIR/venv/bin/python" -c "
import os
os.environ['TESTING'] = '1'
from app.core.database import Base, engine
from app.main import seed_initial_data
Base.metadata.create_all(bind=engine)
seed_initial_data()
print('Database initialized.')
"

# 9. Configure Systemd Daemons
echo -e "\n${BLUE}[7/8] Installing and registering systemd service daemons...${NC}"

# Agent service
cat > /etc/systemd/system/vpsmaster-agent.service << EOF
[Unit]
Description=VPSMaster Host Management Agent Daemon
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/server-agent
EnvironmentFile=${CONFIG_DIR}/vpsmaster.env
ExecStart=${INSTALL_DIR}/venv/bin/uvicorn agent:app --host 127.0.0.1 --port ${AGENT_PORT}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Backend service
cat > /etc/systemd/system/vpsmaster-backend.service << EOF
[Unit]
Description=VPSMaster FastAPI Control Panel API
After=network.target vpsmaster-agent.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/backend
EnvironmentFile=${CONFIG_DIR}/vpsmaster.env
ExecStart=${INSTALL_DIR}/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port ${BACKEND_PORT}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vpsmaster-agent.service
systemctl enable vpsmaster-backend.service
systemctl restart vpsmaster-agent.service
systemctl restart vpsmaster-backend.service

# 10. Configure Nginx Reverse Proxy with Self-Signed SSL
echo -e "\n${BLUE}[8/8] Configuring Nginx reverse proxy with SSL termination...${NC}"
mkdir -p /etc/nginx/ssl
if [ ! -f /etc/nginx/ssl/vpsmaster.crt ]; then
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/vpsmaster.key \
        -out /etc/nginx/ssl/vpsmaster.crt \
        -subj "/C=US/ST=Cloud/L=Server/O=VPSMaster/CN=$(hostname -I | awk '{print $1}')"
fi

cat > /etc/nginx/sites-available/vpsmaster.conf << EOF
server {
    listen ${PANEL_PORT} ssl http2 default_server;
    listen [::]:${PANEL_PORT} ssl http2 default_server;

    ssl_certificate /etc/nginx/ssl/vpsmaster.crt;
    ssl_certificate_key /etc/nginx/ssl/vpsmaster.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root ${INSTALL_DIR}/frontend/dist;
    index index.html;

    client_max_body_size 512M;

    # Frontend Single Page App routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    # WebSocket Telemetry
    location /ws/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
    }
}
EOF

ln -sf /etc/nginx/sites-available/vpsmaster.conf /etc/nginx/sites-enabled/vpsmaster.conf
nginx -t && systemctl reload nginx

# 11. Configure UFW Firewall
if command -v ufw &>/dev/null; then
    ufw allow 22/tcp || true
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow ${PANEL_PORT}/tcp || true
fi

# Detect Server IP
SERVER_IP=$(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')

echo -e "\n${GREEN}${BOLD}==================================================================${NC}"
echo -e "${GREEN}${BOLD}       VPSMaster Installation Completed Successfully!             ${NC}"
echo -e "${GREEN}${BOLD}==================================================================${NC}"
echo -e "\n${BOLD}Access your Control Panel:${NC}"
echo -e "  URL:           ${CYAN}https://${SERVER_IP}:${PANEL_PORT}${NC}"
echo -e "  Username:      ${BOLD}admin${NC}"
echo -e "  Password:      ${BOLD}Admin@123456${NC}"
echo -e "\n${YELLOW}[NOTE] Since a self-signed SSL was generated, proceed past the browser certificate warning on initial visit.${NC}"
echo -e "Once logged in, you can configure Let's Encrypt SSL certificates for your host domain.\n"

