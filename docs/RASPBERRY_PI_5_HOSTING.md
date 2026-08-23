# Hosting FIR Saathi on a Raspberry Pi 5

This guide deploys the **existing FIR Saathi Express/React application** on a Raspberry Pi 5 with 8 GB RAM. The Pi runs the website and its server-side API only. **Supabase remains the database, authentication, and encrypted-evidence storage provider; Groq remains the drafting and transcription provider.** No PostgreSQL, MySQL, Docker, or local AI model is installed on the Pi.

> **Prototype boundary.** FIR Saathi is a demonstration workflow. Do not use this deployment to receive real emergency reports, legal complaints, or sensitive evidence unless its security, privacy, retention, accessibility, and legal controls have been independently reviewed.

## 1. What you will build

The recommended setup is a small, maintainable native deployment. `systemd` keeps FIR Saathi running after reboots, while Caddy terminates HTTPS and forwards requests only to the local Node server.

```text
Citizen browser
      │ HTTPS :443
      ▼
Domain DNS → home router → Raspberry Pi 5
                              │
                              ▼
                        Caddy reverse proxy
                              │ HTTP 127.0.0.1:3000
                              ▼
                   FIR Saathi Node/Express server
                         │                 │
                         ▼                 ▼
                 Supabase cloud        Groq cloud
        data/auth/private evidence   drafting/transcription
```

| Component | Runs on the Pi? | Notes |
|---|---:|---|
| FIR Saathi React build and Express/tRPC server | Yes | Native Node.js process managed by `systemd`. |
| HTTPS certificates and reverse proxy | Yes | Caddy manages this. |
| Supabase database, Auth, and evidence bucket | No | Keep the existing hosted Supabase project. |
| Groq drafting and transcription | No | Keep the existing Groq API account and key. |
| Local database or AI model | No | Do not install either for this architecture. |

The Pi 5 is suitable because Groq performs the expensive AI inference remotely and Supabase hosts the data layer. The Pi still needs stable power, cooling, reliable storage, and an internet connection.

## 2. Before you start

You need the following before exposing the app publicly.

| Requirement | Why it is needed |
|---|---|
| Raspberry Pi OS **64-bit** | Raspberry Pi documents that its 64-bit OS supports Pi 5-class 64-bit hardware.[1] |
| A domain name, for example `fir.example.com` | Required for publicly trusted HTTPS certificates. |
| Router access | To reserve the Pi’s LAN address and forward TCP ports 80 and 443. |
| Publicly reachable IP address | Direct HTTPS requires DNS to reach your router. If your ISP uses CGNAT, use a reverse-tunnel product or request a public IP instead of attempting port forwarding. |
| Existing private GitHub repository access | The FIR Saathi repository is private; use a read-only deploy key on the Pi. |
| Existing Supabase project and Groq key | These are the external services the application needs. |
| Reliable power and storage | Prefer the official Pi power supply and an SSD or high-quality storage; unexpected power loss can corrupt a microSD card. |

Run these first to confirm the Pi is running a 64-bit OS and to note its LAN address:

```bash
uname -m                 # expected: aarch64
cat /etc/os-release
hostname -I
```

If `uname -m` returns `armv7l`, reinstall Raspberry Pi OS 64-bit before continuing. Do not expose the service to the internet until the domain, firewall, updates, and HTTPS steps below are complete.

## 3. Base operating-system setup

Create a dedicated non-login service account. This separates the application from the default `pi` account and keeps application files in `/srv/fir-saathi`.

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl git build-essential ufw

sudo adduser --system --group --home /srv/fir-saathi --shell /bin/bash firsaathi
sudo install -d -o firsaathi -g firsaathi -m 0750 /srv/fir-saathi
```

Set a DHCP reservation for the Pi in the router now. For example, reserve `192.168.1.50` for the Pi’s Ethernet MAC address. A reservation is safer than hard-coding a static address on the operating system and prevents router port-forwarding rules from silently pointing to the wrong device after a reboot.

## 4. Install Node.js and pnpm for the service account

FIR Saathi builds with Node tooling and starts as a Node process. npm recommends a Node version manager such as `nvm` on Linux; it avoids global npm-permission problems.[2] The commands below install the current Node 22 line for the dedicated service user and activate the repository’s pnpm version.

```bash
sudo -u firsaathi -H bash -lc '
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  . "$NVM_DIR/nvm.sh"
  nvm install 22
  nvm alias default 22
  corepack enable
  corepack prepare pnpm@10.4.1 --activate
  node --version
  pnpm --version
