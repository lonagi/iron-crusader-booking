// This is a required server contract, not a browser-side security boundary.
// The API must repeat this check before writing every new booking.
export const REQUIRED_GROUP_ID = '-1001499989408'
export const MEMBERSHIP_PATH = '/api/v1/auth/membership'

export interface GroupMembership {
  chat_id: typeof REQUIRED_GROUP_ID
  user_id: number
  is_member: boolean
}

export type MembershipErrorCode = 'GROUP_MEMBERSHIP_REQUIRED' | 'GROUP_MEMBERSHIP_UNAVAILABLE'

export class MembershipError extends Error {
  constructor(public code: MembershipErrorCode) {
    super(code === 'GROUP_MEMBERSHIP_REQUIRED'
      ? 'Booking is available to members of the club Telegram group.'
      : 'We could not check your group membership. Please try again.')
    this.name = 'MembershipError'
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readMembership(value: unknown, userId: number): GroupMembership {
  if (!Number.isSafeInteger(userId) || userId <= 0 || !record(value) ||
    value.chat_id !== REQUIRED_GROUP_ID || value.user_id !== userId || typeof value.is_member !== 'boolean') {
    throw new MembershipError('GROUP_MEMBERSHIP_UNAVAILABLE')
  }
  return { chat_id: REQUIRED_GROUP_ID, user_id: userId, is_member: value.is_member }
}

// A generic 403 can have another cause; only the agreed error for our group
// should tell someone to join the club.
export function membershipApiError(status: number, body: unknown): MembershipError | null {
  if (!record(body) || !record(body.detail) || body.detail.chat_id !== REQUIRED_GROUP_ID) return null
  if (status === 403 && body.detail.code === 'GROUP_MEMBERSHIP_REQUIRED') return new MembershipError('GROUP_MEMBERSHIP_REQUIRED')
  if (status === 503 && body.detail.code === 'GROUP_MEMBERSHIP_UNAVAILABLE') return new MembershipError('GROUP_MEMBERSHIP_UNAVAILABLE')
  return null
}

export async function createAfterMembershipCheck<T>(options: {
  userId: number
  check: () => Promise<unknown>
  sessionStillCurrent: () => boolean
  create: () => Promise<T>
}): Promise<T> {
  const membership = readMembership(await options.check(), options.userId)
  if (!options.sessionStillCurrent()) throw new MembershipError('GROUP_MEMBERSHIP_UNAVAILABLE')
  if (!membership.is_member) throw new MembershipError('GROUP_MEMBERSHIP_REQUIRED')
  return options.create()
}

export function telegramGroupUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.hostname !== 't.me' || url.username || url.password || url.port || url.hash) return undefined
    // Public group names and invite links. An internal t.me/c link cannot invite.
    if (!/^\/(?:\+[A-Za-z0-9_-]+|joinchat\/[A-Za-z0-9_-]+|[A-Za-z][A-Za-z0-9_]{3,})\/?$/.test(url.pathname)) return undefined
    if (url.search) return undefined
    return url.href
  } catch { return undefined }
}
