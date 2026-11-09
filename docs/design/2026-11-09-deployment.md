# Automatic deployment to the LXC container

- Issue: #14
- Status: **draft — awaiting approval**
- Date: 2026-11-09
- Builds on: [architecture](2026-11-09-architecture.md) §14

## 1. Goal

Every merge into `main` runs in production without manual steps:
**https://p1-meter.sendlab.nl** → reverse proxy (`10.0.0.51`, SSL offloading, Let's Encrypt,
HTTP → HTTPS) → **`http://192.168.5.131:8080`** (LXC, latest Ubuntu LTS).

## 2. Overview

```
 merge PR → main
        │
        ▼
 GitHub Actions (hosted)          GitHub Releases                       LXC 192.168.5.131
 ┌───────────────────────┐        ┌───────────────────────────┐        ┌──────────────────────────────┐
 │ ci (lint/test/build)  │──────▶ │ release "main-latest"     │ ◀──────│ p1-meter-update.timer (2 min) │
 │ package job:          │ upload │  manifest.json             │  poll  │  download + sha256 check      │
 │  pnpm deploy api      │        │  p1-meter-app-<sha>.tar.gz │ (HTTPS)│  install → restart → health   │
 │  + web dist + .nvmrc  │        └───────────────────────────┘        │  rollback when unhealthy      │
 └───────────────────────┘                                              │ p1-meter-app.service :8080    │
                                                                        └──────────────────────────────┘
```

Pull-based: the LXC only makes outbound HTTPS requests (GitHub, nodejs.org, InfluxDB). Nothing
needs to reach the container except the reverse proxy on port 8080. No self-hosted runner, no
deploy keys, no tokens (the repository is public).

## 3. Release package (CI)

New job `package` in `.github/workflows/ci.yml`, only on `push` to `main`, after `ci` passed:

1. `pnpm install --frozen-lockfile && pnpm build`.
2. `pnpm deploy --filter @p1/api --prod out/app/api` — the API with only its production
   dependencies (a self-contained `node_modules`).
3. Copy `apps/web/dist` → `out/app/web/dist`, `.nvmrc`, `LICENSE`, `NOTICE`.
4. `tar -czf p1-meter-app-<sha>.tar.gz -C out app`; `sha256sum` it.
5. `manifest.json`: `{ "sha", "version", "createdAt", "file", "sha256", "node": "<.nvmrc>" }`.
6. Publish to a single rolling GitHub release with tag **`main-latest`** (pre-release, not
   "latest"): the tag is moved to the new commit and the assets are replaced. Older packages
   are not kept on GitHub (the LXC keeps its own last 3).

Permissions: `contents: write` for this job only; actions pinned by SHA as before. Version
tags (`v0.1.0`, …) and their releases stay untouched.

## 4. On the LXC

### 4.1 Layout

| Path                                  | Owner / mode      | Content                                     |
| ------------------------------------- | ----------------- | ------------------------------------------- |
| `/opt/node/<version>/`                | root, 755         | official Node tarball(s), checksum verified |
| `/opt/p1-meter-app/releases/<sha>/`   | root, 755         | unpacked packages (last 3 kept)             |
| `/opt/p1-meter-app/current` → release | symlink           | the running version                         |
| `/etc/p1-meter-app/env`               | root:p1meter, 640 | environment incl. `INFLUX_TOKEN`            |
| `/usr/local/sbin/p1-meter-update`     | root, 755         | update script                               |

### 4.2 Environment (`/etc/p1-meter-app/env`)

```
NODE_ENV=production
API_HOST=0.0.0.0
API_PORT=8080
LOG_LEVEL=info
WEB_DIST=/opt/p1-meter-app/current/web/dist
TRUST_PROXY=10.0.0.51
INFLUX_URL=https://influxdb.sendlab.nl
INFLUX_ORG=Sendlab
INFLUX_BUCKET=p1-smartmeters
INFLUX_TOKEN=            # filled in by the product owner on the LXC only
```

### 4.3 Service `p1-meter-app.service`