'
```

> Before running any internet-downloaded installer, inspect its URL and ensure it is the intended upstream project. If you prefer system-wide Node packages, follow the Node/npm Linux installer guidance instead.[2]

## 5. Give the Pi read-only repository access and clone FIR Saathi

Do **not** put your personal GitHub password or a broad personal access token on the Pi. Create a repository-specific, read-only deploy key.

```bash
sudo -u firsaathi -H ssh-keygen -t ed25519 -C "fir-saathi-pi" \
  -f /srv/fir-saathi/.ssh/id_ed25519 -N ""

sudo -u firsaathi -H cat /srv/fir-saathi/.ssh/id_ed25519.pub
```

In GitHub, open the private `khushitpratikshah/fir-saathi` repository, then go to **Settings → Deploy keys → Add deploy key**. Paste the printed public key, name it `Raspberry Pi 5`, and leave **Allow write access** disabled. Then clone the repository as the service user:

```bash
sudo -u firsaathi -H bash -lc '
  ssh-keyscan github.com >> ~/.ssh/known_hosts
  git clone git@github.com:khushitpratikshah/fir-saathi.git /srv/fir-saathi/app
  cd /srv/fir-saathi/app
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22
  pnpm install --frozen-lockfile
'
```

The repository’s production commands are `pnpm build` followed by `pnpm start`. The build creates the browser assets and bundles the server; the start command runs `node dist/index.js` in production mode.

## 6. Create the server-only environment file

Create `/etc/fir-saathi.env`. Never commit this file, place it inside the repository, paste it into screenshots, or send it through chat. It contains the **Groq API key** and the **Supabase service-role key**.

```bash
sudo nano /etc/fir-saathi.env
```

Use this template, replacing every placeholder with the values from your existing Groq and Supabase project:

```dotenv
NODE_ENV=production
PORT=3000

# Groq: server only
GROQ_API_KEY=replace_with_your_groq_api_key

# Supabase: server only
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace_with_service_role_key
FIR_SAATHI_BOOTSTRAP_ADMIN_EMAIL=your-approved-admin@example.com

# Supabase browser configuration: public by design; compiled at build time
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=replace_with_publishable_key
```

Lock down the file so only root and the service account group can read it:

```bash
sudo chown root:firsaathi /etc/fir-saathi.env
sudo chmod 0640 /etc/fir-saathi.env
```

> **Important:** `SUPABASE_SERVICE_ROLE_KEY` and `GROQ_API_KEY` must never use a `VITE_` prefix. Vite exposes `VITE_` variables to browser code during the build. Supabase explicitly warns never to expose service-role or secret keys in the frontend.[3]

Because the two `VITE_SUPABASE_*` values are compiled into the browser bundle, run the first build **after** creating the environment file and rerun it whenever those values change:

```bash
sudo -u firsaathi -H bash -lc '
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22 --silent
  set -a; . /etc/fir-saathi.env; set +a
  cd /srv/fir-saathi/app
  pnpm build
'
```

All other variables are read by the server process from `/etc/fir-saathi.env` at startup.

## 7. Configure Supabase for your real domain

Before testing sign-in or password reset, open the Supabase dashboard for the existing project:

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to `https://fir.example.com`.
3. Add `https://fir.example.com/reset-password` to the allowed redirect URLs.
4. Keep your local development URL(s) as additional redirect URLs only if you still use them.

Supabase documents that Site URL is the default redirect location when no explicit `redirectTo` value is provided, and calls it critical for email confirmations and password resets.[4]

The deployment assumes the FIR Saathi Supabase migrations and private `fir-saathi-evidence` bucket already exist. Do not create a local database on the Pi. If you are setting up a fresh Supabase project, apply the repository’s migrations from a trusted administration machine before exposing the Pi.

## 8. Create a systemd service

