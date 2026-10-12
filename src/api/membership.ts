import { getSession, api, HttpError } from './client'
import { MEMBERSHIP_PATH, MembershipError, readMembership } from '../auth/membership'

export async function checkGroupMembership() {
  const session = getSession()
  if (!session) throw new MembershipError('GROUP_MEMBERSHIP_UNAVAILABLE')
  try {
    const data = await api.get<unknown>(MEMBERSHIP_PATH, { cache: 'no-store' })
    if (getSession()?.token !== session.token) throw new MembershipError('GROUP_MEMBERSHIP_UNAVAILABLE')
    return readMembership(data, session.user_id)
  } catch (error) {
    if (error instanceof MembershipError || (error instanceof HttpError && error.status === 401)) throw error
    // Missing endpoint, invalid response and network failure all block creation.
    throw new MembershipError('GROUP_MEMBERSHIP_UNAVAILABLE')
  }
}
