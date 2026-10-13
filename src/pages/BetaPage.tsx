import { useMemo, useRef, useState } from 'react'
import { ArrowRight, Box, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { isValid, parseISO } from 'date-fns'
import { useTables, useBookingsByDate } from '@/api/hooks'
import type { TableOut } from '@/api/types'
import { BookingDialog } from '@/components/booking/BookingDialog'
import { AvailabilityTimeline } from '@/components/booking/AvailabilityTimeline'
import { ClubRoom } from '@/components/three/ClubRoom'
import { usePreferences } from '@/preferences/PreferencesContext'
import { CLUB_CLOSE, CLUB_OPEN, maxBookingDate, todayStr } from '@/lib/dates'
import { formatTime, getHourAvailability, getTableAvailability } from '@/lib/availability'
import { cn } from '@/lib/cn'

export function BetaPage() {
  const { t, formatDate, locale } = usePreferences()
  const [date, setDate] = useState(todayStr())
  const [hour, setHour] = useState(() => Math.min(CLUB_CLOSE - 1, Math.max(CLUB_OPEN, new Date().getHours())))
  const [selectedTable, setSelectedTable] = useState<TableOut | null>(null)
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const tablesQuery = useTables()
  const bookingsQuery = useBookingsByDate(date)
  const tables = useMemo(() => (tablesQuery.data ?? []).filter(table => table.is_active), [tablesQuery.data])
  const bookings = bookingsQuery.data ?? []
  const availability = useMemo(() => new Map(tables.map(table => [table.id, getTableAvailability(bookingsQuery.data ?? [], table.id, date)])), [tables, bookingsQuery.data, date])
  const sceneTables = useMemo(() => tables.map(table => {
    const state = getHourAvailability(availability.get(table.id)!, hour)
    return {
      id: table.id,
      name: table.name,
      available: state.available,
      statusLabel: state.available ? t('Free until {time}', { time: formatTime(state.until) }) : t('Reserved'),
    }
  }), [tables, availability, hour, t])
  const loading = tablesQuery.isLoading || bookingsQuery.isLoading
  const failed = tablesQuery.isError || bookingsQuery.isError
  const refreshing = tablesQuery.isFetching || bookingsQuery.isFetching

  function chooseDate(value: string) {
    if (!isValid(parseISO(value)) || value < todayStr() || value > maxBookingDate()) return
    setDate(value)
    setSelectedTable(null)
  }
  function refresh() { void tablesQuery.refetch(); void bookingsQuery.refetch() }
  function focusList() {
    listRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
    listRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }
  function availabilityLabel(id: number) {
    const schedule = availability.get(id)!
    const state = getHourAvailability(schedule, hour)
    if (state.available) return t('Free until {time}', { time: formatTime(state.until) })
    return t('Reserved in this hour')
  }
  const timeWindow = t('From {start} to {end}', { start: formatTime(hour * 60), end: formatTime((hour + 1) * 60) })

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-3"><h1 className="page-heading">{t('Our room')}</h1><span className="badge-gold">{t('Beta')}</span></div>
          <p className="mt-3 text-base text-dim">{t('Choose a table right in the room.')}</p>
        </div>
        <div className="flex max-w-full items-center gap-2">
          <label className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dim">
            <span>{t('Booking date')}</span>
            <input type="date" lang={locale} aria-label={t('Booking date')} value={date} min={todayStr()} max={maxBookingDate()} onChange={event => chooseDate(event.target.value)} className="date-input" />
          </label>
          <button type="button" onClick={refresh} disabled={refreshing} className="btn-icon border-transparent" aria-label={t('Refresh availability')} title={t('Refresh availability')}><RotateCw className={cn('h-[18px] w-[18px]', refreshing && 'animate-spin')} /></button>
        </div>
      </header>

      {loading && <div className="flex min-h-96 items-center justify-center gap-3 rounded-xl bg-surface p-8 text-base text-dim" role="status"><Box className="h-5 w-5 animate-pulse" />{t('Loading the room')}</div>}
      {!loading && failed && <div className="card flex min-h-80 flex-col items-center justify-center gap-4 p-6 text-center" role="alert"><h2 className="text-lg font-semibold">{t("We couldn't load the tables")}</h2><p className="text-base text-dim">{t('Check your connection and try again.')}</p><button type="button" onClick={refresh} disabled={refreshing} className="btn-secondary">{t('Try again')}<RotateCw className="h-4 w-4" /></button></div>}
      {!loading && !failed && <>
        <section aria-label={t('3D room')}>
          <div className="mb-4 rounded-xl bg-surface px-4 py-4 sm:px-6">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
              <label htmlFor="room-hour" className="text-base font-semibold">{t('Time in the room')}</label>
              <output htmlFor="room-hour" className="text-lg font-semibold tabular-nums text-gold" aria-live="polite" aria-atomic="true">{timeWindow}</output>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <button type="button" className="btn-icon h-11 w-11 shrink-0 border-transparent" disabled={hour === CLUB_OPEN} onClick={() => setHour(value => Math.max(CLUB_OPEN, value - 1))} aria-label={t('Previous hour')}><ChevronLeft className="h-5 w-5" /></button>
              <div className="min-w-0 flex-1">
                <input id="room-hour" type="range" min={CLUB_OPEN} max={CLUB_CLOSE - 1} step={1} value={hour} onChange={event => setHour(Number(event.target.value))} aria-valuetext={timeWindow} className="block h-11 w-full cursor-pointer accent-[rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold" />
                <div className="relative h-5 text-sm tabular-nums text-muted" aria-hidden="true"><span className="absolute left-0">10:00</span><span className="absolute -translate-x-1/2" style={{ left: '45.45%' }}>15:00</span><span className="absolute right-0">21:00</span></div>
              </div>
              <button type="button" className="btn-icon h-11 w-11 shrink-0 border-transparent" disabled={hour === CLUB_CLOSE - 1} onClick={() => setHour(value => Math.min(CLUB_CLOSE - 1, value + 1))} aria-label={t('Next hour')}><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
          <ClubRoom tables={sceneTables} highlightedId={highlightedId} onHover={setHighlightedId} onPick={id => setSelectedTable(tables.find(table => table.id === id) ?? null)} onList={focusList} />
        </section>
        <section ref={listRef} className="mt-8 sm:mt-10" aria-labelledby="room-tables-heading">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h2 id="room-tables-heading" className="text-lg font-semibold">{t('Tables in this room')}</h2><span className="text-sm text-muted">{formatDate(date)}</span></div>
          {!tables.length && <p className="text-base text-dim">{t('No tables are available yet. Check back soon.')}</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {tables.map(table => <button type="button" key={table.id} onClick={() => setSelectedTable(table)} onMouseEnter={() => setHighlightedId(table.id)} onMouseLeave={() => setHighlightedId(null)} onFocus={() => setHighlightedId(table.id)} onBlur={() => setHighlightedId(null)} className={cn('min-w-0 rounded-xl border p-5 text-left transition-colors', highlightedId === table.id ? 'border-gold bg-gold-muted' : 'border-border/60 bg-surface hover:bg-raised')}>
              <span className="flex items-center justify-between gap-4">
                <span className="min-w-0"><span className="block break-words text-lg font-semibold">{table.name}</span><span className="mt-1 block text-base text-dim">{availabilityLabel(table.id)}</span></span>
                <ArrowRight className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
              </span>
              <div className="mt-4"><AvailabilityTimeline availability={availability.get(table.id)!} selectedHour={hour} /></div>
              {availability.get(table.id)!.busy.length > 0 && <p className="mt-3 text-sm leading-relaxed text-dim">{t('Busy: {times}', { times: availability.get(table.id)!.busy.map(range => `${formatTime(range.start)} - ${formatTime(range.end)}`).join(', ') })}</p>}
            </button>)}
          </div>
        </section>
      </>}
      {selectedTable && <BookingDialog table={selectedTable} date={date} bookings={bookings} initialHour={availability.has(selectedTable.id) && getHourAvailability(availability.get(selectedTable.id)!, hour).available ? hour : undefined} onClose={() => setSelectedTable(null)} onRefresh={() => { void bookingsQuery.refetch() }} />}
    </div>
  )
}

export default BetaPage
