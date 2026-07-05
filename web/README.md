# WEPROJECT LEGENDS — Web App (Phase 3)

React + Vite frontend for the gamified team dashboard. Talks to the Google
Apps Script Web App (Phase 2) over plain HTTP — no build-time secrets.

## Routes

| Route | Who / where | What |
|---|---|---|
| `/`    | Employee phones | Login (name + PIN) → ⚔️ Battlefield / 🧙 My Hero / 🛒 Shop. Refreshes every 60s. |
| `/tv`  | Office TV (1920×1080) | No login. Auto-rotates 3 screens (Boss / Boards / Feed) every 15s. Pulls data every 30s. Shows the Rage frame when `rage_active` is on. |

## Local setup

```bash
cd web
cp .env.example .env      # then paste your /exec URL into .env
npm install
npm run dev               # open the printed localhost URL
```

`.env` must contain:

```
VITE_API_URL=https://script.google.com/macros/s/AKfycb…/exec
```

(the Web App URL from Apps Script → Deploy → Manage deployments).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Vercel → New Project → import the repo.
3. **Root Directory: `web`** (important — the app lives in this subfolder).
4. Framework preset: **Vite** (Build `npm run build`, Output `dist`).
5. Add env var **`VITE_API_URL`** = your `/exec` URL.
6. Deploy.

`vercel.json` already rewrites all routes to the SPA so `/tv` works on refresh.

## TV setup

Open `https://<your-app>.vercel.app/tv` in Chrome, press **F11** for
fullscreen, and disable the display's sleep/screensaver.

## Notes

- Auth is name + 4-digit PIN stored in `sessionStorage` (clears on tab close),
  as specified — it's anti-fat-finger, not real security.
- If the API is unreachable, screens keep the last good data and show a
  "Data sync failed" badge instead of white-screening.
- Boss phase reward labels (Snack Day, Coffee Day…) are defined in
  `src/theme.js` (`PHASE_META`) since the API only returns the `%` thresholds.
