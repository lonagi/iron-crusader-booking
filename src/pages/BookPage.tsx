import { useState } from 'react'
import { CalendarDays, LayoutGrid, Map, ChevronLeft, ChevronRight, RotateCw, Clock3, ArrowUpRight } from 'lucide-react'
import { addDays, format, isValid, parseISO } from 'date-fns'
import { cn } from '@/lib/cn'
import { todayStr, formatDate, maxBookingDate } from '@/lib/dates'
import { useTables, useBookingsByDate } from '@/api/hooks'
import { TableGrid } from '@/components/tables/TableGrid'
import { FloorPlan } from '@/components/tables/FloorPlan'
import { BookingDialog } from '@/components/booking/BookingDialog'
import type { TableOut } from '@/api/types'

type ViewMode = 'grid' | 'floor'

export function BookPage() {
  const [date, setDate] = useState(todayStr())
  const [view, setView] = useState<ViewMode>('grid')
  const [selectedTable, setSelectedTable] = useState<TableOut | null>(null)
  const tablesQuery = useTables()
  const bookingsQuery = useBookingsByDate(date)
  const tables = tablesQuery.data ?? []
  const bookings = bookingsQuery.data ?? []
  const loading = tablesQuery.isLoading || bookingsQuery.isLoading
  const failed = tablesQuery.isError || bookingsQuery.isError
  const refreshing = tablesQuery.isFetching || bookingsQuery.isFetching
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))

  function chooseDate(value: string) {
    if (isValid(parseISO(value)) && value >= todayStr() && value <= maxBookingDate()) {
      setDate(value)
      setSelectedTable(null)
    }
  }
  function shiftDate(days: number) { chooseDate(format(addDays(parseISO(date), days), 'yyyy-MM-dd')) }
  function refresh() { void tablesQuery.refetch(); void bookingsQuery.refetch() }

  return (
    <div>
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="section-kicker mb-3">At the club</p>
          <h1 className="page-heading">Book a table.</h1>
          <p className="mt-3 text-sm leading-6 text-dim">Choose a day and check the available tables.</p>
        </div>
        <div className="flex items-center gap-3 border-l-2 border-gold-border pl-4">
          <Clock3 className="h-5 w-5 text-gold" />
          <div><p className="section-kicker">Club hours</p><p className="mt-1 text-sm font-semibold text-text">10:00 to 22:00</p></div>
        </div>
      </div>

      <section aria-label="Choose a date" className="card mb-8 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="section-kicker">01 <span className="ml-2 text-dim">Choose your day</span></span>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDate(-1)} disabled={date <= todayStr()} aria-label="Previous day" className="btn-icon h-10 min-h-10 w-10"><ChevronLeft className="h-4 w-4" /></button>
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-xs text-dim">
              <CalendarDays className="h-4 w-4" />
              <span className="sr-only">Booking date</span>
              <input type="date" value={date} min={todayStr()} max={maxBookingDate()} onChange={e => chooseDate(e.target.value)} className="w-[122px] bg-transparent py-2 outline-none focus:text-gold" />
            </label>
            <button onClick={() => shiftDate(1)} disabled={date >= maxBookingDate()} aria-label="Next day" className="btn-icon h-10 min-h-10 w-10"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {days.map((day, i) => {
            const value = format(day, 'yyyy-MM-dd')
            const active = date === value
            return (
              <button key={value} onClick={() => chooseDate(value)} aria-pressed={active} aria-label={formatDate(value)} className={cn('flex min-h-[86px] flex-col items-center justify-center rounded-md border py-3 transition-colors sm:min-h-[102px]', active ? 'border-gold bg-gold text-surface' : 'border-border bg-bg text-text hover:border-border-strong hover:bg-raised')}>
                <span className={cn('text-[9px] font-semibold sm:text-[11px]', active ? 'text-[#d7dfcf]' : 'text-muted')}>{i === 0 ? 'Today' : format(day, 'EEE')}</span>
                <span className="mt-1 font-display text-[26px] leading-tight sm:text-[32px]">{format(day, 'dd')}</span>
                <span className={cn('mt-1 text-[9px] sm:text-[10px]', active ? 'text-[#d7dfcf]' : 'text-muted')}>{format(day, 'MMM')}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section aria-label="Choose a table">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-kicker">02 <span className="ml-2 text-dim">Choose your table</span></p>
            <h2 className="mt-2 text-sm font-semibold text-text">{formatDate(date)}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border bg-raised p-1" aria-label="Table view">
              {([{ mode: 'grid', Icon: LayoutGrid, label: 'Tables' }, { mode: 'floor', Icon: Map, label: 'Room plan' }] as const).map(({ mode, Icon, label }) => (
                <button key={mode} onClick={() => setView(mode)} aria-pressed={view === mode} className={cn('flex min-h-9 items-center gap-2 rounded px-3 text-xs font-semibold transition-colors', view === mode ? 'bg-surface text-gold shadow-sm' : 'text-muted hover:text-text')}><Icon className="h-3.5 w-3.5" />{label}</button>
              ))}
            </div>
            <button onClick={refresh} disabled={refreshing} aria-label="Refresh availability" title="Refresh availability" className="btn-icon"><RotateCw className={cn('h-4 w-4', refreshing && 'animate-spin')} /></button>
          </div>
        </div>
        {loading && <div role="status" aria-label="Loading tables" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-surface" />)}</div>}
        {!loading && failed && <div className="card flex flex-wrap items-center justify-between gap-4 p-6" role="alert"><div><h3 className="text-sm font-semibold">We couldn't load the tables</h3><p className="mt-2 text-sm text-dim">Check your connection and try again.</p></div><button onClick={refresh} disabled={refreshing} className="btn-secondary">Try again <RotateCw className="h-4 w-4" /></button></div>}
        {!loading && !failed && (view === 'grid' ? <TableGrid tables={tables} bookings={bookings} onTableClick={setSelectedTable} /> : <FloorPlan tables={tables} bookings={bookings} onTableClick={setSelectedTable} />)}
        {!loading && !failed && tables.some(table => table.is_active) && <p className="mt-5 flex items-center gap-2 text-xs text-muted"><ArrowUpRight className="h-3.5 w-3.5" />Choose a table to see available times.</p>}
      </section>
      {selectedTable && <BookingDialog table={selectedTable} date={date} bookings={bookings} onClose={() => setSelectedTable(null)} onRefresh={() => { void bookingsQuery.refetch() }} />}
    </div>
  )
}
