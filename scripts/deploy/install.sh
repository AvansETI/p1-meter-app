#!/usr/bin/env bash
# One-time (and safely repeatable) setup of the production LXC for MNEXT Energiemeter.
# See docs/operations.md. Run on the server:
#
#   curl -fsSLO https://raw.githubusercontent.com/AvansETI/p1-meter-app/main/scripts/deploy/install.sh
#   sudo bash install.sh
#
# It never overwrites /etc/p1-meter-app/env, so an existing InfluxDB token is kept.
set -euo pipefail

REF="${P1_REF:-main}"
RAW="https://raw.githubusercontent.com/AvansETI/p1-meter-app/$REF/scripts/deploy"
PROXY_IP="${P1_PROXY_IP:-10.0.0.51}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { echo "==> $*"; }
warn() { echo "!!  $*" >&2; }
die() {
  echo "ERROR: $*" >&2
  exit 1
}

[ "$(id -u)" -eq 0 ] || die "run with sudo"
command -v systemctl >/dev/null || die "systemd is required"
# shellcheck disable=SC1091
. /etc/os-release
[ "${ID:-}" = ubuntu ] || warn "tested on Ubuntu; this is ${PRETTY_NAME:-unknown}"

# Files come from next to this script when present (repo checkout), otherwise from GitHub.
fetch() {
  if [ -f "$SCRIPT_DIR/$1" ]; then cp "$SCRIPT_DIR/$1" "$2"; else curl -fsSL "$RAW/$1" -o "$2"; fi
}

say "Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates xz-utils jq >/dev/null

say "Checking outbound connections"
for url in https://api.github.com https://nodejs.org/dist/; do
  if curl -fsS --max-time 10 -o /dev/null "$url"; then echo "    ok   $url"; else warn "cannot reach $url"; fi
done

say "Creating user and directories"
id p1meter >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin p1meter
install -d -m 755 /opt/p1-meter-app /opt/p1-meter-app/releases /opt/node
install -d -m 750 -o root -g p1meter /etc/p1-meter-app

if [ -f /etc/p1-meter-app/env ]; then
  say "Keeping existing /etc/p1-meter-app/env"
else
  say "Creating /etc/p1-meter-app/env (fill in INFLUX_TOKEN!)"
  fetch env.template /etc/p1-meter-app/env
  sed -i "s/^TRUST_PROXY=.*/TRUST_PROXY=$PROXY_IP/" /etc/p1-meter-app/env
  chown root:p1meter /etc/p1-meter-app/env
  chmod 640 /etc/p1-meter-app/env
fi

# InfluxDB as the app will reach it: the URL from the env file (often an internal address).
influx_url="$(grep -oP '^INFLUX_URL=\K.*' /etc/p1-meter-app/env || true)"
if [ -n "$influx_url" ]; then
  if curl -fsS --max-time 10 -o /dev/null "$influx_url/ping"; then
    echo "    ok   $influx_url/ping"
  else
    warn "cannot reach $influx_url/ping (INFLUX_URL in /etc/p1-meter-app/env)"
  fi
fi

say "Installing update script and systemd units"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
for f in p1-meter-update p1-meter-app.service p1-meter-update.service p1-meter-update.timer; do
  fetch "$f" "$tmp/$f"
done
install -m 755 "$tmp/p1-meter-update" /usr/local/sbin/p1-meter-update
install -m 644 "$tmp/p1-meter-app.service" "$tmp/p1-meter-update.service" \
  "$tmp/p1-meter-update.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable p1-meter-app.service >/dev/null
systemctl enable --now p1-meter-update.timer >/dev/null

if command -v ufw >/dev/null; then
  answer="${P1_UFW:-}"
  if [ -z "$answer" ]; then
    read -r -p "Allow port 8080 only from the reverse proxy ($PROXY_IP) with ufw? [Y/n] " answer || true
  fi
  if [[ ! "$answer" =~ ^[Nn] ]]; then
    say "Configuring ufw: SSH open, 8080 only from $PROXY_IP"
    if ufw allow OpenSSH >/dev/null && ufw allow from "$PROXY_IP" to any port 8080 proto tcp >/dev/null &&
      ufw --force enable >/dev/null; then
      ufw status | sed 's/^/    /'
    else
      warn "ufw could not be configured (common in unprivileged containers); restrict 8080 on the host instead"
    fi
  fi
fi

# Only list what is still needed.
steps=()
grep -qE '^INFLUX_TOKEN=.+' /etc/p1-meter-app/env ||
  steps+=("Put the read-only InfluxDB token in /etc/p1-meter-app/env:\n       sudo nano /etc/p1-meter-app/env        (INFLUX_TOKEN=...)")
[ -L /opt/p1-meter-app/current ] ||
  steps+=("Install the current build now (the timer would do it within 2 minutes):\n       sudo p1-meter-update")

echo
if [ ${#steps[@]} -eq 0 ]; then
  echo "Done. Everything is set up; new builds of main are installed automatically."
else
  echo "Done. Next steps:"
  for i in "${!steps[@]}"; do printf "  %d. %b\n" "$((i + 1))" "${steps[$i]}"; done
fi
echo "Logs: journalctl -u p1-meter-app -u p1-meter-update -f"
