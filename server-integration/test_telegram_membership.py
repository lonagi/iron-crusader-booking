import unittest
from unittest.mock import patch

from telegram_membership import (
    GROUP_CHAT_ID,
    MembershipRequired,
    MembershipUnavailable,
    TelegramMembershipVerifier,
    telegram_transport,
)


BOT_ID = 123
USER_ID = 456
TEST_TOKEN = "123:offline-test-token"


def member(status="member", user_id=USER_ID, **extra):
    return {"ok": True, "result": {"status": status, "user": {"id": user_id}, **extra}}


class FakeTelegram:
    def __init__(self, user_response=None, own_response=None, me_response=None):
        self.user_response = user_response if user_response is not None else member()
        self.own_response = own_response if own_response is not None else member("administrator", BOT_ID)
        self.me_response = me_response if me_response is not None else {
            "ok": True, "result": {"id": BOT_ID, "is_bot": True}
        }
        self.calls = []

    def __call__(self, token, method, payload, timeout):
        self.calls.append((method, payload.copy(), timeout))
        if method == "getMe":
            result = self.me_response
        elif payload["user_id"] == BOT_ID:
            result = self.own_response
        else:
            result = self.user_response
        if isinstance(result, Exception):
            raise result
        return result


class MembershipTests(unittest.TestCase):
    def verifier(self, **kwargs):
        fake = FakeTelegram(**kwargs)
        return TelegramMembershipVerifier(TEST_TOKEN, transport=fake), fake

    def test_members_owner_and_admin_are_allowed(self):
        for status in ("member", "administrator", "creator"):
            with self.subTest(status=status):
                verifier, fake = self.verifier(user_response=member(status))
                self.assertEqual(verifier.check(USER_ID).as_dict(), {
                    "chat_id": GROUP_CHAT_ID, "user_id": USER_ID, "is_member": True
                })
                self.assertEqual(fake.calls[-1][1], {"chat_id": GROUP_CHAT_ID, "user_id": USER_ID})

    def test_restricted_user_requires_explicit_boolean_membership(self):
        for value in (True, False):
            with self.subTest(value=value):
                verifier, _ = self.verifier(user_response=member("restricted", is_member=value))
                self.assertIs(verifier.check(USER_ID).is_member, value)
        for value in (None, 1, "true"):
            with self.subTest(value=value):
                verifier, _ = self.verifier(user_response=member("restricted", is_member=value))
                with self.assertRaises(MembershipUnavailable):
                    verifier.check(USER_ID)

    def test_left_and_kicked_are_denied(self):
        for status in ("left", "kicked"):
            with self.subTest(status=status):
                verifier, _ = self.verifier(user_response=member(status))
                self.assertFalse(verifier.check(USER_ID).is_member)
                with self.assertRaises(MembershipRequired) as caught:
                    verifier.require_member(USER_ID)
                self.assertEqual(caught.exception.status_code, 403)
                self.assertEqual(caught.exception.detail, {
                    "code": "GROUP_MEMBERSHIP_REQUIRED", "chat_id": GROUP_CHAT_ID
                })

    def test_unknown_status_and_malformed_result_fail_closed(self):
        responses = [member("future_status"), member([]), member({}), {}, [], {"ok": True, "result": []},
                     {"ok": 1, "result": {}}, {"ok": True, "result": {"status": "member"}}]
        for response in responses:
            with self.subTest(response=response):
                verifier, _ = self.verifier(user_response=response)
                with self.assertRaises(MembershipUnavailable):
                    verifier.check(USER_ID)

    def test_wrong_returned_identity_never_grants_membership(self):
        for wrong_id in (USER_ID + 1, str(USER_ID), True):
            with self.subTest(wrong_id=wrong_id):
                verifier, _ = self.verifier(user_response=member(user_id=wrong_id))
                with self.assertRaises(MembershipUnavailable):
                    verifier.check(USER_ID)

    def test_bot_must_currently_be_admin_and_own_identity_must_match(self):
        for response in (member("member", BOT_ID), member("left", BOT_ID),
                         member([], BOT_ID), member("administrator", 999)):
            with self.subTest(response=response):
                verifier, fake = self.verifier(own_response=response)
                with self.assertRaises(MembershipUnavailable):
                    verifier.check(USER_ID)
                self.assertEqual(len(fake.calls), 2)

    def test_bad_get_me_cannot_establish_bot_identity(self):
        for result in ({"id": BOT_ID, "is_bot": False}, {"id": "123", "is_bot": True}, {}):
            with self.subTest(result=result):
                verifier, _ = self.verifier(me_response={"ok": True, "result": result})
                with self.assertRaises(MembershipUnavailable):
                    verifier.check(USER_ID)

    def test_invalid_authenticated_id_is_rejected_before_network(self):
        for user_id in (0, -1, "456", True, None, 2**53):
            with self.subTest(user_id=user_id):
                verifier, fake = self.verifier()
                with self.assertRaises(MembershipUnavailable):
                    verifier.check(user_id)
                self.assertEqual(fake.calls, [])

    def test_missing_token_is_unavailable_without_network(self):
        fake = FakeTelegram()
        with patch.dict("os.environ", {}, clear=True):
            verifier = TelegramMembershipVerifier(transport=fake)
        with self.assertRaises(MembershipUnavailable):
            verifier.check(USER_ID)
        self.assertEqual(fake.calls, [])

    def test_telegram_failure_and_timeout_are_sanitized(self):
        secret_text = "https://api.telegram.org/bot" + TEST_TOKEN
        for response in ({"ok": False, "description": secret_text}, TimeoutError(secret_text), ValueError(secret_text)):
            with self.subTest(response=type(response).__name__):
                verifier, _ = self.verifier(user_response=response)
                with self.assertRaises(MembershipUnavailable) as caught:
                    verifier.check(USER_ID)
                self.assertEqual(str(caught.exception), "GROUP_MEMBERSHIP_UNAVAILABLE")
                self.assertEqual(caught.exception.status_code, 503)
                self.assertIsNone(caught.exception.__cause__)

    def test_user_membership_is_not_cached(self):
        verifier, fake = self.verifier()
        self.assertTrue(verifier.check(USER_ID).is_member)
        fake.user_response = member("left")
        self.assertFalse(verifier.check(USER_ID).is_member)
        self.assertEqual([call[0] for call in fake.calls].count("getMe"), 1)
        self.assertEqual([call[0] for call in fake.calls].count("getChatMember"), 4)

    def test_losing_bot_admin_permission_blocks_later_checks(self):
        verifier, fake = self.verifier()
        verifier.check(USER_ID)
        fake.own_response = member("member", BOT_ID)
        with self.assertRaises(MembershipUnavailable):
            verifier.check(USER_ID)

    def test_direct_creation_cannot_write_when_denied_or_verification_fails(self):
        for response, error_type in ((member("left"), MembershipRequired),
                                     ({"ok": False}, MembershipUnavailable),
                                     (TimeoutError("offline"), MembershipUnavailable)):
            with self.subTest(error=error_type.__name__):
                verifier, _ = self.verifier(user_response=response)
                writes = []
                with self.assertRaises(error_type):
                    verifier.create_for_member(USER_ID, lambda: writes.append("created"))
                self.assertEqual(writes, [])

    def test_successful_creation_rechecks_after_earlier_ui_check(self):
        verifier, fake = self.verifier()
        self.assertTrue(verifier.check(USER_ID).is_member)
        writes = []
        verifier.create_for_member(USER_ID, lambda: writes.append("created"))
        self.assertEqual(writes, ["created"])
        fake.user_response = member("left")
        with self.assertRaises(MembershipRequired):
            verifier.create_for_member(USER_ID, lambda: writes.append("created again"))
        self.assertEqual(writes, ["created"])

    def test_default_transport_uses_https_post_and_timeout(self):
        with patch("telegram_membership.build_opener") as opener:
            response = opener.return_value.open.return_value.__enter__.return_value
            response.status = 200
            response.read.return_value = b'{"ok": true, "result": {}}'
            telegram_transport(TEST_TOKEN, "getMe", {}, 5.0)
            args, kwargs = opener.return_value.open.call_args
            self.assertEqual(args[0].full_url, f"https://api.telegram.org/bot{TEST_TOKEN}/getMe")
            self.assertEqual(args[0].method, "POST")
            self.assertEqual(kwargs["timeout"], 5.0)

    def test_default_transport_sanitizes_network_exception(self):
        with patch("telegram_membership.build_opener") as opener:
            opener.return_value.open.side_effect = OSError(TEST_TOKEN)
            with self.assertRaises(MembershipUnavailable) as caught:
                telegram_transport(TEST_TOKEN, "getMe", {}, 5.0)
            self.assertNotIn(TEST_TOKEN, str(caught.exception))


if __name__ == "__main__":
    unittest.main()
