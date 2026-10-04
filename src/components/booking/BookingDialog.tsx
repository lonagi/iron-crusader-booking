import { useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertCircle, ArrowRight, Check, Clock3, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { clubHours, formatDate, hourToTimeStr, timeStrToHour } from '@/lib/dates'
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

const timeLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

export function BookingDialog({ table, date, bookings, onClose, onRefresh }: BookingDialogProps) {
  const { session } = useSession()
  const toast = useToast()
  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()
  const hours = clubHours()
  const [selection, setSelection] = useState<[number, number] | null>(null)
  const [anchor, setAnchor] = useState<number | null>(null)
  const previousFocus = useRef(typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null)

  const tableBookings = useMemo(() => bookings.filter(b => b.table_id === table.id), [bookings, table.id])
  const hourMap = useMemo(() => {
    const result: Record<number, BookingOut> = {}
    for (const booking of tableBookings) {
      for (let hour = timeStrToHour(booking.start_time); hour < timeStrToHour(booking.end_time); hour++) {
        result[hour] = booking
      }
    }
    return result
  }, [tableBookings])
  const ownBookings = tableBookings.filter(b => b.user_id === session?.user_id)
  const hasFreeHours = hours.some(hour => !hourMap[hour])
  const overlaps = selection !== null && hours.some(hour => hour >= selection[0] && hour <= selection[1] && hourMap[hour])
  const validRange = selection && !overlaps ? [selection[0], selection[1] + 1] as const : null

  function selectHour(hour: number) {
    if (anchor === null) {
      setSelection([hour, hour])
      setAnchor(hour)
    } else {
      setSelection([Math.min(anchor, hour), Math.max(anchor, hour)])
      setAnchor(null)
    }
  }

  async function handleBook() {
    if (!validRange || createBooking.isPending) return
    const [start, end] = validRange
    try {
      await createBooking.mutateAsync({ table_id: table.id, date, start_time: hourToTimeStr(start), end_time: hourToTimeStr(end) })
      toast(`Booked from ${timeLabel(start)} to ${timeLabel(end)}`, 'success')
      setSelection(null)
      setAnchor(null)
      onRefresh()
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        toast('Someone just booked that time. Choose another slot.', 'error')
        setSelection(null)
        setAnchor(null)
        onRefresh()
      } else {
        toast(err instanceof Error ? err.message : 'Could not book this table. Please try again.', 'error')
      }
    }
  }

  async function handleCancel(booking: BookingOut) {
    if (cancelBooking.isPending) return
    try {
      await cancelBooking.mutateAsync(booking.id)
      toast('Booking cancelled', 'info')
      onRefresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not cancel this booking. Please try again.', 'error')
    }
  }

  return (
    <Dialog.Root open onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-text/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface shadow-modal focus:outline-none"
          onCloseAutoFocus={event => {
            event.preventDefault()
            previousFocus.current?.focus()
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-7">
            <div>
              <p className="label mb-2">Reserve a table</p>
              <Dialog.Title className="font-display text-3xl leading-tight text-text">{table.name}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-dim">{formatDate(date)}</Dialog.Description>
            </div>
            <Dialog.Close className="btn-icon shrink-0" aria-label="Close booking window">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-text">Choose your hours</h3>
              <p id="hour-selection-help" className="mt-1 text-xs leading-relaxed text-dim">
                {hasFreeHours ? 'Pick the first and last hour of your visit, or use the time fields.' : 'This table is fully booked. Try another table or date.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Hourly availability" aria-describedby="hour-selection-help">
              {hours.map(hour => {
                const booking = hourMap[hour]
                const own = booking?.user_id === session?.user_id
                const selected = selection !== null && hour >= selection[0] && hour <= selection[1] && !booking
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={Boolean(booking) || createBooking.isPending}
                    aria-pressed={selected}
                    aria-label={`${timeLabel(hour)} to ${timeLabel(hour + 1)}, ${own ? 'your booking' : booking ? 'booked' : 'available'}`}
                    onClick={() => selectHour(hour)}
                    className={cn(
                      'relative rounded-md border px-2 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
                      selected ? 'border-gold bg-gold text-white' : booking ? own ? 'border-gold-border bg-gold-muted text-gold' : 'border-border bg-raised text-muted' : 'border-border bg-surface text-text hover:border-gold hover:bg-gold-muted',
                      booking && 'cursor-default',
                    )}
                  >
                    <span className="block text-sm font-semibold tabular-nums">{timeLabel(hour)}</span>
                    <span className={cn('mt-1 block text-[10px]', selected ? 'text-white/80' : 'text-current')}>
                      {selected ? 'Selected' : own ? 'Your booking' : booking ? 'Booked' : `Until ${timeLabel(hour + 1)}`}
                    </span>
                    {selected && <Check className="absolute right-2 top-3 h-3 w-3" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            {hasFreeHours && (
              <div className="mt-5 grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <label className="block min-w-0 text-xs font-medium text-dim">
                  Start time
                  <select
                    className="input mt-2 min-h-11 min-w-0"
                    value={selection?.[0] ?? ''}
                    disabled={createBooking.isPending}
                    onChange={event => {
                      const hour = Number(event.target.value)
                      setSelection([hour, hour])
                      setAnchor(null)
                    }}
                  >
                    <option value="" disabled>Select time</option>
                    {hours.filter(hour => !hourMap[hour]).map(hour => <option key={hour} value={hour}>{timeLabel(hour)}</option>)}
                  </select>
                </label>
                <ArrowRight className="mb-3 hidden h-4 w-4 text-muted sm:block" aria-hidden="true" />
                <label className="block min-w-0 text-xs font-medium text-dim">
                  End time
                  <select
                    className="input mt-2 min-h-11 min-w-0"
                    value={selection ? selection[1] + 1 : ''}
                    disabled={!selection || createBooking.isPending}
                    onChange={event => {
                      if (selection) setSelection([selection[0], Number(event.target.value) - 1])
                      setAnchor(null)
                    }}
                  >
                    <option value="" disabled>Select time</option>
                    {hours.map(hour => hour + 1).filter(hour => selection && hour > selection[0]).map(hour => (
                      <option key={hour} value={hour}>{timeLabel(hour)}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="mt-6 border-t border-border pt-5">
              <div className="mb-4 min-h-6" role="status" aria-live="polite">
                {overlaps ? (
                  <p className="flex items-start gap-2 text-sm text-red"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Part of this time is already booked. Choose a free stretch.</p>
                ) : validRange ? (
                  <p className="flex items-center gap-2 text-sm text-text">
                    <Clock3 className="h-4 w-4 text-gold" />
                    <span className="font-semibold tabular-nums">{timeLabel(validRange[0])} to {timeLabel(validRange[1])}</span>
                    <span className="ml-auto text-dim">{validRange[1] - validRange[0]} {validRange[1] - validRange[0] === 1 ? 'hour' : 'hours'}</span>
                  </p>
                ) : <p className="text-sm text-dim">{hasFreeHours ? 'Select a time to continue.' : 'No free hours on this date.'}</p>}
              </div>
              <button onClick={handleBook} disabled={!validRange || createBooking.isPending} className="btn-primary min-h-11 w-full justify-center">
                {createBooking.isPending ? 'Confirming booking' : 'Confirm booking'}
                {!createBooking.isPending && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>

            {ownBookings.length > 0 && (
              <section className="mt-6 border-t border-border pt-5" aria-label="Your bookings for this table">
                <h3 className="mb-3 text-xs font-semibold text-dim">Your bookings for this table</h3>
                <div className="space-y-2">
                  {ownBookings.map(booking => (
                    <div key={booking.id} className="flex items-center justify-between gap-3 rounded-md bg-raised px-3 py-2">
                      <span className="text-sm tabular-nums text-text">{booking.start_time.slice(0, 5)} to {booking.end_time.slice(0, 5)}</span>
                      <button
                        onClick={() => handleCancel(booking)}
                        disabled={cancelBooking.isPending}
                        className="btn-ghost min-h-10 text-red hover:text-red"
                        aria-label={`Cancel booking from ${booking.start_time.slice(0, 5)} to ${booking.end_time.slice(0, 5)}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
