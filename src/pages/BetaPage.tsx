import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Box, CalendarDays, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { addDays, format, isValid, parseISO } from 'date-fns'
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
  const sceneTables = useMemo(() => tables.map(table => ({ id: table.id, number: String(table.id).padStart(2, '0'), available: (freeHours.get(table.id) ?? 0) > 0 })), [tables, freeHours])
  const loading = tablesQuery.isLoading || bookingsQuery.isLoading
  const failed = tablesQuery.isError || bookingsQuery.isError
  const refreshing = tablesQuery.isFetching || bookingsQuery.isFetching

  function chooseDate(value: string) {
    if (!isValid(parseISO(value)) || value < todayStr() || value > maxBookingDate()) return
    setDate(value)
    setSelectedTable(null)
  }
  function shiftDate(amount: number) { chooseDate(format(addDays(parseISO(date), amount), 'yyyy-MM-dd')) }
  function refresh() { void tablesQuery.refetch(); void bookingsQuery.refetch() }
  function focusList() {
    listRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    listRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }
  function availabilityLabel(id: number) {
    const count = freeHours.get(id) ?? 0
    return count === clubHours().length ? t('Free all day') : count > 0 ? t('{count}h available', { count }) : t('Fully booked')
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-3"><span className="section-kicker">{t('3D room')}</span><span className="rounded border border-gold-border bg-gold-muted px-2 py-0.5 text-[10px] font-semibold text-gold">{t('Beta')}</span></div>
          <h1 className="page-heading">{t('Find your place.')}</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-dim">{t('Look around the room, then choose a table to book.')}</p>
        </div>
        <Link to="/book" className="btn-secondary"><ArrowLeft className="h-4 w-4" />{t('Classic booking')}</Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-surface" aria-label={t('3D room')}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div className="min-w-0"><p className="section-kicker mb-1.5">{t('Booking date')}</p><h2 className="text-sm font-semibold text-text">{formatDate(date)}</h2></div>
          <div className="flex max-w-full flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => shiftDate(-1)} disabled={date <= todayStr()} className="btn-icon" aria-label={t('Previous day')}><ChevronLeft className="h-4 w-4" /></button>
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-bg px-2.5 text-xs text-dim">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">{t('Booking date')}</span>
              <input type="date" lang={locale} value={date} min={todayStr()} max={maxBookingDate()} onChange={event => chooseDate(event.target.value)} className="w-[120px] bg-transparent py-2 outline-none focus:text-gold" />
            </label>
            <button type="button" onClick={() => shiftDate(1)} disabled={date >= maxBookingDate()} className="btn-icon" aria-label={t('Next day')}><ChevronRight className="h-4 w-4" /></button>
            <button type="button" onClick={refresh} disabled={refreshing} className="btn-icon" aria-label={t('Refresh availability')} title={t('Refresh availability')}><RotateCw className={cn('h-4 w-4', refreshing && 'animate-spin')} /></button>
          </div>
        </div>

        {loading && <div className="flex min-h-96 items-center justify-center gap-3 bg-raised p-8 text-sm text-dim" role="status"><Box className="h-5 w-5 animate-pulse" />{t('Loading the room')}</div>}
        {!loading && failed && <div className="flex min-h-80 flex-col items-center justify-center gap-4 p-6 text-center" role="alert"><h3 className="font-semibold">{t("We couldn't load the tables")}</h3><p className="text-sm text-dim">{t('Check your connection and try again.')}</p><button type="button" onClick={refresh} disabled={refreshing} className="btn-secondary">{t('Try again')}<RotateCw className="h-4 w-4" /></button></div>}
        {!loading && !failed && !tables.length && <div className="flex min-h-80 items-center justify-center p-8 text-center text-sm text-dim">{t('No tables are available yet. Check back soon.')}</div>}
        {!loading && !failed && tables.length > 0 && (
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_252px] xl:grid-cols-[minmax(0,1fr)_270px]">
            <ClubRoom tables={sceneTables} highlightedId={highlightedId} onHover={setHighlightedId} onPick={id => setSelectedTable(tables.find(table => table.id === id) ?? null)} onList={focusList} />
            <div ref={listRef} className="min-w-0 border-t border-border lg:border-l lg:border-t-0" role="region" aria-label={t('Tables in this room')}>
              <div className="border-b border-border p-4"><h3 className="text-sm font-semibold text-text">{t('Tables in this room')}</h3><p className="mt-1.5 text-xs leading-5 text-dim">{t('Choose a table to see its available times.')}</p></div>
              <div className="grid sm:grid-cols-2 lg:max-h-[450px] lg:grid-cols-1 lg:overflow-y-auto xl:max-h-[520px]">
                {tables.map(table => {
                  const highlighted = highlightedId === table.id
                  return (
                    <button type="button" key={table.id} onClick={() => setSelectedTable(table)} onMouseEnter={() => setHighlightedId(table.id)} onMouseLeave={() => setHighlightedId(null)} onFocus={() => setHighlightedId(table.id)} onBlur={() => setHighlightedId(null)} aria-label={`${t('Table {number}', { number: table.id })}, ${table.name}, ${availabilityLabel(table.id)}. ${t('View times')}`} className={cn('group flex min-w-0 items-center gap-3 border-b border-border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold', highlighted ? 'bg-gold-muted' : 'hover:bg-raised')}>
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md border font-display text-xl', highlighted ? 'border-gold bg-gold text-on-accent' : 'border-border bg-raised text-dim')}>{String(table.id).padStart(2, '0')}</span>
                      <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-text">{table.name}</span><span className={cn('mt-1 block text-[11px]', (freeHours.get(table.id) ?? 0) > 0 ? 'text-gold' : 'text-muted')}>{availabilityLabel(table.id)}</span></span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted group-hover:text-gold" aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>
      <p className="mt-4 max-w-2xl text-xs leading-5 text-muted">{t('Experimental layout. Table availability and bookings are shared with the main site.')}</p>
      {selectedTable && <BookingDialog table={selectedTable} date={date} bookings={bookings} onClose={() => setSelectedTable(null)} onRefresh={() => { void bookingsQuery.refetch() }} />}
    </div>
  )
}

export default BetaPage
