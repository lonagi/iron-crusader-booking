import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Calendar, Clock } from 'lucide-react'
import { useMyBookings, useTables, useCancelBooking } from '@/api/hooks'
import { useToast } from '@/lib/toast'
import { formatDate } from '@/lib/dates'

export function MyBookingsPage() {
  const { data: bookings = [], isLoading, refetch } = useMyBookings()
  const { data: tables = [] } = useTables()
  const cancelBooking = useCancelBooking()
  const toast = useToast()

  const tableMap = Object.fromEntries(tables.map(t => [t.id, t]))

  async function handleCancel(id: number) {
    try {
      await cancelBooking.mutateAsync(id)
      toast('Booking cancelled', 'info')
      refetch()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel', 'error')
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-text tracking-tight">My Bookings</h1>
        <p className="text-sm text-muted mt-1">Your upcoming table reservations</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg animate-pulse" style={{ height: '72px', background: '#111', border: '1px solid #1e1e1e' }} />
          ))}
        </div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-sm font-medium text-dim">No upcoming bookings</p>
          <p className="text-xs text-muted mt-1">Go to Reservations to book a table</p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {bookings.map(booking => {
          const table = tableMap[booking.table_id]
          const duration = parseInt(booking.end_time.split(':')[0]) - parseInt(booking.start_time.split(':')[0])

          return (
            <motion.div
              key={booking.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="card px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-xl shrink-0"
                  style={{ background: '#161616', border: '1px solid #2a2a2a' }}
                >
                  {table?.emoji ?? '🎲'}
                </div>
                <div>
                  <div className="text-sm font-medium text-text">{table?.name ?? `Table #${booking.table_id}`}</div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Calendar className="w-3 h-3" />
                      {formatDate(booking.date)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gold">
                      <Clock className="w-3 h-3" />
                      {booking.start_time.slice(0, 5)} – {booking.end_time.slice(0, 5)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-lg font-semibold text-text">{duration}h</div>
                </div>
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancelBooking.isPending}
                  className="btn btn-danger text-xs py-1.5 px-3"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">Cancel</span>
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
