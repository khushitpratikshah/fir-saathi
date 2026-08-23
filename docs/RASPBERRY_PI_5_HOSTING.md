# Hosting FIR Saathi on a Raspberry Pi 5

This guide deploys the **existing FIR Saathi Express/React application** on a Raspberry Pi 5 with 8 GB RAM. The Pi runs the website and its server-side API only. **Supabase remains the database, authentication, and encrypted-evidence storage provider; Groq remains the drafting and transcription provider.** No PostgreSQL, MySQL, Docker, local AI model, Caddy, public IP, router port-forwarding, or inbound web port is required.

> **Prototype boundary.** FIR Saathi is a demonstration workflow. Do not use this deployment to receive real emergency reports, legal complaints, or sensitive evidence unless its security, privacy, retention, accessibility, and legal controls have been independently reviewed.

## 1. What you will build

The recommended setup is a small, maintainable native deployment. `systemd` keeps FIR Saathi and the Cloudflare connector running after reboots. `cloudflared` creates an **outbound-only** connection from the Pi to Cloudflare; Cloudflare serves HTTPS at your domain and forwards traffic through that tunnel to the local Node server.

```text
Citizen browser
      │ HTTPS
      ▼
Your domain on Cloudflare
      │ Cloudflare Tunnel
      ▼
Raspberry Pi 5 → cloudflared → HTTP 127.0.0.1:3000
                                     │
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
| Public HTTPS and tunnel edge | Cloudflare | Cloudflare manages the public certificate and hostname. |
| Cloudflare connector | Yes | `cloudflared` makes an outbound tunnel to the local server. |
| Supabase database, Auth, and evidence bucket | No | Keep the existing hosted Supabase project. |
| Groq drafting and transcription | No | Keep the existing Groq API account and key. |
| Local database or AI model | No | Do not install either for this architecture. |

The Pi 5 is suitable because Groq performs the expensive AI inference remotely and Supabase hosts the data layer. The Pi still needs stable power, cooling, reliable storage, and an internet connection.

## 2. Before you start

You need the following before exposing the app publicly.

| Requirement | Why it is needed |
|---|---|
| Raspberry Pi OS **64-bit** | Raspberry Pi documents that its 64-bit OS supports Pi 5-class 64-bit hardware.[1] |
| A domain on Cloudflare, for example `fir.example.com` | Cloudflare Tunnel creates a published hostname within an active Cloudflare zone. |
| Router access | Only to reserve the Pi’s LAN address if you want predictable local SSH access. No web port forwarding is needed. |
| Outbound internet access from the Pi | `cloudflared` needs to reach Cloudflare; Cloudflare notes that restrictive firewalls should allow outbound port 7844.[5] |
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

Use the exact Supabase project URL **without a trailing slash** for both URL variables. For example, use `https://project-ref.supabase.co`, not `https://project-ref.supabase.co/`. The FIR Saathi configuration check intentionally rejects the trailing-slash form.

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

### Configure email delivery before testing sign-up

Supabase's built-in email provider is for demos only. It sends only to addresses pre-authorized as members of the Supabase organization and is currently limited to two messages per hour; it is not suitable for ordinary account confirmation or password-reset delivery.[7] This is why an account can be created successfully without any confirmation email appearing in the inbox.

For a quick prototype check, ensure the destination address is a member of the Supabase project's organization and wait for any rate-limit window to clear. For a real hosted flow, configure a custom SMTP provider:

1. Use an SMTP-capable transactional mail provider and verify a sender domain or sender address that you control.
2. In Supabase, open **Authentication → Emails → SMTP settings**.
3. Enable custom SMTP and enter the provider's SMTP host, port, username, password, From address, and sender name.
4. Keep email confirmation enabled; do not disable it merely to work around delivery problems.
5. Review **Authentication → Rate Limits** after custom SMTP is working and enable CAPTCHA before opening public sign-up.

Treat the SMTP password as a secret. Store it only in Supabase's SMTP settings, not in the Raspberry Pi's `/etc/fir-saathi.env`, source repository, browser code, or chat. The existing unconfirmed user can be removed from **Authentication → Users** and recreated after delivery is configured, or you can use Supabase's user-management controls to resend confirmation from the dashboard.

### Recommended free option: Resend

For a low-volume prototype, Resend is the simpler current free option: its Free plan allows up to 100 emails per day.[8] SendGrid's no-cost offering is a time-limited trial rather than a permanent free SMTP tier, so use Resend unless you specifically need SendGrid.[9]

