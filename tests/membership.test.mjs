import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/auth/membership.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
const { REQUIRED_GROUP_ID, MembershipError, readMembership, membershipApiError, createAfterMembershipCheck, telegramGroupUrl, membershipCheckEnabled } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const member = { chat_id: REQUIRED_GROUP_ID, user_id: 42, is_member: true }

test('the optional membership integration is off unless explicitly configured', () => {
  for (const value of [undefined, '', 'false', '0', '1', 'TRUE']) assert.equal(membershipCheckEnabled(value), false)
  assert.equal(membershipCheckEnabled('true'), true)
})

test('the existing API can create bookings without calling the unsupported membership endpoint', async () => {
  let checks = 0
  let writes = 0
  const options = {
    checkMembership: membershipCheckEnabled(undefined), userId: 42,
    check: async () => { checks++; throw new Error('Endpoint does not exist') },
    sessionStillCurrent: () => true, create: async () => ++writes,
  }
  assert.equal(await createAfterMembershipCheck(options), 1)
  assert.equal(checks, 0)
  await assert.rejects(createAfterMembershipCheck({ ...options, sessionStillCurrent: () => false }))
  assert.equal(writes, 1)
  const forbidden = new MembershipError('GROUP_MEMBERSHIP_REQUIRED')
  await assert.rejects(createAfterMembershipCheck({ ...options, create: async () => { throw forbidden } }), error => error === forbidden)
})

test('membership is bound to the requested group and signed-in account', () => {
  assert.equal(REQUIRED_GROUP_ID, '-1001499989408')
  assert.deepEqual(readMembership(member, 42), member)
  assert.equal(readMembership({ ...member, is_member: false }, 42).is_member, false)
  for (const invalid of [null, {}, [], { is_member: true },
    { ...member, chat_id: '-1000000000000' }, { ...member, user_id: 43 },
    { ...member, user_id: '42' }, { ...member, is_member: 'true' },
    { ...member, is_member: 1 }, { ...member, is_member: null },
  ]) assert.throws(() => readMembership(invalid, 42), error => error.code === 'GROUP_MEMBERSHIP_UNAVAILABLE')
  for (const userId of [0, -1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => readMembership({ ...member, user_id: userId }, userId), MembershipError)
  }
})

test('only explicit membership errors for our group are classified as such', () => {
  const required = { detail: { code: 'GROUP_MEMBERSHIP_REQUIRED', chat_id: REQUIRED_GROUP_ID } }
  assert.equal(membershipApiError(403, required).code, 'GROUP_MEMBERSHIP_REQUIRED')
  assert.equal(membershipApiError(503, { detail: { code: 'GROUP_MEMBERSHIP_UNAVAILABLE', chat_id: REQUIRED_GROUP_ID } }).code, 'GROUP_MEMBERSHIP_UNAVAILABLE')
  for (const value of [null, {}, { detail: 'Not admin' }, { detail: { code: 'GROUP_MEMBERSHIP_REQUIRED' } },
    { detail: { code: 'GROUP_MEMBERSHIP_REQUIRED', chat_id: '-1000000000000' } },
  ]) assert.equal(membershipApiError(403, value), null)
  assert.equal(membershipApiError(401, required), null)
  assert.equal(membershipApiError(500, required), null)
})

test('creation happens after a fresh positive membership check', async () => {
  const calls = []
  const result = await createAfterMembershipCheck({
    userId: 42,
    check: async () => { calls.push('check'); return member },
    sessionStillCurrent: () => true,
    create: async () => { calls.push('create'); return { id: 123 } },
  })
  assert.deepEqual(calls, ['check', 'create'])
  assert.deepEqual(result, { id: 123 })
})

test('nonmembership, missing endpoint, outage and malformed responses never create a booking', async () => {
  for (const check of [
    async () => ({ ...member, is_member: false }),
    async () => null,
    async () => ({ ...member, user_id: 99 }),
    async () => { throw new Error('404') },
    async () => { throw new Error('503') },
    async () => { throw new Error('Network timeout') },
  ]) {
    let writes = 0
    await assert.rejects(createAfterMembershipCheck({ userId: 42, check, sessionStillCurrent: () => true, create: async () => { writes++ } }))
    assert.equal(writes, 0)
  }
})

test('sign-out or an account switch while checking cannot create a booking', async () => {
  let writes = 0
  await assert.rejects(createAfterMembershipCheck({
    userId: 42, check: async () => member, sessionStillCurrent: () => false,
    create: async () => { writes++ },
  }), error => error.code === 'GROUP_MEMBERSHIP_UNAVAILABLE')
  assert.equal(writes, 0)
})

test('membership is checked again for every creation attempt after leaving the group', async () => {
  let checks = 0
  let writes = 0
  const options = {
    userId: 42, check: async () => ({ ...member, is_member: ++checks === 1 }),
    sessionStillCurrent: () => true, create: async () => ++writes,
  }
  assert.equal(await createAfterMembershipCheck(options), 1)
  await assert.rejects(createAfterMembershipCheck(options), error => error.code === 'GROUP_MEMBERSHIP_REQUIRED')
  assert.equal(checks, 2)
  assert.equal(writes, 1)
})

test('the server may still reject creation after a positive frontend check', async () => {
  const error = new MembershipError('GROUP_MEMBERSHIP_REQUIRED')
  await assert.rejects(createAfterMembershipCheck({
    userId: 42, check: async () => member, sessionStillCurrent: () => true,
    create: async () => { throw error },
  }), value => value === error)
})

test('group links accept Telegram invites without turning an ID into a fake invite', () => {
  for (const value of ['https://t.me/+AbCd_123-x', 'https://t.me/joinchat/AbCd_123-x', 'https://t.me/example_club']) {
    assert.equal(telegramGroupUrl(value), value)
  }
  for (const value of [undefined, '', REQUIRED_GROUP_ID, 'javascript:alert(1)', 'http://t.me/example_club',
    'https://evil.example/example_club', 'https://t.me.evil.example/example_club',
    'https://name:secret@t.me/example_club', 'https://t.me/c/1499989408', 'https://t.me/example_club?start=auth',
  ]) assert.equal(telegramGroupUrl(value), undefined)
})
