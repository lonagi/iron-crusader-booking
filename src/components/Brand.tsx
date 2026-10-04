import { Link } from 'react-router-dom'
import { usePreferences } from '@/preferences/PreferencesContext'

export function ClubMark({ className = '' }: { className?: string }) {
  const { t } = usePreferences()
  return <img src={`${import.meta.env.BASE_URL}club-logo.jpg`} alt={t('Iron Crusader club image')} width="640" height="640" className={`rounded-md object-cover ${className}`} />
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  const { t } = usePreferences()
  return (
    <Link to="/book" aria-label={t('Iron Crusader home')} className={`inline-flex min-w-0 items-center gap-3 ${inverse ? 'text-[#f5ede1]' : 'text-text'}`}>
      <ClubMark className="h-12 w-12 shrink-0 ring-1 ring-border" />
      <span className="min-w-0">
        <span className="block font-display text-[21px] font-medium leading-none tracking-[.035em] uppercase">Iron Crusader</span>
        <span className="block mt-1.5 text-[9px] font-semibold uppercase tracking-[.16em] opacity-75">{t('Warhammer Club')}</span>
      </span>
    </Link>
  )
}
