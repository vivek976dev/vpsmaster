You can uninstall VPSMaster from your server terminal using either the built-in uninstaller script or manual one-line cleanup commands.

Method 1: Using the Built-In Uninstaller Script

If `/opt/vpsmaster` is present on your server, run:

```bash
sudo bash /opt/vpsmaster/installer/uninstall.sh
```
It will ask you:

Are you sure you want to uninstall VPSMaster? [y/N] -> type y

Do you wish to purge all panel data `(/etc/vpsmaster, /opt/vpsmaster)`? [y/N] -> type y
to wipe all files, databases, and logs.

Method 2: Complete Clean Manual Purge (Recommended if files were moved)

To completely stop and remove all services, Nginx configurations, database files, and project directories in one go, run:

```bash
# 1. Stop and disable systemd services
sudo systemctl stop vpsmaster-backend vpsmaster-agent 2>/dev/null || true
sudo systemctl disable vpsmaster-backend vpsmaster-agent 2>/dev/null || true
# 2. Remove systemd service definitions
sudo rm -f /etc/systemd/system/vpsmaster-backend.service
sudo rm -f /etc/systemd/system/vpsmaster-agent.service
sudo systemctl daemon-reload
# 3. Remove Nginx reverse proxy configuration & self-signed SSL
sudo rm -f /etc/nginx/sites-enabled/vpsmaster.conf
sudo rm -f /etc/nginx/sites-available/vpsmaster.conf
sudo rm -f /etc/nginx/ssl/vpsmaster.*
sudo nginx -t && sudo systemctl reload nginx
# 4. Remove application directories, databases, and logs
sudo rm -rf /opt/vpsmaster
sudo rm -rf /etc/vpsmaster
sudo rm -rf /var/log/vpsmaster
sudo rm -rf /var/backups/vpsmaster
# 5. Remove the system daemon user (optional)
sudo userdel vpsmaster 2>/dev/null || true
# 6. Remove the UFW firewall rule for port 8443 (optional)
sudo ufw delete allow 8443/tcp 2>/dev/null || true
```
Verify It Is Removed

```bash
# Check that ports 8443, 8000, and 8001 are no longer listening
sudo ss -tulpn | grep -E "8443|8000|8001"
```
The output should now be empty.
