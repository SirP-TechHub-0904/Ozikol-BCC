#!/usr/bin/env bash
# ==============================================================================
# Ozikol BCC — Automated Custom Domain & SSL Provisioner
# ==============================================================================
# Automates Nginx reverse proxy routing and Let's Encrypt SSL certificate
# issuance for tenant custom domains (e.g. nightpresssecurity.co.uk).
# Isolates custom domains so they never fall back to the Mailcow default server.
#
# Usage:
#   sudo bash scripts/domain/provision-custom-domain.sh <DOMAIN> [TENANT_KEY] [ACTION]
#
# Examples:
#   sudo bash scripts/domain/provision-custom-domain.sh nightpresssecurity.co.uk nightpress provision
#   sudo bash scripts/domain/provision-custom-domain.sh nightpresssecurity.co.uk nightpress remove
# ==============================================================================

set -euo pipefail

DOMAIN="${1:-}"
TENANT_KEY="${2:-default}"
ACTION="${3:-provision}"

if [[ -z "$DOMAIN" ]]; then
    echo "ERROR: Custom domain parameter is required."
    echo "Usage: sudo bash provision-custom-domain.sh <DOMAIN> [TENANT_KEY] [ACTION]"
    exit 1
fi

# Sanitize domain
CLEAN_DOMAIN=$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]' | sed -e 's|^https://||' -e 's|^http://||' -e 's|/$||')

# Configuration
WEB_CLIENT_PORT="${WEB_CLIENT_PORT:-4200}"
API_PORT="${API_PORT:-5000}"
CLIENT_STATIC_ROOT="${CLIENT_STATIC_ROOT:-/var/www/ozikol-client}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ozikol.cloud}"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
ACME_WEBROOT="/var/www/certbot"
CONF_FILE="${NGINX_SITES_AVAILABLE}/ozikol-tenant-${CLEAN_DOMAIN}.conf"
ENABLED_LINK="${NGINX_SITES_ENABLED}/ozikol-tenant-${CLEAN_DOMAIN}.conf"
CERT_DIR="/etc/letsencrypt/live/${CLEAN_DOMAIN}"

echo "==================================================================="
echo " Ozikol BCC Custom Domain Provisioner"
echo " Domain:     ${CLEAN_DOMAIN}"
echo " Workspace:  ${TENANT_KEY}"
echo " Action:     ${ACTION}"
echo " Timestamp:  $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "==================================================================="

# ------------------------------------------------------------------------------
# Action: REMOVE / DEPROVISION
# ------------------------------------------------------------------------------
if [[ "$ACTION" == "remove" || "$ACTION" == "delete" ]]; then
    echo "--> Removing routing configuration for ${CLEAN_DOMAIN}..."
    rm -f "$ENABLED_LINK" "$CONF_FILE"
    if nginx -t > /dev/null 2>&1; then
        systemctl reload nginx || nginx -s reload
        echo "[SUCCESS] Domain ${CLEAN_DOMAIN} routing removed and Nginx reloaded."
    else
        echo "[WARNING] Nginx syntax test failed after file removal. Please verify configuration."
    fi
    exit 0
fi

# ------------------------------------------------------------------------------
# Action: PROVISION
# ------------------------------------------------------------------------------

# 1. Ensure ACME challenge directory exists
mkdir -p "$ACME_WEBROOT"
chmod 755 "$ACME_WEBROOT"
mkdir -p "$NGINX_SITES_AVAILABLE" "$NGINX_SITES_ENABLED"

# 2. Check if SSL certificates already exist
HAS_SSL=false
if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
    HAS_SSL=true
    echo "--> Existing SSL certificates detected at ${CERT_DIR}."
fi

# 3. Write Initial Configuration
echo "--> Generating Nginx virtual host configuration..."
cat <<EOF > "$CONF_FILE"
# ==============================================================================
# Ozikol BCC Custom Domain Routing Configuration: ${CLEAN_DOMAIN}
# Tenant Workspace: ${TENANT_KEY}
# Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')
# Dedicated reverse proxy bypassing Mailcow fallback
# ==============================================================================

# HTTP Server Block (ACME Validation & Redirection)
server {
    listen 80;
    listen [::]:80;
    server_name ${CLEAN_DOMAIN} www.${CLEAN_DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${ACME_WEBROOT};
        allow all;
    }

$(if [ "$HAS_SSL" = true ]; then
cat <<'SUB_EOF'
    location / {
        return 301 https://$host$request_uri;
    }
SUB_EOF
else
cat <<SUB_EOF
    # Initial HTTP proxy before certificate issuance
    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Tenant-Key "${TENANT_KEY}";
        proxy_set_header X-Tenant-Custom-Domain "${CLEAN_DOMAIN}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Hubs Proxy
    location /hubs/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Tenant-Key "${TENANT_KEY}";
        proxy_set_header X-Tenant-Custom-Domain "${CLEAN_DOMAIN}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static Angular SPA Client with fallback
    root ${CLIENT_STATIC_ROOT};
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
SUB_EOF
fi)
}

$(if [ "$HAS_SSL" = true ]; then
cat <<SUB_EOF
# HTTPS Server Block (Active SSL)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${CLEAN_DOMAIN} www.${CLEAN_DOMAIN};

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Tenant-Key "${TENANT_KEY}";
        proxy_set_header X-Tenant-Custom-Domain "${CLEAN_DOMAIN}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Web Client Proxy
    # Hubs Proxy
    location /hubs/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Tenant-Key "${TENANT_KEY}";
        proxy_set_header X-Tenant-Custom-Domain "${CLEAN_DOMAIN}";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static Angular SPA Client with fallback
    root ${CLIENT_STATIC_ROOT};
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
SUB_EOF
fi)
EOF

# 4. Enable virtual host symlink
ln -sf "$CONF_FILE" "$ENABLED_LINK"

# 5. Test initial Nginx configuration syntax
echo "--> Testing Nginx configuration syntax..."
nginx -t

# 6. Reload Nginx to serve the ACME challenge
echo "--> Reloading Nginx..."
systemctl reload nginx || nginx -s reload

# 7. Request SSL Certificate if not already present
if [ "$HAS_SSL" = false ]; then
    echo "--> Requesting Let's Encrypt SSL certificate via ACME webroot challenge..."
    if command -v certbot > /dev/null 2>&1; then
        certbot certonly \
            --webroot \
            -w "$ACME_WEBROOT" \
            -d "${CLEAN_DOMAIN}" \
            -d "www.${CLEAN_DOMAIN}" \
            --non-interactive \
            --agree-tos \
            -m "$ADMIN_EMAIL" \
            --keep-until-expiring || {
                echo "[WARNING] Certbot certificate issuance encountered a challenge error."
                echo "Verify public DNS has propagated to this server before re-running."
            }

        # Check if certbot successfully generated the certificate
        if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
            echo "--> Certificate acquired! Upgrading Nginx configuration to strict HTTPS..."
            # Re-run script to re-generate with HTTPS block enabled
            bash "$0" "$CLEAN_DOMAIN" "$TENANT_KEY" "provision"
            exit 0
        fi
    else
        echo "[WARNING] Certbot is not installed. Run 'sudo apt-get install -y certbot python3-certbot-nginx'."
    fi
fi

echo "==================================================================="
echo " [SUCCESS] Automated provisioning completed for ${CLEAN_DOMAIN}!"
echo " Workspace: ${TENANT_KEY}"
echo " Nginx config: ${CONF_FILE}"
echo " URL: https://${CLEAN_DOMAIN}"
echo "==================================================================="

