import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CalendarDays, Clock, RefreshCw, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useMyBookings, useTables, useCancelBooking } from '@/api/hooks'
import { useToast } from '@/lib/toast'
import { formatDate } from '@/lib/dates'

function durationLabel(start: string, end: string) {
  const minutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  const duration = minutes(end) - minutes(start)
  const hours = Math.floor(duration / 60)
  const remainder = duration % 60
  return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ')
}

export function MyBookingsPage() {
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
      toast('Booking cancelled', 'info')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not cancel the booking. Try again.', 'error')
    }
  }

  return (
    <div className="max-w-4xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="label mb-2">Your visits</p>
          <h1 className="font-display text-4xl tracking-tight text-text sm:text-5xl">My bookings</h1>
          <p className="mt-3 text-sm text-dim">View or cancel your table bookings.</p>
        </div>
        {bookings.length > 0 && (
          <Link to="/book" className="btn btn-secondary">
            Book a table <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </header>

      {isLoading && (
        <div className="space-y-3" role="status" aria-label="Loading bookings">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      )}

      {isError && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-6" role="alert">
          <div>
            <h2 className="font-semibold text-text">Could not load your bookings</h2>
            <p className="mt-1 text-sm text-dim">Check your connection and try again.</p>
          </div>
          <button onClick={() => refetch()} className="btn btn-secondary">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && bookings.length === 0 && (
        <div className="card px-6 py-12 text-center sm:py-16">
          <CalendarDays className="mx-auto mb-5 h-8 w-8 text-gold" aria-hidden="true" strokeWidth={1.5} />
          <h2 className="font-display text-2xl text-text">No plans yet</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-dim">Choose a table and a time for your next game.</p>
          <Link to="/book" className="btn btn-primary mt-6">
            Book a table <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedBookings.map(booking => {
            const tableName = tableMap[booking.table_id]?.name ?? `Table ${booking.table_id}`
            const date = parseISO(booking.date)
            return (
              <motion.article
                key={booking.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="card flex flex-wrap items-center gap-4 p-5 sm:gap-5 sm:p-6"
              >
                <div className="w-14 shrink-0 border-r border-border pr-4 text-center sm:w-16" aria-hidden="true">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">{format(date, 'MMM')}</div>
                  <div className="font-display text-3xl leading-tight text-gold">{format(date, 'dd')}</div>
                </div>
                <div className="min-w-0 flex-1 basis-36">
                  <h2 className="break-words text-base font-semibold text-text">{tableName}</h2>
                  <p className="mt-1 text-sm text-dim">{formatDate(booking.date)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {booking.start_time.slice(0, 5)} to {booking.end_time.slice(0, 5)}
                    </span>
                    <span className="text-muted">{durationLabel(booking.start_time, booking.end_time)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancelBooking.isPending}
                  aria-label={`Cancel ${tableName} booking on ${formatDate(booking.date)} at ${booking.start_time.slice(0, 5)}`}
                  className="btn btn-danger ml-auto text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {cancelBooking.isPending && cancelBooking.variables === booking.id ? 'Cancelling' : 'Cancel'}
                </button>
              </motion.article>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
