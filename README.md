# Iron Crusader

Table booking for the Iron Crusader Warhammer club. A React and TypeScript frontend using Vite, Tailwind CSS, React Router and TanStack Query.

## Appearance and languages

The site starts in dark mode with a red accent. Theme and language controls are available before sign-in and in the main header. The selected theme persists between visits. English, Russian, Romanian and Ukrainian are supported throughout the interface, including dates and admin screens. The first visit uses the first supported language in the browser's preference list, falling back to English; a manual choice is saved.

The club image is served from `public/club-logo.jpg` and is also used as the favicon.

## 3D Beta

The `#/beta` route offers an optional Three.js room. Drag or swipe to rotate, use the wheel or pinch gesture to zoom, and click a table to open the regular booking dialog. Arrow keys rotate the focused scene, `+` and `-` zoom, and `R` resets it. The adjacent table list provides keyboard access and remains usable when WebGL is unavailable.

The room uses an experimental arrangement, not a measured model of the venue. Tables, availability and booking mutations use the same API and query cache as the main interface. The 3D bundle loads only when this route is opened, and the scene renders on interaction rather than running an idle animation loop.

## Run locally

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_API_BASE_URL` to the existing API address and `VITE_TG_BOT_USERNAME` to its Telegram bot username without `@`. These are public build settings. Never add a Telegram bot token or client secret to a `VITE_` variable.

The API must support HTTPS when the website uses HTTPS. The existing bot owner must already have linked the website's domain in BotFather for browser sign-in to work. Local Telegram login testing needs an HTTPS address registered for that bot; changing frontend code cannot bypass this restriction.

## Sign-in

The default flow continues to use the existing backend contract:

```text
POST /api/v1/auth/telegram
{id, first_name, last_name?, username?, photo_url?, auth_date, hash}

GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

The Telegram widget now loads with a stable callback, a loading state, a timeout and a retry action. It does not request permission for the bot to send messages. Login failures stay on the page with a readable message.

Sessions are reused until their actual expiry. When available, the backend's `expires_in` and the access token's `exp` limit session lifetime. Older opaque tokens retain the previous maximum of 30 days. Reading `exp` is only a local expiry check; the API remains responsible for validating the token, identity and permissions. Signing out or switching accounts clears cached queries, and other tabs follow session changes. If the browser blocks storage, the session lasts in memory until the tab closes.

### Why Telegram can still ask for a phone number

The browser widget and the installed Telegram app have separate sessions. Telegram can ask for a phone number when its browser session is missing. The frontend cannot sign into Telegram on the user's behalf or remove Telegram's verification step.

The current Telegram Login SDK uses OIDC and returns an `id_token`. The existing API expects the older signed fields shown above. Replacing the script alone would break authentication. Moving to OIDC requires the bot owner's settings and backend token verification. See [Telegram Login](https://core.telegram.org/bots/telegram-login).

### Optional sign-in from the Telegram app

This feature is off by default. It needs work by the existing bot owner; it is not enabled by the frontend changes.

The frontend can receive the signed callback from a Telegram `login_url` button. This uses the same auth endpoint as the browser widget. Signed parameters are removed from the address before React renders. The user confirms the named account, then the backend validates the data before issuing a session. Invalid, duplicated and expired callback parameters are rejected locally; the backend must independently verify the signature and freshness.

To enable this route, the bot owner must:

1. Link the deployed website domain to the bot in BotFather.
2. Handle `/start booking` by replying with an inline button whose `login_url.url` points to the deployed HTTPS frontend root, including the Vite base path. Use a URL without a hash fragment, for example `https://example.github.io/iron-crusader-booking/`.
3. Ensure `POST /api/v1/auth/telegram` verifies Telegram's hash, checks `auth_date`, and applies an appropriate replay policy before creating a session. The bot token stays on the server.
4. After testing the bot reply and callback, build the frontend with `VITE_TG_APP_LOGIN_ENABLED=true`.

The bot's reply markup is:

```json
{
  "inline_keyboard": [
    [
      {
        "text": "Sign in",
        "login_url": {
          "url": "https://example.github.io/iron-crusader-booking/",
          "request_write_access": false
        }
      }
    ]
  ]
}
```

When enabled, the frontend links to `https://t.me/<bot_username>?start=booking`. Simply opening a bot chat is not proof of identity. No access token is accepted from a URL, and unverified Mini App user data is never used to create a session. Telegram may open the return link in its browser or another browser, so the session belongs to the browser that receives the callback.

See the official [LoginUrl contract](https://core.telegram.org/bots/api#loginurl).

## Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Existing HTTPS API address. Leave empty only for a same-origin API. |
| `VITE_TG_BOT_USERNAME` | Existing Telegram bot username without `@`. |
| `VITE_TG_APP_LOGIN_ENABLED` | Optional. Keep `false` unless the bot owner's `/start booking` flow is ready. |

## Build and deploy

```sh
npm run build
npm run preview
```

GitHub Pages uses the workflow in `.github/workflows/deploy.yml`. Configure the API address and bot username in repository secrets, then deploy from `main`. The Vite base path is `/iron-crusader-booking/`; update it when hosting under another path.

## Checks

Run with the same Node 20 or newer used for the build:

```sh
npm test
```

The tests cover signed callback parsing, URL cleanup, stale and malformed callbacks, HashRouter routing, token expiry, corrupt stored sessions, unavailable browser storage, browser language detection, theme defaults and translation completeness. A real end-to-end Telegram login still needs the configured bot domain and a reachable backend; local tests do not verify that external setup.

## Local interface preview

With the development server running, open `/iron-crusader-booking/tests/ui-fixture.html#/book` to review the interface with sample tables and bookings. The fixture intercepts API requests locally and does not contact the club backend. It is not included in the production build. Use `?error=1#/book` to inspect a connection failure, `?empty=1#/my` for an empty account, or `?role=member#/book` for a non-admin view. These parameters go after `ui-fixture.html`.

The sample session stays in the fixture document and does not overwrite the application's saved session. Theme and language preferences are shared with the normal local preview.

Open `/iron-crusader-booking/tests/ui-fixture.html#/beta` for a sample 3D room, or add `?no-webgl=1#/beta` after the fixture filename to test the fallback. Fixture changes are in memory and reset on reload; no sample tables or bookings are sent to the live API.
