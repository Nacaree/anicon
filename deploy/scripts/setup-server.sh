#!/usr/bin/env bash
# =============================================================================
# AniCon — Oracle VM One-Time Setup Script
# Run this once on a fresh Ubuntu 22.04 Oracle Ampere A1 instance.
# Usage: bash setup-server.sh
# =============================================================================

set -e  # Exit on any error

echo "========================================"
echo " AniCon Server Setup"
echo "========================================"

# --- System update ---
echo "[1/8] Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# --- Java 21 (Temurin) ---
echo "[2/8] Installing Java 21..."
sudo apt-get install -y wget apt-transport-https gnupg
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/adoptium.gpg
echo "deb https://packages.adoptium.net/artifactory/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/adoptium.list
sudo apt-get update -qq
sudo apt-get install -y temurin-21-jdk
java -version

# --- Node.js 20 LTS (via NodeSource) ---
echo "[3/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v

# --- Nginx ---
echo "[4/8] Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# --- PM2 (process manager for Next.js) ---
echo "[5/8] Installing PM2..."
sudo npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -n 1 | sudo bash

# --- Certbot (SSL) ---
echo "[6/8] Installing Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

# --- Create directories ---
echo "[7/8] Creating app directories..."
sudo mkdir -p /opt/anicon/frontend
sudo chown -R ubuntu:ubuntu /opt/anicon
sudo mkdir -p /var/log/anicon
sudo chown -R ubuntu:ubuntu /var/log/anicon

# Secrets directory — you will fill these files manually
mkdir -p /home/ubuntu/anicon-secrets
chmod 700 /home/ubuntu/anicon-secrets

# --- Install systemd service ---
echo "[8/8] Installing systemd service..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

sudo cp "$REPO_ROOT/deploy/systemd/anicon-backend.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable anicon-backend

# --- Install Nginx config ---
sudo cp "$REPO_ROOT/deploy/nginx/anicon.conf" /etc/nginx/sites-available/anicon
sudo ln -sf /etc/nginx/sites-available/anicon /etc/nginx/sites-enabled/anicon
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# =============================================================================
echo ""
echo "========================================"
echo " Setup complete! Manual steps remaining:"
echo "========================================"
echo ""
echo "1. FILL IN YOUR SECRETS"
echo "   Create /home/ubuntu/anicon-secrets/backend.env with:"
echo ""
echo "   SUPABASE_DB_URL=jdbc:postgresql://..."
echo "   SUPABASE_DB_USERNAME=postgres.yourproject"
echo "   SUPABASE_DB_PASSWORD=..."
echo "   SUPABASE_JWT_SECRET=..."
echo "   SUPABASE_URL=https://yourproject.supabase.co"
echo "   SUPABASE_ANON_KEY=..."
echo "   PAYWAY_MERCHANT_ID=..."
echo "   PAYWAY_API_KEY=..."
echo "   PAYWAY_RETURN_URL=https://yourdomain.com/payment/verify"
echo "   PAYWAY_MOCK_APPROVED=false"
echo "   STRIPE_SECRET_KEY=sk_live_..."
echo "   STRIPE_WEBHOOK_SECRET=whsec_..."
echo "   CORS_ALLOWED_ORIGINS=https://yourdomain.com"
echo ""
echo "   Create /home/ubuntu/anicon-secrets/frontend.env.local with:"
echo ""
echo "   NEXT_PUBLIC_API_URL=https://yourdomain.com"
echo "   NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
echo "   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...""
echo ""
echo "2. UPDATE NGINX CONFIG"
echo "   Edit /etc/nginx/sites-available/anicon"
echo "   Replace 'yourdomain.com' with your actual domain"
echo "   Then reload: sudo systemctl reload nginx"
echo ""
echo "3. GET SSL CERTIFICATE"
echo "   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo ""
echo "4. REGISTER GITHUB ACTIONS SELF-HOSTED RUNNER"
echo "   Go to: GitHub repo → Settings → Actions → Runners → New self-hosted runner"
echo "   Select: Linux / ARM64"
echo "   Follow the commands shown there (download, configure, install as service)"
echo "   When asked for runner name, use: oracle-vm"
echo "   After registration, run: sudo ./svc.sh install && sudo ./svc.sh start"
echo ""
echo "5. OPEN ORACLE FIREWALL PORTS"
echo "   In Oracle Cloud Console → Networking → VCN → Security Lists:"
echo "   Add ingress rules for ports 80 (HTTP) and 443 (HTTPS)"
echo "   Also run on the VM:"
echo "   sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT"
echo "   sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT"
echo "   sudo netfilter-persistent save"
echo ""
