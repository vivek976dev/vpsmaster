If you uploaded the project via the command line and cannot find the user interface at `https://<YOUR-SERVER-IP>:8443`, this is typically caused by one of 5 common issues.

Step 1: Run Diagnostic Commands on Your VPS

Log into your server terminal via SSH and run these quick checks:

bash
# 1. Check if services and port 8443 are listening
sudo ss -tulpn | grep -E "8443|8000|8001"
# 2. Check if the frontend build files actually exist
ls -la /opt/vpsmaster/frontend/dist
# 3. Check Nginx error logs
sudo tail -n 20 /var/log/nginx/error.log
Step 2: Identify and Fix Your Issue
1. Missing frontend/dist (Most Probable: Nginx gives 404 / 403)
Cause: In the project .gitignore, line 9 excludes dist/. When you pushed the code to GitHub or cloned it to your server, the frontend/dist build folder was not uploaded. Nginx is configured to serve static files from /opt/vpsmaster/frontend/dist/index.html. If this directory doesn't exist, Nginx cannot serve the UI.
Fix: Build the frontend directly on your server:
bash
# Install Node.js and npm if not already present
sudo apt update && sudo apt install -y nodejs npm
# Build the frontend assets
cd /opt/vpsmaster/frontend
sudo npm install
sudo npm run build
# Verify dist exists and reload Nginx
ls -la dist/
sudo systemctl reload nginx
(Alternative: If you already built it locally, copy your local frontend/dist folder to your VPS using scp -r frontend/dist root@<YOUR-SERVER-IP>:/opt/vpsmaster/frontend/).
2. The Installer Was Not Executed Yet (Browser shows "Connection Refused")
Cause: Simply cloning or copying files via git clone or scp does not start the background daemons or Nginx.
Fix: You must run the automated installer script:
bash
cd /opt/vpsmaster
sudo chmod +x installer/*.sh
sudo bash installer/install.sh
This creates the system services (vpsmaster-backend, vpsmaster-agent), generates SSL certificates, configures Nginx on port 8443, and opens local UFW firewall rules.
3. Cloud Provider Firewall / Security Group Blocking Port 8443
Cause: If your VPS is hosted on AWS EC2, DigitalOcean, Oracle Cloud, Hetzner, Linode, or GCP, the provider's external cloud firewall blocks port 8443 by default even if Ubuntu's internal firewall (ufw) has opened it.
Fix:
Go to your cloud provider's web console (e.g., AWS Security Groups, DigitalOcean Cloud Firewalls, or Oracle VCN Security Lists).
Add an Inbound Firewall Rule:
Protocol: TCP
Port Range: 8443
Source: 0.0.0.0/0 (Anywhere)
Ensure local UFW allows it as well:
bash
sudo ufw allow 8443/tcp
sudo ufw reload
4. Browser Self-Signed SSL Certificate Warning
Cause: The installer generates a self-signed SSL certificate for https://. Modern browsers (Chrome, Edge, Safari, Firefox) display a full-page red warning stating:

"Your connection is not private" (ERR_CERT_AUTHORITY_INVALID or NET::ERR_CERT_INVALID).

Fix:
Click Advanced (or More Information).
Click Proceed to <YOUR-SERVER-IP> (unsafe).
5. Verify the IP Placeholder
Make sure you replace <YOUR-SERVER-IP> in your browser URL bar with your server's actual public IPv4 address, for example:
https://123.45.67.89:8443
(Find your server's public IP from the server terminal with curl -4 ifconfig.me).
