import { useMemo, useRef, useState } from 'react'
import { ArrowRight, Box, RotateCw } from 'lucide-react'
import { isValid, parseISO } from 'date-fns'
import { useTables, useBookingsByDate } from '@/api/hooks'
import type { TableOut } from '@/api/types'
import { BookingDialog } from '@/components/booking/BookingDialog'
import { ClubRoom } from '@/components/three/ClubRoom'
import { usePreferences } from '@/preferences/PreferencesContext'
import { clubHours, maxBookingDate, timeStrToHour, todayStr } from '@/lib/dates'
import { cn } from '@/lib/cn'

export function BetaPage() {
  const { t, formatDate, locale } = usePreferences()
  const [date, setDate] = useState(todayStr())
  const [selectedTable, setSelectedTable] = useState<TableOut | null>(null)
  const [highlightedId, setHighlightedId] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const tablesQuery = useTables()
  const bookingsQuery = useBookingsByDate(date)
  const tables = useMemo(() => (tablesQuery.data ?? []).filter(table => table.is_active), [tablesQuery.data])
  const bookings = bookingsQuery.data ?? []
  const freeHours = useMemo(() => new Map(tables.map(table => {
    const tableBookings = (bookingsQuery.data ?? []).filter(booking => booking.table_id === table.id)
    const free = clubHours().filter(hour => !tableBookings.some(booking => timeStrToHour(booking.start_time) <= hour && timeStrToHour(booking.end_time) > hour)).length
    return [table.id, free]
  })), [tables, bookingsQuery.data])
  const sceneTables = useMemo(() => tables.map(table => ({ id: table.id, name: table.name, available: (freeHours.get(table.id) ?? 0) > 0 })), [tables, freeHours])
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
    const count = freeHours.get(id) ?? 0
    return count === clubHours().length ? t('Free all day') : count > 0 ? t('{count}h available', { count }) : t('Fully booked')
  }

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
          <ClubRoom tables={sceneTables} highlightedId={highlightedId} onHover={setHighlightedId} onPick={id => setSelectedTable(tables.find(table => table.id === id) ?? null)} onList={focusList} />
        </section>
        <section ref={listRef} className="mt-8 sm:mt-10" aria-labelledby="room-tables-heading">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h2 id="room-tables-heading" className="text-lg font-semibold">{t('Available tables')}</h2><span className="text-sm text-muted">{formatDate(date)}</span></div>
          {!tables.length && <p className="text-base text-dim">{t('No tables are available yet. Check back soon.')}</p>}
          <div className="grid gap-3 md:grid-cols-3">
            {tables.map(table => <button type="button" key={table.id} onClick={() => setSelectedTable(table)} onMouseEnter={() => setHighlightedId(table.id)} onMouseLeave={() => setHighlightedId(null)} onFocus={() => setHighlightedId(table.id)} onBlur={() => setHighlightedId(null)} className={cn('flex min-h-24 items-center justify-between gap-4 rounded-xl border p-5 text-left transition-colors', highlightedId === table.id ? 'border-gold bg-gold-muted' : 'border-border/60 bg-surface hover:bg-raised')}>
              <span className="min-w-0"><span className="block break-words text-lg font-semibold">{table.name}</span><span className="mt-1 block text-sm text-dim">{availabilityLabel(table.id)}</span></span>
              <ArrowRight className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
            </button>)}
          </div>
        </section>
      </>}
      {selectedTable && <BookingDialog table={selectedTable} date={date} bookings={bookings} onClose={() => setSelectedTable(null)} onRefresh={() => { void bookingsQuery.refetch() }} />}
    </div>
  )
}

export default BetaPage
