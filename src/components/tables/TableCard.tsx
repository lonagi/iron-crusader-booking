import { ArrowRight, Armchair } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { BookingOut, TableOut } from '@/api/types'
import { clubHours, timeStrToHour } from '@/lib/dates'
import { usePreferences } from '@/preferences/PreferencesContext'

interface TableCardProps {
  table: TableOut
  bookings?: BookingOut[]
  onClick?: () => void
  compact?: boolean
}

export function TableCard({ table, bookings = [], onClick, compact = false }: TableCardProps) {
  const { t } = usePreferences()
  const tableBookings = bookings.filter(booking => booking.table_id === table.id)
  const hours = clubHours()
  const free = hours.filter(hour => !tableBookings.some(booking => timeStrToHour(booking.start_time) <= hour && timeStrToHour(booking.end_time) > hour))
  const isFull = free.length === 0
  const availability = t(!table.is_active ? 'Unavailable' : isFull ? 'Fully booked' : free.length === hours.length ? 'Free all day' : 'Available hours: {count}', { count: free.length })

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!table.is_active || !onClick}
      className={cn('table-choice group', compact && 'p-4')}
      aria-label={t('{name}. {availability}. View times.', { name: table.name, availability })}
    >
      <span className="flex w-full items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised text-dim" aria-hidden="true"><Armchair className="h-6 w-6" strokeWidth={1.5} /></span>
        <span className="min-w-0">
          <span className="block break-words text-xl font-semibold leading-snug text-text">{table.name}</span>
          <span className={cn('mt-2 block text-sm leading-relaxed', isFull ? 'text-muted' : 'text-dim')}>{availability}</span>
        </span>
      </span>
      <span className="mt-7 flex w-full items-center justify-between gap-3 text-[15px] font-semibold text-gold">
        <span>{t('View times')}</span><ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </button>
  )
}
