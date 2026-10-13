# Iron Crusader

Table booking for the Iron Crusader Warhammer club. A React and TypeScript frontend using Vite, Tailwind CSS, React Router and TanStack Query.

## Telegram group membership

The supplied third-party API does not expose group membership. The website uses its existing Telegram authentication and booking endpoints. It cannot determine whether an authenticated user belongs to group `-1001499989408`, and it does not claim that membership was verified. Browser-only checks cannot enforce permissions on an external API.

**The optional membership integration is off by default.** Leave `VITE_TG_MEMBERSHIP_ENABLED=false` for the current API. This avoids requesting a nonexistent endpoint and blocking every booking. Turning it on is not a way to add membership checking to that API.

The [server module and integration instructions](server-integration/README.md) are retained for a possible future server implementation. Only after that contract is deployed should `VITE_TG_MEMBERSHIP_ENABLED=true` be set at build time (or as a GitHub Actions repository variable). In that mode the frontend checks on opening a booking dialog and again before creation. Missing endpoints, outages and invalid responses block creation; there is no automatic fallback. The API must independently enforce the same rule on every write. The build setting itself is not a security boundary. Explicit permission errors returned by the booking API are respected in either mode.

`VITE_TG_GROUP_URL` optionally supplies a real Telegram invitation/public link for membership error messages. A group ID is not an invitation link. Never put a bot token in any `VITE_` variable.

## Appearance and languages

The site starts in dark mode with a red accent. Theme and language controls are available before sign-in and in the main header. The selected theme persists between visits. English, Russian, Romanian and Ukrainian are supported throughout the interface, including dates and admin screens. The first visit uses the first supported language in the browser's preference list, falling back to English; a manual choice is saved.

The club image is served from `public/club-logo.jpg` and is also used as the favicon.

The main booking page has one table list, a scrollable week selector and a date field for later days. Theme, language and sign-out are grouped in the header settings menu. On mobile, primary navigation stays at the bottom; the booking dialog uses a scrollable sheet with a fixed confirmation area. The old separate 2D plan and its unused admin editor have been removed.

Each table card shows a day timeline, exact reserved intervals and buttons for its free windows. Choosing a free window opens the booking dialog with its first available full hour selected. Overlapping and adjacent reservations are merged for display; a partial-hour reservation blocks every hourly slot it overlaps.

## 3D Beta

The `#/beta` route offers an optional Three.js room. Drag or swipe to rotate, use the wheel or pinch gesture to zoom, and click a table to open the regular booking dialog. The view controls include a top-down view of the same room. Arrow keys rotate the focused scene, `+` and `-` zoom, and `R` resets it. The table list below provides keyboard access and remains usable when WebGL is unavailable.

The rectangular room follows the club's supplied sketch, photo and placement corrections: the kitchen and sofa are at the left, the RPG table stands beside the sofa, two Warhammer tables run across the room, and the craft desk is at the front left. The entrance is centered on the front wall, in front of the gaming tables. The cabinet is to your right as you enter; the red pennant hangs on the left wall behind the craft desk. Dimensions are approximate. Furniture is defined in `src/components/three/roomLayout.ts`; the kitchen and sofa are scenery.

The gaming positions match API tables by unambiguous RPG / D&D and numbered Warhammer / 40K / WH / Wargaming names, including Russian aliases. The craft desk also opens its matching Craft booking. Explicit `role` values are supported by the scene contract. Unknown or duplicate names are not assigned by array order or arbitrary ID; those API records remain bookable in the list. Every clickable table displays its original API name, including on mobile, without translation or replacement with a role or number. The local fixture uses the club's current table names, with sample availability and bookings.

Availability and booking mutations use the same API and query cache as the main interface. The 3D bundle loads only when this route is opened, and the scene renders on interaction rather than running an idle animation loop.

Choose a date and an hourly interval above the room to see availability for that time. Reserved tables display a seated figure (a tabletop marker for Craft), a different outline and a status label. A figure represents a table reservation, not a known player count. Hour changes update the scene without resetting the camera. The accessible table list also shows the whole day's reserved intervals; opening a free table preselects the chosen hour. All of this uses the existing bookings API.

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
| `VITE_TG_GROUP_URL` | Optional HTTPS `t.me` public group or invitation link for nonmembers. |

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

The tests cover signed callback parsing, URL cleanup, stale and malformed callbacks, HashRouter routing, token expiry, corrupt stored sessions, unavailable browser storage, browser language detection, theme defaults, translation completeness, physical room placement and table identity matching. A real end-to-end Telegram login still needs the configured bot domain and a reachable backend; local tests do not verify that external setup.

Membership tests also cover incorrect group/user responses, denied access, outages, account changes during verification, repeated creation attempts after leaving the group, and a server refusal after a successful preflight. Test the server module separately with `python -m unittest discover -s server-integration -p "test_*.py" -v`; its Telegram responses are mocked and no live bookings are created.

## Local interface preview

With the development server running, open `/iron-crusader-booking/tests/ui-fixture.html#/book` to review the interface with sample tables and bookings. The fixture intercepts API requests locally and does not contact the club backend. It is not included in the production build. Use `?error=1#/book` to inspect a connection failure, `?empty=1#/my` for an empty account, or `?role=member#/book` for a non-admin view. These parameters go after `ui-fixture.html`.

The sample session stays in the fixture document and does not overwrite the application's saved session. Theme and language preferences are shared with the normal local preview.

Open `/iron-crusader-booking/tests/ui-fixture.html#/beta` for a sample 3D room, or add `?no-webgl=1#/beta` after the fixture filename to test the fallback. Fixture changes are in memory and reset on reload; no sample tables or bookings are sent to the live API.

The default fixture models the supplied API: membership requests return 404 while normal bookings work. Use `?signed-out#/login` to preview the sign-in screen without changing a real session. `?membership=nonmember#/book` or `?membership=unavailable#/book` simulate explicit server permission failures on creation. To exercise optional preflight states, start Vite with `VITE_TG_MEMBERSHIP_ENABLED=true`: `?membership=member#/book` allows booking, `?membership=join#/book` allows it after a manual recheck, and `?membership=revoked#/book` rejects the write after a positive preflight. Fixture states are not evidence of live Telegram membership.
