# Deployment and operations

## Local and Windows

Use Docker Desktop, Linux containers and Compose v2. Follow README.md. Run commands
from the directory containing compose.yaml. The YAML and Docker commands work in
PowerShell; shell-specific commands are marked in the testing document. No host bind
mount of PostgreSQL data is used, avoiding common Windows permissions issues.
Windows Docker Desktop itself has not been tested in this Linux build environment.

## Public HTTPS

Put a TLS reverse proxy (Caddy/nginx/your platform ingress) in front of the loopback web
port 8080 on the same host. Forward the public HTTPS site to that port. If using a
separate proxy container, attach it to the Compose network and forward to `web:80`;
no host port exposure is needed in that case. Configure certificates for your own domain.
Set CORS_ORIGINS to a JSON array of your actual HTTPS origin, MINI_APP_URL to that URL,
ENVIRONMENT=production and a unique strong JWT_SECRET. Set DEMO_MODE_ENABLED=false if
public demo accounts are not desired. Never commit .env or paste tokens in issue reports.

Run `docker compose --profile telegram up --build -d` after configuration. The Telegram
bot is opt-in; the normal stack runs without credentials. Do not run two polling bots
with the same token. If transitioning from webhooks, remove the old webhook intentionally
using your bot administration process before enabling long polling. Do not run tests
against real user data or send test notifications to unconsenting users.

## Readiness and troubleshooting

- `docker compose ps`: db and api healthy; migrate exited 0; worker/web running.
- Request `/api/health` through your site; expect `{"status":"ok"}`.
- Test demo CRUD only where demo is enabled.
- `docker compose logs --tail=100 migrate api worker` for diagnostics.
- Bot 401: verify the token securely. Bot 409: another polling process/webhook is active.
- Delivery 403: recipient may have blocked/not started the bot. Have them `/start` it.
- Check user timezone, notification switch and due date before assuming worker failure.
- Settings → Reminder activity displays durable state; failed current jobs offer Retry.
- The worker needs HTTPS access to api.telegram.org; browser Telegram bootstrap needs
  telegram.org. Package installation needs PyPI/npm registries; Docker needs image registries.
- Domain-policy denial requires an environment network-policy change, never disabled TLS.

## Persistence and backup

Back up before upgrades. Linux/macOS Bash example:

```sh
docker compose exec -T db pg_dump -U subguard -d subguard -Fc > subguard.dump
```

PowerShell users should avoid binary redirection in older PowerShell versions. Instead:

```powershell
docker compose exec db pg_dump -U subguard -d subguard -Fc -f /tmp/subguard.dump
docker compose cp db:/tmp/subguard.dump ./subguard.dump
```

Store encrypted backups outside the host. Test restore on a separate database with
pg_restore; never overwrite production as a readiness check. Restore a matching JWT
secret if existing browser sessions must remain valid. Secrets are not part of the release.

To upgrade, back up, rebuild, then `docker compose up -d`. The migration service applies
Alembic revisions. Do not downgrade a populated production database merely to test rollback.
The initial downgrade deletes the entire schema and is only for disposable tests.

## Retention

Demo reset deletes the entire demo account and cascades dependent records. Production
demo creation is rate-limited at nginx, but abandoned demo accounts are not automatically
purged. Disable demos on a personal production deployment or define an operator-reviewed
retention job. Set a retention policy for payment/refund notes and backups before a public
launch. No analytics SDK or external font/CDN is required by the UI.

## Managed cloud builds

BuildKit Dockerfiles accept optional `proxy_ca` secrets. In a restricted managed cloud,
supply the trusted combined CA bundle to networked build steps through a Compose override.
Do not copy session CA files into image layers or disable TLS verification. The release
works without that secret on ordinary Docker Desktop networks with public trust roots.
Live processes do not survive environment snapshots; start Compose again after restore.
