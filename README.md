# Lipa Tourism PWA (Batangas)

Offline-first guide to spots, food and stays in Lipa City. Plain HTML/CSS/JS, Leaflet + OpenStreetMap, no build step.
Live: https://esp046-cyber.github.io/batangastour/

## Files
| File | Role |
|---|---|
| `index.html`, `style.css`, `app.js` | UI, design system (CSS variables), app logic |
| `db.js` | IndexedDB wrapper shared by page + service worker (backup + offline outbox) |
| `map.js` | Map code, **lazy-loaded** with Leaflet only when the Map tab opens |
| `sw.js` | Service worker: precache, stale-while-revalidate for tiles + JSON, Background Sync |
| `data/locations.json` | Your places |
| `_headers` | Security headers for Netlify / Cloudflare Pages |
| `tools/build_locations.py`, `.github/workflows/build-places.yml` | Fill places from OpenStreetMap |
| `tools/check-budget.py` | Performance budget check |

## Customize the data
Edit `data/locations.json`. Each place: `id` (unique number), `name`, `category` (`Tourist Spots` / `Restaurants` / `Hotels`), `latitude`, `longitude`, `description`, `address`, `contact`, `features` (array), `verified` (true/false), optional `image` (a file in this repo, e.g. `images/cathedral.jpg`; it lazy-loads).
After any change, **bump `VERSION` in `sw.js`** so phones refresh their cache.
Colors live in `:root` at the top of `style.css` (`--taal-*` blues, `--earth-*` volcanic tones, `--sun-*` sunrise).
To reach up to 400 places from OpenStreetMap: GitHub > Actions > "Build places from OpenStreetMap" > Run workflow (works from a phone). The real count depends on what OSM has mapped. Never pad with guesses.

## Deploy (GitHub Pages)
1. Upload everything (keep folder structure, including `.github`).
2. Settings > Pages > Deploy from branch `main` / root. Tick **Enforce HTTPS**.
3. Open the site once online so the service worker installs.
Security: GitHub Pages cannot send headers, so `index.html` carries a strict meta CSP and `app.js` redirects http to https. For real headers (HSTS, `frame-ancestors`) host on Netlify or Cloudflare Pages, which read `_headers`.

## Offline Sync (Background Sync)
Tap **Report issue** on a place. The report is stored in IndexedDB and sent automatically when you reconnect (Chrome/Android use Background Sync; other browsers send on the `online` event). Reports are only sent if you set `LIPA_ENDPOINT` in `db.js` to a form/API URL, and add that URL to `connect-src` in `index.html` and `_headers`. Until then they stay queued (see Offline Status).
The service worker also refreshes `locations.json` in the background when a connection returns.

## Test offline
1. Open the site, visit each tab, open Map, tap **Save map area**.
2. Chrome DevTools > Application > Service Workers: tick **Offline**, reload. App, places and saved tiles should still work.
3. While offline tap **Report issue**; Offline Status shows "Queued actions: 1". Untick Offline; it flushes (needs the endpoint).
4. Backup test: Application > Storage > clear Local storage, reload offline; plan and places restore from IndexedDB.

## Motion and accessibility
Tab changes use the View Transitions API (directional slide, falls back to a fade where unsupported). Buttons have press, ripple, toggle "pop" and haptic feedback. All motion is off when the device asks for reduced motion. Type is rem-based (respects the user's browser font size), scales fluidly with `clamp()`, keeps lines under 68 characters, and meets WCAG AAA contrast for body text (checked against the lightest background area). `prefers-contrast: more` and forced-colors modes are supported.

## Performance budget
First load (HTML, CSS, JS, JSON) must stay under 100 KB gzip: run `python3 tools/check-budget.py`. Currently about 19 KB. Leaflet (~45 KB) is code-split and loads only on the Map tab. Measure with Lighthouse using "Slow 4G/3G" throttling; the 2-second target is for first visit, repeat visits are served by the service worker.

## Troubleshooting
Old content: bump `VERSION`, hard reload. No install prompt: needs HTTPS, manifest icons, active service worker. Map blank offline: open the Map online first. Blocked request: check the CSP `connect-src` in the browser console.
Credits: map data (c) OpenStreetMap contributors (ODbL).
