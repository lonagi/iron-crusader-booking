import { Link } from 'react-router-dom'

export function ClubMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <path d="M24 3 43 11v16c0 9-19 18-19 18S5 36 5 27V11L24 3Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="m20 12 4 3 4-3v9h9l-3 4 3 4h-9v10l-4-3-4 3V29h-9l3-4-3-4h9V12Z" fill="currentColor" />
    </svg>
  )
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link to="/book" aria-label="Iron Crusader home" className={`inline-flex items-center gap-3 ${inverse ? 'text-[#f5f3ed]' : 'text-gold'}`}>
      <ClubMark className="h-11 w-11 shrink-0" />
      <span>
        <span className="block font-display text-[21px] font-medium leading-none tracking-[.035em] uppercase">Iron Crusader</span>
        <span className="block mt-1.5 text-[9px] font-semibold uppercase tracking-[.23em] opacity-75">Warhammer Club</span>
      </span>
    </Link>
  )
}
