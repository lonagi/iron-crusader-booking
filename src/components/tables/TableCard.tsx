import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { BookingOut, TableOut } from '@/api/types'
import { formatTime, getTableAvailability } from '@/lib/availability'
import { AvailabilityTimeline } from '@/components/booking/AvailabilityTimeline'
import { usePreferences } from '@/preferences/PreferencesContext'

interface TableCardProps {
  table: TableOut
  date: string
  bookings?: BookingOut[]
  onClick?: (initialHour?: number) => void
  compact?: boolean
}

export function TableCard({ table, date, bookings = [], onClick, compact = false }: TableCardProps) {
  const { t } = usePreferences()
  const availability = getTableAvailability(bookings, table.id, date)
  const busyTimes = availability.busy.map(range => `${formatTime(range.start)} - ${formatTime(range.end)}`).join(', ')
  const isFull = availability.slots.every(slot => !slot.available)

  return (
    <article className={cn('flex h-full flex-col rounded-xl border border-border/70 bg-surface p-5 sm:p-6', compact && 'sm:p-4', !table.is_active && 'opacity-60')}>
      <button
        type="button"
        onClick={() => onClick?.()}
        disabled={!table.is_active || !onClick}
        className="group flex min-h-11 w-full items-start justify-between gap-4 rounded-md text-left disabled:cursor-default"
        aria-label={t('View the schedule for {name}', { name: table.name })}
      >
        <span className="break-words text-xl font-semibold leading-snug text-text">{table.name}</span>
        <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-dim transition-colors group-hover:text-gold" aria-hidden="true" />
      </button>

      {!table.is_active ? <p className="mt-3 text-base text-dim">{t('Unavailable')}</p> : <>
        <div className="mt-3"><AvailabilityTimeline availability={availability} /></div>
        <p className="mt-4 text-sm leading-relaxed text-dim">
          {busyTimes ? t('Busy: {times}', { times: busyTimes }) : t('Free all day')}
        </p>
        <div className="mt-5 border-t border-border/60 pt-4">
          {isFull ? <p className="text-base text-dim">{t('No full hours available')}</p> : <p className="mb-3 text-sm font-medium text-text">{t('Choose a free time')}</p>}
          <div className="flex flex-wrap gap-2">
            {availability.free.map(range => {
              const firstSlot = availability.slots.find(slot => slot.available && slot.hour * 60 >= range.start && (slot.hour + 1) * 60 <= range.end)
              const times = `${formatTime(range.start)} - ${formatTime(range.end)}`
              return firstSlot && onClick ? (
                <button
                  type="button"
                  key={range.start}
                  onClick={() => onClick(firstSlot.hour)}
                  className="min-h-11 rounded-lg border border-gold/25 px-3 py-2.5 text-[15px] font-semibold tabular-nums text-gold transition-colors hover:border-gold/60 hover:bg-gold/10"
                  aria-label={t('Book {name} from {time}. Free {times}.', { name: table.name, time: formatTime(firstSlot.hour * 60), times })}
                >
                  {times}
                </button>
              ) : <span key={range.start} className="inline-flex min-h-11 items-center text-sm tabular-nums text-dim">{t('Free: {times}', { times })}</span>
            })}
          </div>
        </div>
      </>}
    </article>
  )
}
