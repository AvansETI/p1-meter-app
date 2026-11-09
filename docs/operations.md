# Operations runbook

Production: **https://p1-meter.sendlab.nl** → reverse proxy `10.0.0.51` (SSL offloading,
Let's Encrypt, HTTP → HTTPS) → LXC **`http://192.168.5.131:8080`**.
Design: [docs/design/2026-11-09-deployment.md](design/2026-11-09-deployment.md).

## How a change reaches production

1. A pull request `develop` → `main` is merged (CI must be green).
2. CI builds the package, verifies it with the server's update script (dry run) and publishes it
   to the rolling pre-release **`main-latest`** (`manifest.json` + `p1-meter-app-<sha>.tar.gz`).
3. Within ~2 minutes the timer on the LXC installs it, restarts the app and checks
   `/api/v1/health`. If the check fails, the previous release is restored automatically.

## First-time setup

On the LXC (Ubuntu LTS, outbound HTTPS to github.com, nodejs.org and influxdb.sendlab.nl):

```sh
curl -fsSLO https://raw.githubusercontent.com/AvansETI/p1-meter-app/main/scripts/deploy/install.sh
less install.sh                      # read it first
sudo bash install.sh
sudo nano /etc/p1-meter-app/env      # fill in INFLUX_TOKEN; INFLUX_URL = internal address
sudo p1-meter-update                 # install the current build now
```

From the LXC the public InfluxDB name is not reachable; use the internal address
(`INFLUX_URL=http://192.168.5.30:8086`). **The env file is read only at start**: after editing it,
run `sudo systemctl restart p1-meter-app`.

The install script is idempotent. It is only needed for the first setup: systemd units and the
update script are updated automatically with every deploy (logged as "updated …").
It never overwrites `/etc/p1-meter-app/env`.

## Everyday commands

| Task                         | Command                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| App logs (live)              | `journalctl -u p1-meter-app -f`                             |
| Update logs                  | `journalctl -u p1-meter-update -n 50`                       |
| Running version              | `readlink /opt/p1-meter-app/current`                        |
| Health                       | `curl -s http://127.0.0.1:8080/api/v1/health`               |
| Install newest build now     | `sudo p1-meter-update`                                      |
| Reinstall the running build  | `sudo p1-meter-update --force`                              |
| Back to the previous release | `sudo p1-meter-update --rollback`                           |
| Pause automatic updates      | `sudo systemctl stop p1-meter-update.timer` (`start` again) |
| Restart the app              | `sudo systemctl restart p1-meter-app`                       |
| After changing the env file  | `sudo systemctl restart p1-meter-app` (read only at start)  |
| Update the systemd units     | automatic with every deploy (`install.sh` only for setup)   |

The last three releases are kept in `/opt/p1-meter-app/releases/`.

## Database and backups

Tariffs are stored in SQLite: `/var/lib/p1-meter-app/p1.db` (systemd `StateDirectory`, survives
deploys and rollbacks). A copy is written daily to `/var/lib/p1-meter-app/backups/`; the
newest 14 are kept. To restore: stop the app, copy a backup over `p1.db` (remove `p1.db-wal` and
`p1.db-shm`), start the app. Single households can also restore an earlier version of their
tariffs in the app (Instellingen → Tarieven → Geschiedenis).

## Rotating the InfluxDB token

1. Create a new read-only token for bucket `p1-smartmeters` in InfluxDB.
2. `sudo nano /etc/p1-meter-app/env` → replace `INFLUX_TOKEN=…`.
3. `sudo systemctl restart p1-meter-app`, check `curl -s http://127.0.0.1:8080/api/v1/health`
   shows `"influx":"ok"`.
4. Revoke the old token.

Never paste the token in chats, issues or commits; edit the file on the server.

## Proxy caching

Keep asset caching **off** on the reverse proxy. The app sends its own cache headers (hashed
files in `assets/` are immutable for a year, everything else `no-cache`). With caching on, the
proxy stored a 502 from the few seconds of a restart during a deploy (v0.6.1) and kept serving it
for the stylesheet and `sw.js`, so the app hung on the splash screen. Check after a deploy:

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://p1-meter.sendlab.nl/sw.js   # 200
```

## Client IP (reverse proxy)

Rate limiting and the lock-out after failed EMON ID lookups work per client IP. The API trusts
`X-Forwarded-For` only from `TRUST_PROXY` (`10.0.0.51`). Check after deploying:

```sh
journalctl -u p1-meter-app -n 20 -o cat | grep remoteAddress
```

- `remoteAddress` must be `10.0.0.51` (the proxy) and `ip` the visitor's public IP.
- If `remoteAddress` is another address (NAT between proxy and LXC), set `TRUST_PROXY` to that
  address in `/etc/p1-meter-app/env` and restart the app.
- If `ip` equals `remoteAddress`, the proxy does not send `X-Forwarded-For` or `TRUST_PROXY`
  is wrong.

## Live updates (SSE)

The live page uses server-sent events. The API sends `X-Accel-Buffering: no`. If the live page
stays on "geen recente data" through the public URL but works on
`http://192.168.5.131:8080`, disable response buffering for this host in the proxy (for nginx:
`proxy_buffering off;` in the advanced settings).

## Troubleshooting

| Symptom                               | Check                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Update log: "INFLUX_TOKEN is empty"   | fill in the token in `/etc/p1-meter-app/env`                                                                                 |
| Update log: "checksum mismatch"       | download corrupted or release being replaced; the next run retries                                                           |
| Update log: "failed health check"     | `journalctl -u p1-meter-app -n 100` for the error; the previous release is running                                           |
| App log: "Invalid configuration"      | a value in `/etc/p1-meter-app/env` is wrong; the log names it                                                                |
| Health shows `"influx":"unavailable"` | outbound HTTPS to influxdb.sendlab.nl, or the token                                                                          |
| Health `prices`: `backoff`            | ENTSO-E or EnergyZero failed; retried after Retry-After or 1–24 h. `journalctl -u p1-meter-app -o cat \| grep 'backing off'` |
| Health `prices`: `retrying`           | writing to the price bucket failed (e.g. timeout during the InfluxDB backup); retried after 10 min                           |
