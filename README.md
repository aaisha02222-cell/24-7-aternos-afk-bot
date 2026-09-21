# Cool SMP Bot

Mineflayer Java-side AFK/reconnect bot for Cool SMP.

## Features
- AuthMe login
- Automatic reconnect
- Optional anti-AFK movement
- `!help`, `!ping`, `!status`
- Works with servers using Geyser, ViaVersion, ViaBackwards and ViaRewind

## Setup
1. Install Node.js 18+.
2. Copy `settings.example.json` to `settings.json`.
3. Put the bot's AuthMe password in `settings.json`.
4. Run `start.bat` or `npm install && npm start`.

Default server: `COOLSMP9713.aternos.me:42424`.

**Never commit `settings.json` or passwords to GitHub.** `.gitignore` excludes it.
