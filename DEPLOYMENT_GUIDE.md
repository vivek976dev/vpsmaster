# VPSMaster: Complete End-to-End Deployment Guide
### From Local Workstation to GitHub & From GitHub to an Ubuntu VPS Server OS via Terminal

> Full documentation is maintained in [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).

---

## ⚡ Quick Reference Commands

### 1. Push Code to GitHub (Workstation Terminal)
```bash
# 1. Initialize and branch
git init
git branch -M main

# 2. Stage and commit
git add .
git commit -m "feat: Initial commit of VPSMaster Server Control Panel v1.0.0"

# 3. Add remote repository and push
git remote add origin https://github.com/<your-username>/vpsmaster.git
git push -u origin main

# 4. Optional: Create version release tag
git tag -a v1.0.0 -m "VPSMaster Production Release 1.0.0"
git push origin v1.0.0
```

---

### 2. Deploy from GitHub to Ubuntu VPS (Server SSH Terminal)
```bash
# 1. Connect to VPS
ssh root@<YOUR-SERVER-IP>

# 2. Update host and install git
sudo apt update && sudo apt install -y git curl ufw

# 3. Clone repository to /opt/vpsmaster
sudo git clone https://github.com/<your-username>/vpsmaster.git /opt/vpsmaster

# 4. Execute production automated installer
cd /opt/vpsmaster
sudo chmod +x installer/*.sh
sudo bash installer/install.sh
```

---

### 3. Update Existing Installation from GitHub (Server SSH Terminal)
```bash
cd /opt/vpsmaster
sudo git pull origin main
sudo bash installer/upgrade.sh
```

---

### 4. Default Access Credentials
- **URL**: `https://<YOUR-SERVER-IP>:8443`
- **Username**: `admin`
- **Password**: `Admin@123456`

---

*For in-depth explanations, SSH Deploy Key configuration, automated GitHub Actions CI/CD workflows, and troubleshooting, read the complete guide in [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).*