1. Create a Resend account and choose **Domains → Add Domain**.
2. Add a subdomain dedicated to application mail, for example `mail.yourdomain.com`. This does not need to be the same hostname as the Cloudflare Tunnel site.
3. Copy the DNS records Resend displays into **Cloudflare → DNS**. Keep them as **DNS only** records; do not proxy mail-related records through Cloudflare. Wait until Resend marks the domain as verified.
4. In Resend, create an API key restricted to sending email and store it in a password manager. This API key is the SMTP password.
5. In **Supabase → Authentication → Emails → SMTP settings**, enable custom SMTP and enter:

| Supabase field | Resend value |
|---|---|
| Sender email | `no-reply@mail.yourdomain.com` or another address on the verified Resend domain |
| Sender name | `FIR Saathi` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | The Resend API key |

6. Save the Supabase SMTP settings. Then delete the unconfirmed **test** account and sign up once again to send a fresh confirmation message.

Resend's Supabase guide specifies `smtp.resend.com`, port `465`, username `resend`, and the Resend API key as the SMTP password.[10] Never put the Resend key in `/etc/fir-saathi.env`; Supabase, not the Pi application, sends confirmation emails.

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

## 9. Create the Cloudflare Tunnel and publish your domain

First, make sure your domain is an **active Cloudflare zone**. If you purchased it elsewhere, add the domain to Cloudflare and change the registrar nameservers to the pair Cloudflare gives you. Do not create a public `A` or `AAAA` record pointing at your home IP for this application.

In the Cloudflare dashboard:

1. Open **Networking → Tunnels** and choose **Create a tunnel**.
2. Name it `fir-saathi-pi`.
3. Choose **Linux** and copy the installation command Cloudflare displays for the connector. The command contains a private tunnel token; run it only in your Pi’s SSH session and never store or share the token in the repository.
4. After the connector shows **Healthy**, open that tunnel’s **Routes** tab and choose **Add route → Published application**.
5. Use a hostname such as `fir.yourdomain.com` and set **Service URL** to `http://127.0.0.1:3000`.
6. Save the route. Cloudflare creates the required DNS route for the tunnel.

Cloudflare documents that a published application maps a public hostname to a local service URL, and that the dashboard creates the DNS route for that hostname.[5] A remotely managed tunnel requires only its tunnel token to run, so treat that token as a server secret.[6]

For Raspberry Pi OS ARM64, use the **exact connector-install command shown by the Cloudflare dashboard**. It installs or configures the correct `cloudflared` build and normally registers it as a Linux service. After it completes, verify the connector:

```bash
sudo systemctl status cloudflared --no-pager
sudo journalctl -u cloudflared -f
```

> Do not use a Quick Tunnel (`trycloudflare.com`) for FIR Saathi. Cloudflare identifies Quick Tunnels as development-only and limits their features and concurrent connections.[5]

## 10. Firewall and domain security with Cloudflare Tunnel

