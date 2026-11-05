#!/usr/bin/env bash
# ==============================================================================
# Ozikol Business Command Center (Ozikol BCC) — Linux UFW Firewall Lockdown
# ==============================================================================
# Blocks all public internet access (0.0.0.0/0) to:
#   - Port 1433 (SQL Server)
#   - Port 6379 (Redis / Valkey / Garnet)
# While allowing strictly:
#   - Loopback (127.0.0.1)
#   - Private VPC subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
#   - HTTP/HTTPS (80, 443) for Cloudflare CDN/WAF ingress
#
# Usage:
#   sudo bash scripts/security/lockdown-firewall.sh [OPTIONAL_TRUSTED_APP_SERVER_IP]
# ==============================================================================

set -euo pipefail

TRUSTED_APP_IP="${1:-}"

echo "==================================================================="
echo " Ozikol BCC - Linux UFW Firewall Hardening (SQL 1433 & Redis 6379)"
echo "==================================================================="

# 1. Default policies: deny all unsolicited incoming, allow outgoing
ufw default deny incoming
ufw default allow outgoing

# 2. Explicitly deny public access to SQL Server (1433) and Redis (6379)
#    and allow only loopback + private VPC CIDR blocks
ufw allow from 127.0.0.1 to any port 1433 proto tcp comment 'Ozikol BCC SQL Loopback'
ufw allow from 10.0.0.0/8 to any port 1433 proto tcp comment 'Ozikol BCC SQL Private VPC 10.x'
ufw allow from 172.16.0.0/12 to any port 1433 proto tcp comment 'Ozikol BCC SQL Private VPC 172.16.x'
ufw allow from 192.168.0.0/16 to any port 1433 proto tcp comment 'Ozikol BCC SQL Private VPC 192.168.x'

ufw allow from 127.0.0.1 to any port 6379 proto tcp comment 'Ozikol BCC Redis Loopback'
ufw allow from 10.0.0.0/8 to any port 6379 proto tcp comment 'Ozikol BCC Redis Private VPC 10.x'
ufw allow from 172.16.0.0/12 to any port 6379 proto tcp comment 'Ozikol BCC Redis Private VPC 172.16.x'
ufw allow from 192.168.0.0/16 to any port 6379 proto tcp comment 'Ozikol BCC Redis Private VPC 192.168.x'

if [[ -n "$TRUSTED_APP_IP" ]]; then
    echo "Adding trusted application node IP: $TRUSTED_APP_IP"
    ufw allow from "$TRUSTED_APP_IP" to any port 1433 proto tcp comment 'Ozikol BCC SQL Trusted Node'
    ufw allow from "$TRUSTED_APP_IP" to any port 6379 proto tcp comment 'Ozikol BCC Redis Trusted Node'
fi

# 3. Allow Web Ingress (80/443) and SSH (rate-limited against brute-force)
ufw allow 80/tcp comment 'HTTP Cloudflare Ingress'
ufw allow 443/tcp comment 'HTTPS Cloudflare Ingress'
ufw limit 22/tcp comment 'SSH Rate-Limited'

echo "Firewall rules staged. Run 'sudo ufw enable' and 'sudo ufw status numbered' to activate and verify."