The application server should listen only on local port `3000`; Caddy will be the only process exposed to the network. Create a small startup wrapper so systemd can load the service account’s `nvm` Node installation reliably.

```bash
sudo install -d -o firsaathi -g firsaathi -m 0750 /srv/fir-saathi/app/bin
sudo nano /srv/fir-saathi/app/bin/start-production.sh
```

Paste:

```bash
#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="/srv/fir-saathi/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22 --silent

cd /srv/fir-saathi/app
exec pnpm start
```

Make it executable and create the service file:

```bash
sudo chown firsaathi:firsaathi /srv/fir-saathi/app/bin/start-production.sh
sudo chmod 0750 /srv/fir-saathi/app/bin/start-production.sh
sudo nano /etc/systemd/system/fir-saathi.service
```

Paste this unit:

```ini
[Unit]
Description=FIR Saathi web server
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=firsaathi
Group=firsaathi
WorkingDirectory=/srv/fir-saathi/app
EnvironmentFile=/etc/fir-saathi.env
ExecStart=/srv/fir-saathi/app/bin/start-production.sh
Restart=on-failure
RestartSec=5
TimeoutStopSec=20
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/srv/fir-saathi/app

[Install]
WantedBy=multi-user.target
```

Enable and inspect it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fir-saathi
sudo systemctl status fir-saathi --no-pager
curl -I http://127.0.0.1:3000
```

If `curl` succeeds locally, the Node application is running. Do not open port 3000 in the router or firewall.

## 9. Install Caddy and configure HTTPS

Install Caddy using its current official package instructions for Debian-based Linux, or use the distribution package if it is available:

```bash
sudo apt update
sudo apt install -y caddy
```

If `apt` cannot find Caddy, use the current instructions at the official Caddy install page rather than copying an unverified third-party repository command.[5]

Create the Caddy configuration:

```bash
sudo nano /etc/caddy/Caddyfile
```

Replace the file with this, substituting your actual domain:

```caddyfile
fir.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

Validate and enable it:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy’s reverse-proxy documentation confirms that a Caddyfile can proxy to a local HTTP backend and that, when configured with a real hostname, Caddy automatically obtains and renews publicly trusted HTTPS certificates if DNS points to the machine and ports 80 and 443 are reachable.[6]

## 10. DNS, router, and firewall configuration

At your DNS provider, create an `A` record for the hostname, for example:

```text
fir.example.com  A  YOUR_PUBLIC_IPV4_ADDRESS
```

If you intentionally use IPv6, add an `AAAA` record only after confirming the Pi and router firewall accept inbound TCP 80 and 443 over IPv6 as well.

In the home router, forward only these ports to the Pi’s **reserved LAN address**:

| WAN port | Protocol | Pi destination | Purpose |
|---:|---|---|---|
| 80 | TCP | `192.168.1.50:80` | Caddy HTTP validation and HTTPS redirect. |
| 443 | TCP | `192.168.1.50:443` | Public HTTPS traffic. |

Configure the Pi firewall after allowing SSH first. Keep an existing SSH session open while enabling UFW, so an incorrect rule does not lock you out.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Do **not** forward or allow port 3000, the Supabase service-role key, SSH from the entire internet, a database port, or the Caddy admin API. Prefer SSH access from your LAN or a VPN such as Tailscale/WireGuard.

If the ISP uses carrier-grade NAT (CGNAT), DNS may point to your router but connections will never reach it. In that case, use a reputable reverse tunnel or obtain a public IP; do not weaken the firewall or expose port 3000 as a workaround.

## 11. First production test

After DNS propagation and port forwarding, test from a network that is **not** your home Wi-Fi (for example, mobile data):

```bash
curl -I https://fir.example.com
```

Then manually test the full prototype path:

1. Open the landing page over HTTPS and confirm there is no browser certificate warning.
2. Create a harmless synthetic text intake in one of the supported languages.
3. Confirm that the source text remains separate from optional context.
4. Test a sign-in and password-reset email, then verify the return URL is your HTTPS domain.
5. Confirm that Groq drafting works without exposing its key in browser developer tools.
6. Confirm that a constable can review a synthetic record and that the citizen status screen does not claim an FIR was registered.

Useful log commands:

