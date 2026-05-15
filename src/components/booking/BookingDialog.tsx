import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { clubHours, hourToTimeStr, timeStrToHour } from '@/lib/dates'
import { useCreateBooking, useCancelBooking } from '@/api/hooks'
import { useSession } from '@/auth/SessionContext'
import { useToast } from '@/lib/toast'
import { HttpError } from '@/api/client'
import type { BookingOut, TableOut } from '@/api/types'

interface BookingDialogProps {
  table: TableOut
  date: string
  bookings: BookingOut[]
  onClose: () => void
  onRefresh: () => void
}

export function BookingDialog({ table, date, bookings, onClose, onRefresh }: BookingDialogProps) {
  const { session } = useSession()
  const toast = useToast()
  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()
  const hours = clubHours()

  const [selStart, setSelStart] = useState<number | null>(null)
  const [selEnd,   setSelEnd]   = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [shake,    setShake]    = useState(false)

  const tableBookings = bookings.filter(b => b.table_id === table.id)
  const hourMap: Record<number, BookingOut> = {}
  for (const b of tableBookings) {
    const s = timeStrToHour(b.start_time)
    const e = timeStrToHour(b.end_time)
    for (let h = s; h < e; h++) hourMap[h] = b
  }

  const selMin = selStart !== null && selEnd !== null ? Math.min(selStart, selEnd) : null
  const selMax = selStart !== null && selEnd !== null ? Math.max(selStart, selEnd) : null
  const isSelected = (h: number) => selMin !== null && selMax !== null && h >= selMin && h <= selMax

  const getValidRange = useCallback((): [number, number] | null => {
    if (selMin === null || selMax === null) return null
    for (let h = selMin; h <= selMax; h++) if (hourMap[h]) return null
    return [selMin, selMax + 1]
  }, [selMin, selMax, hourMap])

  async function handleBook() {
    const range = getValidRange()
    if (!range) { toast('Select a free time range', 'warning'); return }
    const [s, e] = range
    try {
      await createBooking.mutateAsync({ table_id: table.id, date, start_time: hourToTimeStr(s), end_time: hourToTimeStr(e) })
      toast(`Booked ${s}:00 – ${e}:00`, 'success')
      setSelStart(null); setSelEnd(null)
      onRefresh()
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setShake(true); setTimeout(() => setShake(false), 500)
        toast('That slot is already taken', 'error')
        onRefresh()
      } else {
        toast(err instanceof Error ? err.message : 'Failed to book', 'error')
      }
    }
  }

  async function handleCancel(booking: BookingOut) {
    try {
      await cancelBooking.mutateAsync(booking.id)
      toast('Booking cancelled', 'info')
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel', 'error')
    }
  }

  const validRange = getValidRange()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className={cn('w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl', shake && 'animate-shake')}
          style={{
            background: '#111',
            border: '1px solid #2a2a2a',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #1e1e1e' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg text-xl shrink-0"
                style={{ background: '#161616', border: '1px solid #2a2a2a' }}
              >
                {table.emoji}
              </div>
              <div>
                <div className="text-sm font-semibold text-text">{table.name}</div>
                <div className="text-xs text-muted mt-0.5">{date}</div>
              </div>
            </div>
            <button onClick={onClose} className="btn-icon">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline */}
          <div className="px-5 py-4">
            <div className="label mb-3">Schedule — drag to select</div>

            <div
              className="select-none"
              onMouseLeave={() => setDragging(false)}
              onMouseUp={() => setDragging(false)}
            >
              {/* Hour labels */}
              <div className="grid grid-cols-12 gap-1 mb-1">
                {hours.map(h => (
                  <div key={h} className="text-center text-[9px] text-muted font-medium">{h}</div>
                ))}
              </div>

              {/* Slots */}
              <div className="grid grid-cols-12 gap-1">
                {hours.map(hour => {
                  const booking = hourMap[hour]
                  const own = booking?.user_id === session?.user_id
                  const free = !booking
                  const sel  = isSelected(hour)

                  const slotClass = free && sel
                    ? 'slot-selected'
                    : free
                    ? 'slot-free'
                    : own
                    ? 'slot-mine'
                    : 'slot-taken'

                  return (
                    <div key={hour} className="relative group">
                      <div
                        className={slotClass}
                        onMouseDown={() => { if (!booking) { setSelStart(hour); setSelEnd(hour); setDragging(true) } }}
                        onMouseEnter={() => { if (dragging && selStart !== null) setSelEnd(hour) }}
                        title={
                          booking
                            ? `${booking.user_name ?? 'Unknown'} · ${booking.start_time.slice(0,5)}–${booking.end_time.slice(0,5)}`
                            : `${hour}:00 – ${hour + 1}:00`
                        }
                      >
                        {own && (
                          <button
                            onClick={e => { e.stopPropagation(); handleCancel(booking!) }}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-red" />
                          </button>
                        )}
                        {!free && !own && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity px-0.5">
                            <span className="text-[7px] text-red truncate leading-none text-center">
                              {(booking?.user_name ?? '?').slice(0, 4)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-3">
                {[
                  { label: 'Free',     cls: 'slot' },
                  { label: 'Selected', cls: 'slot-selected' },
                  { label: 'Yours',    cls: 'slot-mine' },
                  { label: 'Taken',    cls: 'slot-taken' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={l.cls} style={{ width: 12, height: 12, borderRadius: 3 }} />
                    <span className="label">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Book action */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1e1e1e' }}>
              {validRange ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-text">
                      {validRange[0]}:00 – {validRange[1]}:00
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {validRange[1] - validRange[0]} hour{validRange[1] - validRange[0] > 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    onClick={handleBook}
                    disabled={createBooking.isPending}
                    className="btn btn-primary"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {createBooking.isPending ? 'Booking…' : 'Book'}
                  </button>
                </div>
              ) : selStart !== null ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#e8a020' }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Selection overlaps a taken slot
                </div>
              ) : (
                <p className="text-sm text-muted">Click and drag to select free hours</p>
              )}
            </div>
          </div>

          {/* Own bookings list */}
          {tableBookings.filter(b => b.user_id === session?.user_id).length > 0 && (
            <div className="px-5 pb-5">
              <div className="divider mb-4" />
              <div className="label mb-2">Your bookings here</div>
              <div className="flex flex-col gap-1.5">
                {tableBookings
                  .filter(b => b.user_id === session?.user_id)
                  .map(b => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md"
                      style={{ background: '#161616', border: '1px solid #222' }}
                    >
                      <span className="text-sm text-text">
                        {b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}
                      </span>
                      <button
                        onClick={() => handleCancel(b)}
                        className="btn-ghost p-1.5 text-muted hover:text-red"
                        title="Cancel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
