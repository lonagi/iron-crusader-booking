import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CalendarDays, Clock, RefreshCw, Trash2 } from 'lucide-react'
import { useMyBookings, useTables, useCancelBooking } from '@/api/hooks'
import { useToast } from '@/lib/toast'
import { usePreferences } from '@/preferences/PreferencesContext'

function durationLabel(start: string, end: string, locale: string) {
  const minutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  const duration = minutes(end) - minutes(start)
  const hours = Math.floor(duration / 60)
  const remainder = duration % 60
  const unit = (value: number, name: 'hour' | 'minute') => new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'short' }).format(value)
  return [hours ? unit(hours, 'hour') : '', remainder ? unit(remainder, 'minute') : ''].filter(Boolean).join(' ')
}

export function MyBookingsPage() {
  const { t, formatDate, locale } = usePreferences()
  const { data: bookings = [], isLoading, isError, refetch } = useMyBookings()
  const { data: tables = [] } = useTables()
  const cancelBooking = useCancelBooking()
  const toast = useToast()
  const tableMap = Object.fromEntries(tables.map(table => [table.id, table]))
  const sortedBookings = [...bookings].sort((a, b) =>
    `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`),
  )

  async function handleCancel(id: number) {
    try {
      await cancelBooking.mutateAsync(id)
      toast(t('Booking cancelled'), 'info')
    } catch (err) {
      toast(t(err instanceof Error ? err.message : 'Could not cancel the booking. Try again.'), 'error')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 sm:space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="page-heading">{t('My bookings')}</h1>
          <p className="mt-3 text-base leading-relaxed text-dim">{t('View or cancel your table bookings.')}</p>
        </div>
        {bookings.length > 0 && (
          <Link to="/book" className="btn btn-secondary">
            {t('Book a table')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </header>

      {isLoading && (
        <div className="space-y-3" role="status" aria-label={t('Loading bookings')}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      )}

      {isError && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-6" role="alert">
          <div>
            <h2 className="font-semibold text-text">{t('Could not load your bookings')}</h2>
            <p className="mt-2 text-base text-dim">{t('Check your connection and try again.')}</p>
          </div>
          <button onClick={() => refetch()} className="btn btn-secondary">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> {t('Try again')}
          </button>
        </div>
      )}

      {!isLoading && !isError && bookings.length === 0 && (
        <div className="card px-6 py-12 text-center sm:py-16">
          <CalendarDays className="mx-auto mb-5 h-8 w-8 text-gold" aria-hidden="true" strokeWidth={1.5} />
          <h2 className="text-2xl font-semibold text-text">{t('No plans yet')}</h2>
          <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-dim">{t('Choose a table and a time for your next game.')}</p>
          <Link to="/book" className="btn btn-primary mt-6">
            {t('Book a table')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {sortedBookings.map(booking => {
            const tableName = tableMap[booking.table_id]?.name ?? t('Table {number}', { number: booking.table_id })
            return (
              <motion.article
                key={booking.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="card flex flex-wrap items-center gap-5 p-5 sm:gap-8 sm:p-7"
              >
                <div className="min-w-0 flex-1 basis-52">
                  <h2 className="break-words text-lg font-semibold text-text">{tableName}</h2>
                  <p className="mt-2 text-sm text-dim">{formatDate(booking.date)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-text">
                    <span className="inline-flex items-center gap-2 tabular-nums">
                      <Clock className="h-4 w-4 text-muted" aria-hidden="true" />
                      {t('{start} to {end}', { start: booking.start_time.slice(0, 5), end: booking.end_time.slice(0, 5) })}
                    </span>
                    <span className="text-sm text-muted">{durationLabel(booking.start_time, booking.end_time, locale)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancelBooking.isPending}
                  aria-label={t('Cancel {table} booking on {date} at {time}', { table: tableName, date: formatDate(booking.date), time: booking.start_time.slice(0, 5) })}
                  className="btn btn-danger w-full sm:ml-auto sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t(cancelBooking.isPending && cancelBooking.variables === booking.id ? 'Cancelling' : 'Cancel')}
                </button>
              </motion.article>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
