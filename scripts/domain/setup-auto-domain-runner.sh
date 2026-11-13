#!/usr/bin/env bash
# ==============================================================================
# Ozikol BCC — Setup Auto Domain Provisioner Runner
# ==============================================================================
# Installs Certbot and Nginx prerequisites, creates ACME webroot directory,
# and configures sudoers permission for automated background provisioning.
#
# Usage:
#   sudo bash scripts/domain/setup-auto-domain-runner.sh
# ==============================================================================

set -euo pipefail

echo "==================================================================="
echo " Ozikol BCC - Installing Automated Custom Domain Provisioner Runner"
echo "==================================================================="

# 1. Install certbot and nginx utilities if not installed
if ! command -v certbot > /dev/null 2>&1; then
    echo "--> Installing Certbot..."
    apt-get update -y
    apt-get install -y certbot python3-certbot-nginx
fi

# 2. Create Let's Encrypt webroot directory
ACME_WEBROOT="/var/www/certbot"
mkdir -p "$ACME_WEBROOT"
chmod 755 "$ACME_WEBROOT"
echo "--> Created ACME webroot directory: $ACME_WEBROOT"

# 3. Copy provisioner script to standard system binary path
SCRIPT_SOURCE="$(dirname "$0")/provision-custom-domain.sh"
TARGET_BIN="/usr/local/bin/ozikol-provision-domain"

if [[ -f "$SCRIPT_SOURCE" ]]; then
    cp "$SCRIPT_SOURCE" "$TARGET_BIN"
    chmod +x "$TARGET_BIN"
    echo "--> Installed provisioner script to: $TARGET_BIN"
fi

# 4. Configure sudoers rule so application service can reload nginx and run certbot
SUDOERS_FILE="/etc/sudoers.d/ozikol-custom-domains"
cat <<'EOF' > "$SUDOERS_FILE"
# Allow www-data and app runner to execute domain provisioning and nginx reload without password
ALL ALL=(root) NOPASSWD: /usr/local/bin/ozikol-provision-domain
ALL ALL=(root) NOPASSWD: /usr/sbin/nginx -t
ALL ALL=(root) NOPASSWD: /usr/sbin/nginx -s reload
ALL ALL=(root) NOPASSWD: /bin/systemctl reload nginx
EOF

chmod 440 "$SUDOERS_FILE"
echo "--> Configured sudoers permissions: $SUDOERS_FILE"

echo "==================================================================="
echo " [SUCCESS] Auto Domain Provisioner Runner installed and ready!"
echo " Test command: sudo /usr/local/bin/ozikol-provision-domain <domain> <tenant>"
echo "==================================================================="
