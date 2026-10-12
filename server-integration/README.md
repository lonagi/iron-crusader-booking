# Telegram group membership server integration

This directory is a tested server component and integration handoff. It is **not deployed** and is not part of the browser build. The existing API owner must wire it into the real booking server. The public API schema currently exposes no membership endpoint.

The frontend currently leaves this integration disabled (`VITE_TG_MEMBERSHIP_ENABLED=false`) to remain compatible with the supplied API. This directory is retained as a future option. Only enable the frontend integration after a server actually implements and enforces the contract below.

`telegram_membership.py` uses Python 3.10+ and the standard library. It checks the fixed club group `-1001499989408` through Telegram. Set `TELEGRAM_BOT_TOKEN` only in the server environment. The bot must belong to this group and be an administrator. Never put its token in a `VITE_` setting, frontend source, GitHub Pages, logs, or client response.

The verifier validates the bot identity and its current admin status, then verifies the authenticated user's exact Telegram ID. Owners, admins, members, and restricted users with `is_member: true` are allowed. Left, banned (`kicked`), and restricted nonmembers are denied. Telegram failures, timeouts, malformed responses, mismatched identities, missing configuration, and lost bot admin rights fail closed. Only the bot ID is cached. Each check reads current membership and bot permissions.

## API contract

`GET /api/v1/auth/membership` requires the existing validated JWT. Take the Telegram ID from the authenticated principal, never from request parameters or an unverified JWT decode. Return `Cache-Control: no-store` on success and failure.

```json
{"chat_id":"-1001499989408","user_id":456,"is_member":true}
```

A verified nonmember gets the same response with `is_member: false` and HTTP 200. Unavailable verification returns HTTP 503:

```json
{"detail":{"code":"GROUP_MEMBERSHIP_UNAVAILABLE","chat_id":"-1001499989408"}}
```

**The GET endpoint and browser gate are not authorization for a later write.** `POST /api/v1/bookings` must independently run a fresh `require_member` check before creating anything. A verified nonmember receives HTTP 403:

```json
{"detail":{"code":"GROUP_MEMBERSHIP_REQUIRED","chat_id":"-1001499989408"}}
```

Unavailable verification returns the same 503 described above and creates no booking. Keep the existing 401 handling, validation, ownership rules, and database conflict protection. There is no admin bypass of this group requirement.

## FastAPI wiring example

The following is illustrative wiring into the owner's **existing** API, not a new server to deploy alongside it. `require_authenticated_user`, `BookingCreate`, and `create_booking_in_database` below represent the owner's existing authentication, schema, and booking service. Adapt their actual names and the principal's Telegram ID field. Do not replace JWT verification with trusting a submitted user ID.

```python
from fastapi import APIRouter, Depends, HTTPException, Response
from telegram_membership import MembershipError, TelegramMembershipVerifier

router = APIRouter(prefix="/api/v1")
verifier = TelegramMembershipVerifier()  # Reads server TELEGRAM_BOT_TOKEN.


def membership_http_error(error: MembershipError):
    return HTTPException(
        status_code=error.status_code,
        detail=error.detail,
        headers={"Cache-Control": "no-store"},
    )


@router.get("/auth/membership")
def get_membership(response: Response, principal=Depends(require_authenticated_user)):
    response.headers["Cache-Control"] = "no-store"
    try:
        return verifier.check(principal.user_id).as_dict()
    except MembershipError as error:
        raise membership_http_error(error) from None


# Modify the existing route; do not register a duplicate route.
@router.post("/bookings", status_code=201)
def create_booking(body: BookingCreate, response: Response,
                   principal=Depends(require_authenticated_user)):
    response.headers["Cache-Control"] = "no-store"
    try:
        return verifier.create_for_member(
            principal.user_id,
            lambda: create_booking_in_database(body, user_id=principal.user_id),
        )
    except MembershipError as error:
        raise membership_http_error(error) from None
```

These synchronous routes run blocking Telegram requests in FastAPI's worker pool. In an existing async route/service, run `verifier.require_member` in a thread pool before awaiting the existing database write; do not call blocking urllib on the event loop or pass an async callback to `create_for_member`.

Apply the guard in the shared booking creation service used by both website and bot so alternate creation routes cannot skip it. A trusted bot update may supply the user's Telegram ID; an HTTP request body may not. Preserve validation and transactions around the subsequent write. Telegram membership can change immediately after a check, so this is a fresh pre-write check, not an atomic transaction with Telegram. A user leaving the group does not automatically cancel their existing bookings.

Rate-limit authenticated membership checks and creation requests using the existing server controls. Each network call has a five-second timeout (up to three calls on a cold verifier and two thereafter); apply an appropriate server request deadline. Avoid logging HTTP client URLs or exception locals, which can contain bot credentials. Do not cache membership responses at a reverse proxy or CDN.

## Verify before releasing

```sh
python -m unittest discover -s server-integration -p "test_*.py" -v
```

The tests use an injected fake Telegram transport and make no live API calls. On the actual server, also check that a valid member can book, a nonmember cannot book through a direct POST, a user who leaves after opening the form is denied, and Telegram outages never create a booking. Deploy server enforcement before publishing the frontend that requires this contract.

Telegram reference: [getChatMember](https://core.telegram.org/bots/api#getchatmember), [ChatMemberRestricted](https://core.telegram.org/bots/api#chatmemberrestricted).
