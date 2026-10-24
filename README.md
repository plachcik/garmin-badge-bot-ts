# Garmin Badge Bot

A Telegram bot that notifies you about available Garmin Connect badges — weekly for challenges ending that week, and daily when there's a one-day-only badge available.

The bot is already live and running in Telegram — find it at [@GarminBadgeBot](https://t.me/GarminBadgeBot).

## Commands

| Command | Description |
|---|---|
| `/start` | Subscribe to scheduled badge notifications |
| `/subscribe` | Subscribe to scheduled badge notifications |
| `/dawaj_odznaki` | Subscribe to scheduled badge notifications |
| `/odznaki` | Check available badges right now |
| `/unsubscribe` | Unsubscribe from notifications |

To receive scheduled digests, anyone in the chat needs to send `/subscribe` or `/dawaj_odznaki` once. Works in both private chats and group chats.

## Scheduled messages

### Weekly digest — every Monday at 8:00 UTC
(or every day when `WEEKLY_EVERY_DAY=true`)

### Today-special check — every day at 8:01 UTC

Fires when there are badges whose start and end date share the same calendar day. Also previews tomorrow's single-day badges.

## Admin panel

A web-based admin panel is included for managing the bot without editing files directly.

Features:
- View and manage subscribers — add by chat ID, remove, rename
- Per-subscriber settings — enable/disable badge images, mute notifications, set individual schedule
- Manual triggers — send weekly digest or daily check to a single subscriber or all at once
- Global schedule — change the default send time without restarting the bot

Authentication uses a one-time code delivered to your Telegram chat — no passwords stored.

## Tech stack

- **Node.js 22** + **TypeScript**
- **grammY** — Telegram bot framework
- **Express** — HTTP server for the admin API and serving the frontend
- **node-cron** — scheduler
- **Angular 22** — admin panel frontend
- **Tailwind CSS** — styling
- **Vitest** — tests

## Running locally

### Prerequisites

- Node.js 22+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- Your personal Telegram chat ID (get it from [@userinfobot](https://t.me/userinfobot))

### 1. Install dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_CHAT_ID=your_chat_id
```

### 3. Start the bot

```bash
npm run dev
```

The bot starts on port 3000. The admin API is available at `http://localhost:3000/api`.

### 4. Start the admin panel (separate terminal)

```bash
cd frontend && npm run start
```

The Angular dev server runs at `http://localhost:4200` and proxies API calls to the bot on port 3000.

Open `http://localhost:4200`, click **Wyślij kod weryfikacyjny** — a one-time code will be sent to your Telegram chat. Enter it to log in.

## Development

```bash
npm run dev        # run bot with hot reload
npm test           # run tests
npm run typecheck  # type-check without emitting
npm run lint       # eslint
```

## Build & deploy

```bash
npm run build:all  # builds Angular frontend + TypeScript bot
npm start          # runs compiled output
```

In the Docker image the Angular build output is copied to `public/` and served statically by Express alongside the API.

Deploy to Railway: every push to `main` runs typecheck, lint, tests and build in GitHub Actions, then `railway up` to the Railway service (requires the `RAILWAY_TOKEN` and `RAILWAY_SERVICE_ID` secrets). The service needs env vars set and a volume mounted at `/app/data` with `DATA_DIR=/app/data`.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | — | Token from @BotFather |
| `ADMIN_TELEGRAM_CHAT_ID` | ✅ | — | Your chat ID — receives error alerts |
| `DATA_DIR` | | `.` | Directory for persistent JSON files |
| `DAILY_HOUR` | | `8` | Hour (UTC) for scheduled checks |
| `DAILY_MINUTE` | | `0` | Minute for scheduled checks |
| `WEEKLY_EVERY_DAY` | | `false` | Run weekly digest every day instead of Mondays only |
| `SHOW_BADGE_IMAGE` | | `false` | Send badge images as photos instead of text |
