# Iron Crusader — Table Booking Frontend

Grimdark-styled React SPA for the **Iron Crusader Warhammer Club** booking system.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (custom grimdark theme) + Radix UI primitives
- TanStack Query v5 · React Router v7 (HashRouter for GitHub Pages)
- framer-motion · dnd-kit · date-fns · Zod

---

## Prerequisites

### 1. Backend over HTTPS

The app is deployed over HTTPS (GitHub Pages). Your backend **must** also be reachable over HTTPS or the browser will block requests (mixed-content policy).

**Fastest option — Cloudflare Tunnel (free, no domain needed):**

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Expose backend
cloudflared tunnel --url http://YOUR_API_HOST:YOUR_API_PORT
# Output: https://random-name.trycloudflare.com
```

Use that URL as `VITE_API_BASE_URL`.

### 2. Telegram Bot setup

1. Open [@BotFather](https://t.me/BotFather) → `/setdomain`
2. Select your bot
3. Enter your GitHub Pages domain: `https://<your-username>.github.io`

---

## Development

```bash
# Install deps
npm install

# Create env file
cp .env.example .env.local
# Fill in VITE_API_BASE_URL and VITE_TG_BOT_USERNAME

# Start dev server
npm run dev
```

> ⚠️ Telegram Login Widget won't work on plain `localhost`.
> Use Cloudflare Tunnel or ngrok for the dev server too if you need to test auth:
> ```bash
> cloudflared tunnel --url http://localhost:5173
> ```

---

## Deploy to GitHub Pages

1. Go to repo **Settings → Pages** → Source: **GitHub Actions**
2. Add these **Repository Secrets** (Settings → Secrets → Actions):
   - `VITE_API_BASE_URL` — your HTTPS backend URL
   - `VITE_TG_BOT_USERNAME` — bot username
3. Push to `main` — GitHub Actions will build and deploy automatically

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Backend API base URL (HTTPS!) |
| `VITE_TG_BOT_USERNAME` | Yes | Telegram bot username (no @) |

---

## Features

- **Grimdark theme** — Cinzel/Inter fonts, brushed-iron palette, gold accents
- **Telegram Login Widget** auth → JWT stored in localStorage (30d)
- **Floor Plan view** — interactive canvas, drag-to-reposition (admin), click to book
- **Grid view** — responsive card grid with occupancy bars
- **Booking Dialog** — hour-by-hour timeline 10:00–22:00, drag to select multi-hour slots
- **My Bookings** — cancel your upcoming reservations
- **Admin War Room** — view/force-cancel all bookings, CSV export
- **Admin Wargear** — create/edit/toggle tables with emoji picker
- **Admin Floor Editor** — drag-and-drop layout saved to `localStorage`
