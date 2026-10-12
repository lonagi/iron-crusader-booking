"""Server-side membership guard for Iron Crusader. Uses only Python's standard library.

This module must run in the existing API/bot server, never in the browser.
The caller supplies an identity already verified by that server's authentication.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Callable, Protocol, TypeVar
from urllib.request import HTTPRedirectHandler, Request, build_opener


GROUP_CHAT_ID = "-1001499989408"
MAX_TELEGRAM_USER_ID = 2**52 - 1
_MAX_RESPONSE_BYTES = 64 * 1024


class MembershipError(Exception):
    status_code: int
    code: str

    def __init__(self) -> None:
        # Keep Telegram URLs, tokens, and upstream error descriptions out of logs.
        super().__init__(self.code)

    @property
    def detail(self) -> dict[str, str]:
        return {"code": self.code, "chat_id": GROUP_CHAT_ID}


class MembershipUnavailable(MembershipError):
    status_code = 503
    code = "GROUP_MEMBERSHIP_UNAVAILABLE"


class MembershipRequired(MembershipError):
    status_code = 403
    code = "GROUP_MEMBERSHIP_REQUIRED"


@dataclass(frozen=True)
class Membership:
    user_id: int
    is_member: bool

    def as_dict(self) -> dict[str, str | int | bool]:
        return {
            "chat_id": GROUP_CHAT_ID,
            "user_id": self.user_id,
            "is_member": self.is_member,
        }


class TelegramTransport(Protocol):
    def __call__(
        self, token: str, method: str, payload: dict[str, str | int], timeout: float
    ) -> object: ...


class _NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # A redirect must never forward a token-bearing request elsewhere.
        return None


def telegram_transport(
    token: str, method: str, payload: dict[str, str | int], timeout: float
) -> object:
    """POST to Telegram over verified HTTPS; failures expose no upstream details."""
    try:
        if method not in {"getMe", "getChatMember"}:
            raise MembershipUnavailable()
        if not re.fullmatch(r"[0-9]+:[A-Za-z0-9_-]+", token):
            raise MembershipUnavailable()
        request = Request(
            f"https://api.telegram.org/bot{token}/{method}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Cache-Control": "no-store"},
            method="POST",
        )
        with build_opener(_NoRedirects()).open(request, timeout=timeout) as response:
            if response.status != 200:
                raise MembershipUnavailable()
            data = response.read(_MAX_RESPONSE_BYTES + 1)
            if len(data) > _MAX_RESPONSE_BYTES:
                raise MembershipUnavailable()
            return json.loads(data)
    except Exception:
        raise MembershipUnavailable() from None


def _valid_user_id(value: object) -> bool:
    return type(value) is int and 0 < value <= MAX_TELEGRAM_USER_ID


T = TypeVar("T")


class TelegramMembershipVerifier:
    def __init__(
        self,
        token: str | None = None,
        *,
        transport: TelegramTransport = telegram_transport,
        timeout: float = 5.0,
    ) -> None:
        self._token = token if token is not None else os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self._transport = transport
        self._timeout = timeout
        self._bot_id: int | None = None

    def _call(self, method: str, payload: dict[str, str | int]) -> dict:
        try:
            if not isinstance(self._token, str) or not re.fullmatch(
                r"[0-9]+:[A-Za-z0-9_-]+", self._token
            ):
                raise MembershipUnavailable()
            if not 0 < self._timeout <= 20:
                raise MembershipUnavailable()
            response = self._transport(self._token, method, payload, self._timeout)
            if not isinstance(response, dict) or response.get("ok") is not True:
                raise MembershipUnavailable()
            result = response.get("result")
            if not isinstance(result, dict):
                raise MembershipUnavailable()
            return result
        except Exception:
            raise MembershipUnavailable() from None

    def _chat_member(self, user_id: int) -> dict:
        result = self._call("getChatMember", {"chat_id": GROUP_CHAT_ID, "user_id": user_id})
        user = result.get("user")
        if (
            not isinstance(user, dict)
            or not _valid_user_id(user.get("id"))
            or user["id"] != user_id
        ):
            raise MembershipUnavailable()
        return result

    def check(self, authenticated_user_id: int) -> Membership:
        """Check now, including current bot permissions. Never caches member status.

        authenticated_user_id must come from validated JWT/session claims (or a
        trusted Telegram bot update), never an arbitrary request parameter.
        """
        if not _valid_user_id(authenticated_user_id):
            raise MembershipUnavailable()
        if self._bot_id is None:
            me = self._call("getMe", {})
            if not _valid_user_id(me.get("id")) or me.get("is_bot") is not True:
                raise MembershipUnavailable()
            self._bot_id = me["id"]

        # Telegram guarantees checks for other users when this bot is an admin.
        own_membership = self._chat_member(self._bot_id)
        own_status = own_membership.get("status")
        if not isinstance(own_status, str) or own_status not in {"administrator", "creator"}:
            raise MembershipUnavailable()

        member = self._chat_member(authenticated_user_id)
        status = member.get("status")
        if not isinstance(status, str):
            raise MembershipUnavailable()
        if status in {"creator", "administrator", "member"}:
            return Membership(authenticated_user_id, True)
        if status in {"left", "kicked"}:
            return Membership(authenticated_user_id, False)
        if status == "restricted" and type(member.get("is_member")) is bool:
            return Membership(authenticated_user_id, member["is_member"])
        raise MembershipUnavailable()

    def require_member(self, authenticated_user_id: int) -> Membership:
        membership = self.check(authenticated_user_id)
        if not membership.is_member:
            raise MembershipRequired()
        return membership

    def create_for_member(self, authenticated_user_id: int, create: Callable[[], T]) -> T:
        """Run a synchronous booking write only after a fresh successful check.

        Keep identity/ownership, date validation, and database conflict handling
        in the existing booking service. Do not pass async callbacks here.
        """
        self.require_member(authenticated_user_id)
        return create()
