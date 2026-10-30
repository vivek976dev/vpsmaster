#!/usr/bin/env bash
# ==============================================================================
# VPSMaster: Uninstallation Script
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] This uninstaller must be executed as root (use sudo).${NC}"
   exit 1
fi

echo -e "${YELLOW}${BOLD}Are you sure you want to uninstall VPSMaster from this server? [y/N]${NC}"
read -r CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Uninstallation cancelled."
    exit 0
fi

echo -e "${RED}Stopping services...${NC}"
systemctl stop vpsmaster-backend.service || true
systemctl stop vpsmaster-agent.service || true
systemctl disable vpsmaster-backend.service || true
systemctl disable vpsmaster-agent.service || true

echo -e "${RED}Removing systemd service units...${NC}"
rm -f /etc/systemd/system/vpsmaster-backend.service
rm -f /etc/systemd/system/vpsmaster-agent.service
systemctl daemon-reload

echo -e "${RED}Removing Nginx configuration...${NC}"
rm -f /etc/nginx/sites-enabled/vpsmaster.conf
rm -f /etc/nginx/sites-available/vpsmaster.conf
nginx -t && systemctl reload nginx || true

echo -e "${YELLOW}Do you wish to purge all panel data (/etc/vpsmaster, /opt/vpsmaster)? [y/N]${NC}"
read -r PURGE
if [[ "$PURGE" == "y" || "$PURGE" == "Y" ]]; then
    rm -rf /opt/vpsmaster
    rm -rf /etc/vpsmaster
    rm -rf /var/log/vpsmaster
    echo -e "${GREEN}All VPSMaster files and databases have been purged.${NC}"
else
    echo -e "${GREEN}Panel binaries stopped and disabled. Database retained in /etc/vpsmaster.${NC}"
fi

echo -e "${GREEN}${BOLD}VPSMaster uninstalled.${NC}"

