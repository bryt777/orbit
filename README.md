# BRYT Instagram Username Checker

A small Vercel project with:
- Static browser dashboard
- Original weighted five-character username styles
- A protected serverless API
- Telegram candidate notifications
- Browser-local result history and TXT export

## Important limitations

Instagram has no public API for checking arbitrary username availability. This project checks the public profile URL only:
- HTTP 404 = profile not found / possible candidate, **not confirmation of availability**
- HTTP 200 = profile page responded; treated as taken
- HTTP 403 / 429 / other statuses = unknown

Instagram may return login walls, challenges, rate limits, or misleading responses. Use slow checking, stop when limited, and manually verify candidates in Instagram. This project does not log in to Instagram, bypass restrictions, use proxies, or guarantee availability.

Vercel Functions are request-based and have a maximum execution duration; this is not an always-running worker. The dashboard runs batches while the page remains open. Result history is stored in that browser's localStorage, not on the server.

## Deploy

1. Push these files to a GitHub repository.
2. Import the repository into Vercel.
3. In Vercel > Project > Settings > Environment Variables, add:
   - `PANEL_PASSWORD` = a strong password you choose
   - `SESSION_SECRET` = a long random secret (32+ characters)
   - `TELEGRAM_BOT_TOKEN` = a newly generated Telegram bot token
   - `TELEGRAM_CHAT_ID` = your Telegram chat ID
4. Redeploy after adding environment variables.
5. Open the deployed site and enter `PANEL_PASSWORD`.

Never commit bot tokens or passwords to GitHub. Revoke any token that has been shared publicly.
