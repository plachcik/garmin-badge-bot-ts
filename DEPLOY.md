# Deploy

The bot and the admin panel run as a single service on Railway. Express serves the API (`/api/*`) and the built
Angular frontend (everything else), and the Telegram bot runs in the same process using long polling.

Deploys run automatically from GitHub Actions (`.github/workflows/deploy.yml`): every push to `main` runs
typecheck, lint, tests and build, and if they pass, `railway up` to the Railway service.

## Regular deploy

1. Push to `main`.
2. In GitHub → **Actions**, check that the `test` and `deploy` jobs passed.
3. In Railway → service → **Deployments**, wait for the deployment to become `Active` (healthcheck `/api/health`).
4. Check the service logs for `API server listening on port ...` and `Bot is running.`

To rerun a deploy without a commit: GitHub → Actions → the run → **Re-run jobs**. A re-run uses the code from that
commit but the current secret values.

## Setup from scratch

### 1. Railway

1. Create a project and an **Empty Service** in it (GitHub Actions uploads the code, so the service doesn't need
   to be connected to the repo).
2. **Volume**: add a volume to the service with mount path `/app/data`. All data lives there
   (`subscribers.json`, `subscriber_names.json`, `subscriber-config.json`, `runtime-config.json`,
   `ignored-badges.json`, `sent-badges.json`).
3. **Variables** on the service:

   | Variable | Required | Value |
   |---|---|---|
   | `TELEGRAM_BOT_TOKEN` | ✅ | bot token from @BotFather |
   | `ADMIN_TELEGRAM_CHAT_ID` | ✅ | admin chat ID; receives panel login codes and error alerts |
   | `DATA_DIR` | ✅ | `/app/data` (must match the volume mount path) |
   | `DAILY_HOUR` | | send hour in UTC, default `8` |
   | `DAILY_MINUTE` | | send minute, default `0` |
   | `WEEKLY_EVERY_DAY` | | `true` = weekly digest every day, default Mondays only |
   | `SHOW_BADGE_IMAGE` | | `true` = send badges as photos by default |

   Railway sets `PORT` itself, so don't add it.
   A schedule set later in the panel overrides `DAILY_HOUR` / `DAILY_MINUTE` / `WEEKLY_EVERY_DAY`
   (it is stored in `runtime-config.json` on the volume).
4. **Panel domain**: service → **Settings → Networking → Generate Domain**. When asked for the port, use the one
   from the logs (`API server listening on port ...`, usually `8080`). The panel is served at `/` on that domain.
5. **Project token**: **Project Settings → Tokens → Create Token**, environment `production`. The token is shown
   only once.

### 2. GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `RAILWAY_TOKEN` | project token from step 1.5 |
| `RAILWAY_SERVICE_ID` | the service **name**, exactly as shown on its tile in Railway (e.g. `garmin-badge-bot-ts`), not its ID |

Or from a terminal (it prompts for the value, so nothing ends up in shell history):

```bash
gh secret set RAILWAY_TOKEN --repo plachcik/garmin-badge-bot-ts
gh secret set RAILWAY_SERVICE_ID --repo plachcik/garmin-badge-bot-ts
```

> Despite the secret's name, put the service name in it: with a project token, `railway up --service` only
> accepts the name, and an ID fails with `Service not found`.

### 3. First deploy and verification

1. Push to `main` (or re-run the workflow) and wait for `Active` in Railway.
2. Open the domain from step 1.4 and click **Send verification code**. The bot sends the code to the
   `ADMIN_TELEGRAM_CHAT_ID` chat. If it doesn't arrive, send `/start` to the bot first (a bot can't start a
   conversation).
3. Check `/odznaki` in the bot, and the **Weekly digest** / **Daily check** buttons for your chat in the panel.

## Migrating subscribers from another service (e.g. the old Python bot)

The `subscribers.json` and `subscriber_names.json` formats are the same in the Python and TS versions.

A bot token can only be used by one running instance. Two instances on the same token keep kicking each other
off (`409 Conflict`), so the old service must be stopped before its token is given to the new one. Do this
outside the send window (08:00–08:02 UTC by default).

Files are copied with `railway volume files`. These commands need:

- the Railway CLI (`brew install railway`) and `railway login` (opens a browser; logging in with GitHub works),
- a registered SSH key: `railway ssh keys add` (without it: `SSH authentication failed`),
- an **active deployment** of the service that owns the volume (without it: `has no active deployment`),
- a volume attached to the service (without it, `ls` fails with `Available options can not be empty`).

Paths are relative to the volume root (`/subscribers.json`), not the mount path. Paste each command on a single
line.

1. **Stop the old bot but keep its container running**: in the old service, set **Settings → Deploy →
   Custom Start Command** to `sleep infinity`, then **Redeploy**. The container runs, but the bot doesn't poll
   Telegram.
2. **Download the data from the old volume** (volume name from the prompt or from `railway volume list`):

   ```bash
   railway link                                  # old bot's project and service
   railway volume files ls /
   railway volume files --volume <old-volume> download /subscribers.json .
   railway volume files --volume <old-volume> download /subscriber_names.json .
   ```

3. **Upload the data to the new service**:

   ```bash
   railway link                                  # new bot's project and service
   railway volume files ls /
   railway volume files upload subscribers.json /subscribers.json --overwrite
   railway volume files upload subscriber_names.json /subscriber_names.json --overwrite
   ```

   With only a few subscribers you can add them in the panel instead (**Add subscriber**: chat ID + name).
4. **Switch `TELEGRAM_BOT_TOKEN`** in the new service to the old bot's token. Railway redeploys automatically.
5. **Verify**: after startup the logs list `Subscribers (N)` with names, the panel shows the same list, and
   `/odznaki` works in the bot. Then remove the old service's deployment (⋮ → **Remove**) and clear its
   **Custom Start Command**.
6. **Disable the old repo's CI** (GitHub → Actions → workflow → ⋯ → **Disable workflow**), so a push doesn't
   bring the old bot back up on the same token.
7. Delete the old service in Railway after a few days.

## Rollback

Railway → service → **Deployments** → previous working deployment → ⋮ → **Redeploy**.
Deploys and rollbacks don't touch the data on the volume.

The next push to `main` deploys the new code again, so when rolling back because of a bug, revert on `main` first.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Service not found` in the Deploy step | `RAILWAY_SERVICE_ID` holds an ID instead of the service name, the name has a typo, or the token is from a different project/environment. Check locally: `RAILWAY_TOKEN=<token> railway status`. |
| `Unauthorized` / `Not signed in` in the Deploy step | Wrong or revoked `RAILWAY_TOKEN`; create a new project token. |
| Deployment crashes right after start, logs show `Missing required environment variable` | `TELEGRAM_BOT_TOKEN` or `ADMIN_TELEGRAM_CHAT_ID` is missing. |
| Logs show `409: Conflict: terminated by other getUpdates request` | The same bot token is running elsewhere (old service, local `npm run dev`). Stop the other instance. Don't run the bot locally with the production token. |
| Subscribers disappear after a deploy | The volume isn't mounted at `/app/data`, or `DATA_DIR` points elsewhere. |
| Panel doesn't open | No domain generated (Settings → Networking). |
| Login code doesn't arrive | The admin hasn't sent `/start` to the bot, or `ADMIN_TELEGRAM_CHAT_ID` is wrong. A new code can be requested after 30 s; a code expires after 5 min or 5 wrong attempts. |
