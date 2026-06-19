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

## Tech stack

- **Node.js 20** + **TypeScript**
- **grammY** — Telegram bot framework
- **node-cron** — scheduler
- **Vitest** — tests

## Development

```bash
npm install
npm run dev        # run with hot reload
npm test           # run tests
npm run typecheck  # type-check without emitting
npm run lint       # eslint
```

## Build & deploy

```bash
npm run build      # compiles to dist/
npm start          # runs compiled output
```

Deploy to Railway: push to GitHub, link repo, set env vars, mount volume at `/app/data` with `DATA_DIR=/app/data`.

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
