# Phase 1 Deployment Runbook

Never paste secrets into source files, issues, screenshots, or chat. Enter them directly in the provider dashboards or approved interactive login flow.

## Required hosted resources

1. Private GitHub repository under the owner's personal account.
2. Vercel Hobby project connected to that repository.
3. Telegram bot created in BotFather.
4. Supabase staging and production projects may be created in this phase, but their database keys are not consumed until Phase 2.

## Vercel environment variables

Configure distinct Preview and Production values:

- `APP_TIMEZONE=Asia/Kolkata`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` — random 32+ character value using letters, digits, `_`, or `-`
- `ALLOWED_TELEGRAM_USER_ID`
- `ALLOWED_TELEGRAM_CHAT_ID`

Do not configure `NEXT_PUBLIC_*` secrets. The only future browser-safe values are the Supabase URL and publishable key.

## Webhook registration

After the production URL and environment variables exist, register:

- URL: `https://<production-domain>/api/telegram/webhook`
- Secret token: the exact `TELEGRAM_WEBHOOK_SECRET`
- Allowed updates: `message`
- Drop pending updates: true for the initial registration only

Use BotFather/Telegram's HTTPS API from a protected interactive session. Do not save the bot token in shell history.

## Acceptance checks

1. `GET /api/health` returns status `ok`, Phase 1, and Telegram `configured`.
2. A webhook POST without the secret header returns 401.
3. `/start`, `/help`, and `/status` work from the approved private chat.
4. A different Telegram account/chat receives no bot reply.
5. The bot clearly says financial writes are disabled.
6. CI passes and the production deployment is built from the accepted commit.
