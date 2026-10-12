import { useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertCircle, ArrowRight, ChevronDown, Clock3, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { clubHours, hourToTimeStr, timeStrToHour } from '@/lib/dates'
import { usePreferences } from '@/preferences/PreferencesContext'
import { useCreateBooking, useCancelBooking, useGroupMembership } from '@/api/hooks'
import { useSession } from '@/auth/SessionContext'
import { useToast } from '@/lib/toast'
import { HttpError } from '@/api/client'
import { GROUP_MEMBERSHIP_ENABLED } from '@/api/membership'
import { MembershipError, telegramGroupUrl, type MembershipErrorCode } from '@/auth/membership'
import { MembershipNotice } from './MembershipNotice'
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
  const { t, formatDate } = usePreferences()
  const { session } = useSession()
  const toast = useToast()
  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()
  const membership = useGroupMembership()
  const [membershipFailure, setMembershipFailure] = useState<MembershipErrorCode | null>(null)
  const membershipError = membershipFailure ?? (membership.error instanceof MembershipError ? membership.error.code : null)
  const membershipStatus = membershipError === 'GROUP_MEMBERSHIP_REQUIRED' ? 'nonmember'
    : membershipFailure ? 'unavailable'
    : !GROUP_MEMBERSHIP_ENABLED ? 'unchecked'
    : membership.isFetching || membership.isPending ? 'checking'
    : membership.isError || membershipError ? 'unavailable'
    : membership.data?.is_member === true ? 'member' : 'nonmember'
  const canBook = membershipStatus === 'member' || membershipStatus === 'unchecked'
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
    if (!validRange || !canBook || createBooking.isPending) return
    const [start, end] = validRange
    try {
      await createBooking.mutateAsync({ table_id: table.id, date, start_time: hourToTimeStr(start), end_time: hourToTimeStr(end) })
      toast(t('Booked from {start} to {end}', { start: timeLabel(start), end: timeLabel(end) }), 'success')
      setSelection(null)
      setAnchor(null)
      onRefresh()
    } catch (err) {
      if (err instanceof MembershipError) {
        setMembershipFailure(err.code)
      } else if (err instanceof HttpError && err.status === 409) {
        toast(t('Someone just booked that time. Choose another slot.'), 'error')
        setSelection(null)
        setAnchor(null)
        onRefresh()
      } else {
        toast(t(err instanceof Error ? err.message : 'Could not book this table. Please try again.'), 'error')
      }
    }
  }

  async function handleCancel(booking: BookingOut) {
    if (cancelBooking.isPending) return
    try {
      await cancelBooking.mutateAsync(booking.id)
      toast(t('Booking cancelled'), 'info')
      onRefresh()
    } catch (err) {
      toast(t(err instanceof Error ? err.message : 'Could not cancel this booking. Please try again.'), 'error')
    }
  }

  return (
    <Dialog.Root open onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-surface shadow-modal focus:outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          onCloseAutoFocus={event => {
            event.preventDefault()
            previousFocus.current?.focus()
          }}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
            <div className="min-w-0">
              <Dialog.Title className="break-words text-2xl font-semibold leading-snug tracking-tight text-text">{table.name}</Dialog.Title>
              <Dialog.Description className="mt-2 text-base leading-relaxed text-dim">{formatDate(date)}</Dialog.Description>
            </div>
            <Dialog.Close className="btn-icon shrink-0" aria-label={t('Close booking window')}>
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-8">
            {membershipStatus !== 'unchecked' && <MembershipNotice
              status={membershipStatus}
              retrying={membership.isFetching || createBooking.isPending}
              groupUrl={telegramGroupUrl(import.meta.env.VITE_TG_GROUP_URL)}
              retryLabel={GROUP_MEMBERSHIP_ENABLED ? undefined : 'Back to booking'}
              onRetry={() => { setMembershipFailure(null); if (GROUP_MEMBERSHIP_ENABLED) void membership.refetch() }}
            />}
            {canBook && <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-text">{t('Choose your hours')}</h3>
              <p id="hour-selection-help" className="mt-1 text-base leading-relaxed text-dim">
                {t(hasFreeHours ? 'Each button is one hour. Tap the first and last hour of your visit.' : 'This table is fully booked. Try another table or date.')}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('Hourly availability')} aria-describedby="hour-selection-help">
              {hours.map(hour => {
                const booking = hourMap[hour]
                const own = booking?.user_id === session?.user_id
                const selected = selection !== null && hour >= selection[0] && hour <= selection[1] && !booking
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={!canBook || Boolean(booking) || createBooking.isPending}
                    aria-pressed={selected}
                    aria-label={t('{start} to {end}, {status}', { start: timeLabel(hour), end: timeLabel(hour + 1), status: t(own ? 'Your booking' : booking ? 'Booked' : 'Available') })}
                    onClick={() => selectHour(hour)}
                    className={cn(
                      'min-h-14 rounded-xl border px-1 py-3 text-center text-base font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      selected ? 'border-gold bg-gold text-on-accent' : booking ? own ? 'border-gold-border bg-gold-muted text-gold' : 'border-transparent bg-transparent text-muted line-through decoration-1' : 'border-transparent bg-raised text-text hover:border-gold hover:bg-gold-muted',
                      booking && 'cursor-default',
                    )}
                  >
                    {timeLabel(hour)}
                  </button>
                )
              })}
            </div>

            {tableBookings.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted" aria-hidden="true">
                <span className="line-through">{t('Booked')}</span>
                {ownBookings.length > 0 && <span className="text-gold">{t('Your booking')}</span>}
              </div>
            )}

            {hasFreeHours && (
              <details className="group mt-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-base font-medium text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold [&::-webkit-details-marker]:hidden">
                  {t('Set exact times')}
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid grid-cols-2 gap-3 pb-1 pt-3">
                  <label className="block min-w-0 text-sm font-medium text-dim">
                    {t('Start time')}
                    <select
                      className="input mt-2 min-h-12 min-w-0 text-base"
                      value={selection?.[0] ?? ''}
                      disabled={!canBook || createBooking.isPending}
                      onChange={event => {
                        const hour = Number(event.target.value)
                        setSelection([hour, hour])
                        setAnchor(null)
                      }}
                    >
                      <option value="" disabled>{t('Select time')}</option>
                      {hours.filter(hour => !hourMap[hour]).map(hour => <option key={hour} value={hour}>{timeLabel(hour)}</option>)}
                    </select>
                  </label>
                  <label className="block min-w-0 text-sm font-medium text-dim">
                    {t('End time')}
                    <select
                      className="input mt-2 min-h-12 min-w-0 text-base"
                      value={selection ? selection[1] + 1 : ''}
                      disabled={!canBook || !selection || createBooking.isPending}
                      onChange={event => {
                        if (selection) setSelection([selection[0], Number(event.target.value) - 1])
                        setAnchor(null)
                      }}
                    >
                      <option value="" disabled>{t('Select time')}</option>
                      {hours.map(hour => hour + 1).filter(hour => selection && hour > selection[0]).map(hour => (
                        <option key={hour} value={hour}>{timeLabel(hour)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>
            )}

            </>}
            {ownBookings.length > 0 && (
              <section className="mt-5" aria-label={t('Your bookings for this table')}>
                <h3 className="mb-2 text-base font-semibold text-text">{t('Your bookings for this table')}</h3>
                <div className="divide-y divide-border">
                  {ownBookings.map(booking => (
                    <div key={booking.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                      <span className="text-base tabular-nums text-text">{t('{start} to {end}', { start: booking.start_time.slice(0, 5), end: booking.end_time.slice(0, 5) })}</span>
                      <button
                        onClick={() => handleCancel(booking)}
                        disabled={cancelBooking.isPending || createBooking.isPending}
                        className="btn-ghost min-h-11 text-base text-red hover:text-red"
                        aria-label={t('Cancel booking from {start} to {end}', { start: booking.start_time.slice(0, 5), end: booking.end_time.slice(0, 5) })}
                      >
                        <Trash2 className="h-4 w-4" /> {t('Cancel')}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
          {canBook && <div className="shrink-0 border-t border-border bg-surface px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-6">
            <div className="mb-3 min-h-6" role="status" aria-live="polite" aria-atomic="true">
              {overlaps ? (
                <p className="flex items-start gap-2 text-base leading-relaxed text-red"><AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />{t('Part of this time is already booked. Choose a free stretch.')}</p>
              ) : validRange ? (
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-base text-text">
                  <p className="flex items-center gap-2 font-semibold tabular-nums">
                    <Clock3 className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                    {t('{start} to {end}', { start: timeLabel(validRange[0]), end: timeLabel(validRange[1]) })}
                  </p>
                  <span className="text-sm text-dim">{t('Hours: {count}', { count: validRange[1] - validRange[0] })}</span>
                </div>
              ) : <p className="text-base text-dim">{t(hasFreeHours ? 'Select a time to continue.' : 'No free hours on this date.')}</p>}
            </div>
            <button onClick={handleBook} disabled={!canBook || !validRange || createBooking.isPending || cancelBooking.isPending} className="btn-primary min-h-12 w-full justify-center text-base">
              {t(createBooking.isPending ? 'Confirming booking' : 'Confirm booking')}
              {!createBooking.isPending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