Cloudflare Tunnel removes the need to open TCP 80, 443, or 3000 on the Pi or router. Keep the Pi inbound firewall closed except for the LAN-only management path you choose. Configure UFW after allowing SSH first, and keep the current SSH session open while enabling it.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw enable
sudo ufw status verbose
```

Replace `192.168.1.0/24` with your own LAN range. If you use Tailscale or WireGuard for administration, permit SSH only from that private network instead. **Do not add UFW rules or router port forwards for 80, 443, or 3000.** The Pi initiates an outbound connection to Cloudflare instead.

For an additional protection layer, configure **Cloudflare Access** before public testing if the site should be restricted to a small group. If the citizen-facing prototype must stay public, at minimum enable Cloudflare’s standard security settings and use strong Cloudflare account authentication.

## 11. First production test

After the tunnel route is healthy, test from a network that is **not** your home Wi-Fi (for example, mobile data):

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
sudo journalctl -u cloudflared -f
sudo systemctl status fir-saathi cloudflared --no-pager
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
  NODE_ENV=test pnpm test
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
| Cloudflare/DNS settings | Record the Cloudflare account recovery details, tunnel name, published hostname, and domain registrar access. Do not record the tunnel token in plain text. |
| Power and uptime | Use a quality supply; consider a UPS if service continuity matters. Monitor `systemctl` status and disk free space. |

Review the following monthly: Raspberry Pi OS updates, Node version, `fir-saathi` and `cloudflared` logs, UFW rules, Cloudflare tunnel health, Supabase project status, Groq usage limits, deploy keys, and all server-side secrets. Rotate the Cloudflare tunnel token, `GROQ_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` immediately if any may have been exposed.

## 14. Troubleshooting

| Symptom | Check | Likely fix |
|---|---|---|
| `fir-saathi` will not start | `sudo journalctl -u fir-saathi -n 100 --no-pager` | Check `/etc/fir-saathi.env`, Node 22 availability for `firsaathi`, and that `pnpm build` completed. |
| Tunnel route returns an error | `curl -I http://127.0.0.1:3000`, `systemctl status fir-saathi cloudflared` | Restore the Node service first, then inspect the Cloudflare Tunnel health and published-route configuration. |
| Tunnel is unhealthy | `sudo journalctl -u cloudflared -n 100 --no-pager` | Verify the connector token, outbound internet access, and firewall egress to Cloudflare port 7844. |
| Tests expect an insecure cookie while production settings make it secure | Run `NODE_ENV=test pnpm test` | This is a test-environment setting only. Keep `NODE_ENV=production` in `/etc/fir-saathi.env` for the running website. |
| Supabase browser configuration test rejects the URL | Inspect `SUPABASE_URL` and `VITE_SUPABASE_URL` | Remove the trailing `/` from each Supabase project URL, then rerun the test. |
| Account created but no confirmation email arrives | Supabase **Authentication → Emails → SMTP settings** | Default Supabase SMTP sends only to organization members and has a low rate limit; configure custom SMTP for normal users, then resend or recreate the unconfirmed user. |
| Sign-in/reset link returns to localhost | Supabase **Authentication → URL Configuration** | Set Site URL and exact production redirect URL as described in section 7. |
| Groq drafting/transcription fails | `journalctl -u fir-saathi -f` | Verify server-only `GROQ_API_KEY`, outbound internet access, and Groq account status; do not move the key into browser variables. |
| Supabase data/evidence calls fail | Server logs and Supabase dashboard | Verify `SUPABASE_URL`, service-role key, migrations, RLS, and private bucket configuration. |
| Site works locally but not through the domain | Check the Cloudflare dashboard route and tunnel health | Confirm the hostname is attached to the correct tunnel and that the service URL is exactly `http://127.0.0.1:3000`. |
| A newly deployed screen reports `No procedure found on path ...` | Compare `git rev-parse --short HEAD` with `origin/main`, then inspect `dist/index.js` for the procedure name | Rebuild, restart `fir-saathi`, and retry from a fresh/private browser session. The browser may have loaded new static assets while an earlier API process or tab still served an older router response. |

### Recovery for a stale browser/router rollout

When a new interface calls a recently added tRPC procedure but the app replies `No procedure found on path ...`, do not edit secrets or recreate the service. First confirm the checkout and production bundle, then restart the service and retry in a fresh browser session:

```bash
sudo -u firsaathi -H bash -lc '
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22 --silent
  cd /srv/fir-saathi/app
  git fetch origin
  echo "LOCAL=$(git rev-parse --short HEAD)"
  echo "REMOTE=$(git rev-parse --short origin/main)"
  git pull --ff-only origin main
  set -a; . /etc/fir-saathi.env; set +a
  pnpm build
  grep -o "procedureNameHere" dist/index.js | head
'
sudo systemctl restart fir-saathi
sudo systemctl is-active fir-saathi
```

Replace `procedureNameHere` with the missing procedure name, for example `addContext`. Both commit values should match, the procedure name should appear in the bundle, and the service should report `active`. Open the site in a private/incognito tab before re-testing so that an earlier browser tab does not retain an outdated client bundle or prior error state.

## References

[1] [Raspberry Pi Documentation, *Raspberry Pi OS*](https://www.raspberrypi.com/documentation/computers/os.html)

[2] [npm Docs, *Downloading and installing Node.js and npm*](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/)

[3] [Supabase Docs, *Securing your data*](https://supabase.com/docs/guides/database/secure-data)

[4] [Supabase Docs, *Redirect URLs*](https://supabase.com/docs/guides/auth/redirect-urls)

[5] [Cloudflare Docs, *Set up Cloudflare Tunnel*](https://developers.cloudflare.com/tunnel/setup/)

[6] [Cloudflare Docs, *Tunnel tokens*](https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/)

[7] [Supabase Docs, *Send emails with custom SMTP*](https://supabase.com/docs/guides/auth/auth-smtp)

[8] [Resend Docs, *What is Resend Pricing?*](https://resend.com/docs/knowledge-base/what-is-resend-pricing)

[9] [Twilio, *SendGrid Email API pricing*](https://www.twilio.com/en-us/products/email-api/pricing)

[10] [Resend Docs, *Send emails using Supabase with SMTP*](https://resend.com/docs/send-with-supabase-smtp)
