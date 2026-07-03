#!/bin/bash
set -e

echo "=== Bluebex Teams - GCP VM Setup ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Create deploy user
sudo useradd -m -s /bin/bash deploy || true
sudo mkdir -p /opt/bluebex-teams
sudo chown deploy:deploy /opt/bluebex-teams

# Setup PostgreSQL
sudo -u postgres psql -c "CREATE USER bluebex WITH PASSWORD 'CHANGE_THIS_PASSWORD';" || true
sudo -u postgres psql -c "CREATE DATABASE bluebex_teams OWNER bluebex;" || true

# Copy systemd services
sudo cp /opt/bluebex-teams/deploy/bluebex-web.service /etc/systemd/system/
sudo cp /opt/bluebex-teams/deploy/bluebex-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bluebex-web bluebex-api

# Setup Nginx
sudo cp /opt/bluebex-teams/deploy/nginx.conf /etc/nginx/sites-available/bluebex-teams
sudo ln -sf /etc/nginx/sites-available/bluebex-teams /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== Setup complete! ==="
echo "Next steps:"
echo "1. Update /opt/bluebex-teams/.env with production values"
echo "2. Point teams.bluebex.com DNS to this VM's IP"
echo "3. Run: sudo certbot --nginx -d teams.bluebex.com"
echo "4. Deploy the app (CI/CD will handle this after setup)"