- `User=p1meter` (system user, no shell, no home), `EnvironmentFile=/etc/p1-meter-app/env`.
- `ExecStart=/opt/node/current/bin/node /opt/p1-meter-app/current/api/dist/index.mjs`.
- `Restart=on-failure`, logs to journald.
- Hardening: `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`,
  `PrivateDevices`, `ProtectKernel*`, `RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX`,
  `CapabilityBoundingSet=` (port 8080 needs no privileges), `MemoryMax=512M`.

### 4.4 Update `p1-meter-update.service` + `.timer`

Timer every 2 minutes (and 1 minute after boot). The oneshot service runs
`/usr/local/sbin/p1-meter-update` as root:

1. Fetch `manifest.json` from the `main-latest` release (GitHub API, HTTPS, timeout).
2. Same `sha` as `current` → exit.
3. Download the package, verify `sha256` against the manifest; mismatch → abort.
4. Node version from the manifest not in `/opt/node/<version>` → download from nodejs.org,
   verify against `SHASUMS256.txt`, install, point `/opt/node/current` to it.
5. Unpack to `releases/<sha>`, switch `current`, `systemctl restart p1-meter-app`.
6. Health check: `GET http://127.0.0.1:8080/api/v1/health` must return 200 within 30 s.
   Fails → switch `current` back to the previous release, restart, log an error.
7. Keep the 3 newest releases, delete older ones.

A lock file prevents overlapping runs. Everything is logged to journald
(`journalctl -u p1-meter-update`).

Integrity: the package is fetched over HTTPS from GitHub and checked against the checksum in
the manifest from the same release. This protects against corrupted downloads, not against a
compromised GitHub account; signing (e.g. artifact attestations) is a possible later
improvement.

## 5. Install script (`scripts/deploy/install.sh`)

Run once by the product owner on the LXC: `sudo bash install.sh`. Idempotent (safe to rerun).

1. Check: Ubuntu, systemd, root, outbound HTTPS to github.com, nodejs.org and the InfluxDB.
2. `apt-get install -y curl ca-certificates xz-utils jq`.
3. Create system user `p1meter`.
4. Create directories (§4.1); write `/etc/p1-meter-app/env` from a template **only if it does
   not exist yet** (never overwrites the token).
5. Install the update script, service, timer; `systemctl enable --now p1-meter-update.timer`.
6. Print the next steps: fill in `INFLUX_TOKEN`, run `sudo p1-meter-update` once, check logs.

The script and unit files live in `scripts/deploy/` and are part of the repository; the
install command downloads them from the `main` branch on GitHub.

## 6. Reverse proxy and client IP

- The proxy at `10.0.0.51` forwards to `192.168.5.131:8080`; `TRUST_PROXY=10.0.0.51` lets the
  API use `X-Forwarded-For` for rate limiting and lock-out.
- The two are on different subnets. If a router does NAT in between, requests arrive from the
  router's address instead. To verify, the request log also records the raw socket address
  (`remoteAddress`) next to the resolved client IP; after the first deploy we compare and
  adjust `TRUST_PROXY` if needed.
- SSE: the API sends `X-Accel-Buffering: no`; if the live page stays "stale" behind the
  proxy, disable proxy buffering for this host in the proxy settings.
- Optional hardening: allow port 8080 only from `10.0.0.51` (`ufw`), so nobody bypasses the
  proxy. Offered by the install script as a question, default **on**.

## 7. Runbook (`docs/operations.md`)

Install, first start, logs (`journalctl -u p1-meter-app -f`), update status, manual update
(`sudo p1-meter-update`), manual rollback (`sudo p1-meter-update --rollback`), rotating the
InfluxDB token, checking the client IP.

## 8. Testing

- Update script: `shellcheck` in CI; a dry-run mode (`--dry-run`) used in CI to validate the
  manifest/package from the build.
- First real deploy together: run the install script, fill in the token, trigger an update,
  open https://p1-meter.sendlab.nl, check live updates (SSE) and the logged client IP.
- Rollback test: deploy a package whose health check fails (`P1_FORCE_UNHEALTHY` in a test
  run) and confirm the previous release comes back.

## 9. Open points

| #   | Topic                           | Proposal                      |
| --- | ------------------------------- | ----------------------------- |
| 1   | NAT between proxy and LXC       | Verify on first deploy (§6)   |
| 2   | Package signing                 | Later (artifact attestations) |
| 3   | Notifications on failed deploys | Later; for now journald       |
