import { ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
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
  const total = clubHours().length
  const booked = Math.min(total, tableBookings.reduce((sum, booking) => sum + timeStrToHour(booking.end_time) - timeStrToHour(booking.start_time), 0))
  const isFull = booked >= total

  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      onClick={onClick}
      disabled={!table.is_active || !onClick}
      className={cn('group flex h-full w-full flex-col rounded-lg border border-border bg-surface text-left transition-colors hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-bg disabled:cursor-default disabled:opacity-50', compact ? 'p-4' : 'p-5 sm:p-6')}
      aria-label={t('{name}. {availability}. View times.', { name: table.name, availability: t(!table.is_active ? 'Unavailable' : isFull ? 'Fully booked' : 'Available hours: {count}', { count: total - booked }) })}
    >
      <div className="mb-5 flex w-full items-center justify-between gap-3">
        <span className="label">{t('Table {number}', { number: String(table.id).padStart(2, '0') })}</span>
        <span className={isFull ? 'badge-full' : 'badge-open'}>{t(!table.is_active ? 'Unavailable' : isFull ? 'Fully booked' : 'Available')}</span>
      </div>

      {!compact && (
        <div className="relative mb-6 flex h-28 w-full items-center justify-center overflow-hidden rounded-md bg-raised" aria-hidden="true">
          <div className="absolute inset-x-5 top-1/2 border-t border-border/70" />
          <div className="absolute inset-y-4 left-1/2 border-l border-border/70" />
          <div className="relative flex h-16 w-28 items-center justify-center rounded border border-gold/30 bg-surface text-gold shadow-sm transition-transform duration-300 group-hover:scale-105">
            <span className="absolute -top-2 left-4 h-1.5 w-6 rounded-t-sm bg-gold/25" />
            <span className="absolute -top-2 right-4 h-1.5 w-6 rounded-t-sm bg-gold/25" />
            <span className="font-display text-3xl leading-none">{String(table.id).padStart(2, '0')}</span>
            <span className="absolute -bottom-2 left-4 h-1.5 w-6 rounded-b-sm bg-gold/25" />
            <span className="absolute -bottom-2 right-4 h-1.5 w-6 rounded-b-sm bg-gold/25" />
          </div>
        </div>
      )}

      <h3 className={cn('font-display leading-tight text-text', compact ? 'text-2xl' : 'text-[28px]')}>{table.name}</h3>
      <p className="mt-2 text-xs text-dim">{isFull ? t('Check the schedule for details') : t('Available hours: {count}', { count: total - booked })}</p>

      {!compact && (
        <div className="mt-5 flex w-full gap-1" aria-hidden="true">
          {clubHours().map(hour => {
            const taken = tableBookings.some(booking => timeStrToHour(booking.start_time) <= hour && timeStrToHour(booking.end_time) > hour)
            return <span key={hour} className={cn('h-1.5 flex-1 rounded-sm', taken ? 'bg-gold/60' : 'bg-border')} />
          })}
        </div>
      )}
      <div className="mt-5 flex w-full items-center justify-between border-t border-border pt-4 text-xs font-semibold text-gold">
        <span>{t('View times')}</span>
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </motion.button>
  )
}
