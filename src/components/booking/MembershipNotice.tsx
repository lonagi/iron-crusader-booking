import { useId } from 'react'
import { CircleAlert, LoaderCircle, UsersRound } from 'lucide-react'
import { usePreferences } from '@/preferences/PreferencesContext'

export interface MembershipNoticeProps {
  status: 'checking' | 'member' | 'nonmember' | 'unavailable'
  onRetry: () => void
  retrying?: boolean
  groupUrl?: string
  retryLabel?: string
}

export function MembershipNotice({ status, onRetry, retrying = false, groupUrl, retryLabel }: MembershipNoticeProps) {
  const { t } = usePreferences()
  const titleId = useId()

  if (status === 'member') return null

  if (status === 'checking') {
    return (
      <p role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl bg-raised px-4 py-4 text-base leading-relaxed text-dim">
        <LoaderCircle aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" />
        {t('Checking your group membership')}
      </p>
    )
  }

  const nonmember = status === 'nonmember'
  const Icon = nonmember ? UsersRound : CircleAlert

  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <div role="status" aria-live="polite" aria-atomic="true">
            <h3 id={titleId} className="text-lg font-semibold leading-snug text-text">
              {t(nonmember ? 'Booking is for club members' : 'We could not check your group membership')}
            </h3>
            <p className="mt-2 text-base leading-relaxed text-dim">
              {t(nonmember ? 'Join the club group to book a table.' : 'Booking is temporarily unavailable. Please try again.')}
            </p>
            {nonmember && !groupUrl && (
              <p className="mt-1 text-base leading-relaxed text-dim">{t('Ask a club administrator for the group link.')}</p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {nonmember && groupUrl && (
              <a href={groupUrl} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-11 whitespace-normal text-center">
                {t('Open the club group')}
              </a>
            )}
            <button type="button" onClick={onRetry} disabled={retrying} aria-busy={retrying} className="btn-secondary min-h-11 whitespace-normal text-center">
              {retrying && <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />}
              {t(retrying ? 'Checking your group membership' : retryLabel ?? (nonmember ? 'Check membership again' : 'Retry membership check'))}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
