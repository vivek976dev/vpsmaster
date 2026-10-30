#!/usr/bin/env bash
# ==============================================================================
# VPSMaster: Upgrade Script
# ==============================================================================

set -euo pipefail

INSTALL_DIR="/opt/vpsmaster"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] This upgrade script must be executed as root.${NC}"
   exit 1
fi

echo -e "${BLUE}${BOLD}[1/4] Stopping VPSMaster services during update...${NC}"
systemctl stop vpsmaster-backend.service || true

echo -e "${BLUE}${BOLD}[2/4] Updating dependencies...${NC}"
"$INSTALL_DIR/venv/bin/pip" install --upgrade -r "$INSTALL_DIR/backend/requirements.txt"

echo -e "${BLUE}${BOLD}[3/4] Running database migrations...${NC}"
cd "$INSTALL_DIR"
PYTHONPATH="$INSTALL_DIR/backend" "$INSTALL_DIR/venv/bin/python" -c "
import os
os.environ['TESTING'] = '1'
from app.core.database import Base, engine
Base.metadata.create_all(bind=engine)
print('Database schema migrated.')
"

echo -e "${BLUE}${BOLD}[4/4] Restarting services...${NC}"
systemctl restart vpsmaster-agent.service
systemctl restart vpsmaster-backend.service

echo -e "${GREEN}${BOLD}VPSMaster upgraded successfully!${NC}"