```bash
sudo journalctl -u fir-saathi -f
sudo journalctl -u caddy -f
sudo systemctl status fir-saathi caddy --no-pager
```

## 12. Safe updates and rollback

Perform updates over SSH. Never edit `/etc/fir-saathi.env` inside the Git repository, and never use `git reset --hard` as a routine update method.

```bash
sudo -u firsaathi -H bash -lc '
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22 --silent
  cd /srv/fir-saathi/app
  git fetch origin
  git pull --ff-only origin main
  pnpm install --frozen-lockfile
  set -a; . /etc/fir-saathi.env; set +a
  pnpm test
  pnpm check
  pnpm build
'

sudo systemctl restart fir-saathi
sudo systemctl status fir-saathi --no-pager
curl -I https://fir.example.com
```

Before an update, record the current commit so you can return to it if the new version fails:

```bash
sudo -u firsaathi -H git -C /srv/fir-saathi/app rev-parse HEAD
```

To roll back, check out that known-good commit, reinstall dependencies if the lockfile changed, rebuild, and restart `fir-saathi`.

## 13. Backups and operations

The Pi does not hold the main complaint database or evidence objects. Your operational backup plan should therefore cover **both** the Pi configuration and the external Supabase project.

| Item | Suggested protection |
|---|---|
| `/etc/fir-saathi.env` | Encrypted offline backup; never store it in Git. Rotate any exposed key immediately. |
| GitHub deploy key | Keep a secure backup or create a new key if the Pi is replaced. Remove the old key from GitHub when retiring the device. |
| Supabase database and private evidence bucket | Use Supabase’s backup/export and retention controls. The Pi cannot replace these backups. |
| Router/DNS settings | Record the reserved LAN IP, port forwards, domain, and registrar account recovery details. |
| Power and uptime | Use a quality supply; consider a UPS if service continuity matters. Monitor `systemctl` status and disk free space. |

Review the following monthly: Raspberry Pi OS updates, Node version, system logs, UFW rules, Caddy certificate status, Supabase project status, Groq usage limits, deploy keys, and all server-side secrets. Rotate `GROQ_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` immediately if either might have been exposed.

## 14. Troubleshooting

| Symptom | Check | Likely fix |
|---|---|---|
| `fir-saathi` will not start | `sudo journalctl -u fir-saathi -n 100 --no-pager` | Check `/etc/fir-saathi.env`, Node 22 availability for `firsaathi`, and that `pnpm build` completed. |
| Caddy returns 502 | `curl -I http://127.0.0.1:3000` and `systemctl status fir-saathi` | Restore the Node service first; Caddy can only proxy to a running local server. |
| HTTPS certificate fails | `sudo journalctl -u caddy -n 100 --no-pager` | Confirm DNS resolves publicly to the correct WAN IP and TCP 80/443 reach the Pi. |
| Sign-in/reset link returns to localhost | Supabase **Authentication → URL Configuration** | Set Site URL and exact production redirect URL as described in section 7. |
| Groq drafting/transcription fails | `journalctl -u fir-saathi -f` | Verify server-only `GROQ_API_KEY`, outbound internet access, and Groq account status; do not move the key into browser variables. |
| Supabase data/evidence calls fail | Server logs and Supabase dashboard | Verify `SUPABASE_URL`, service-role key, migrations, RLS, and private bucket configuration. |
| Site works on home Wi-Fi but not mobile data | Test public DNS and router settings | Check port forwards, firewall, CGNAT, and hairpin-NAT differences. |

## References

[1] [Raspberry Pi Documentation, *Raspberry Pi OS*](https://www.raspberrypi.com/documentation/computers/os.html)

[2] [npm Docs, *Downloading and installing Node.js and npm*](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/)

[3] [Supabase Docs, *Securing your data*](https://supabase.com/docs/guides/database/secure-data)

[4] [Supabase Docs, *Redirect URLs*](https://supabase.com/docs/guides/auth/redirect-urls)

[5] [Caddy Documentation, *Install Caddy*](https://caddyserver.com/docs/install)

[6] [Caddy Documentation, *Reverse proxy quick-start*](https://caddyserver.com/docs/quick-starts/reverse-proxy)
