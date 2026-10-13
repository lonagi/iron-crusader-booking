import { useState } from 'react'
import { RotateCw } from 'lucide-react'
import { addDays, format, isValid, parseISO } from 'date-fns'
import { cn } from '@/lib/cn'
import { todayStr, maxBookingDate } from '@/lib/dates'
import { usePreferences } from '@/preferences/PreferencesContext'
import { useTables, useBookingsByDate } from '@/api/hooks'
import { TableGrid } from '@/components/tables/TableGrid'
import { BookingDialog } from '@/components/booking/BookingDialog'
import type { TableOut } from '@/api/types'

export function BookPage() {
  const { t, formatDate, locale } = usePreferences()
  const [date, setDate] = useState(todayStr())
  const [selectedTable, setSelectedTable] = useState<TableOut | null>(null)
  const [initialHour, setInitialHour] = useState<number | undefined>()
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
      setInitialHour(undefined)
    }
  }
  function refresh() { void tablesQuery.refetch(); void bookingsQuery.refetch() }
  function chooseTable(table: TableOut, hour?: number) { setInitialHour(hour); setSelectedTable(table) }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 sm:mb-10">
        <h1 className="page-heading">{t('Book a table')}</h1>
        <p className="mt-3 text-base leading-relaxed text-dim">{t('See booked times, then choose when to play.')}</p>
      </header>

      <section aria-labelledby="booking-day-heading" className="mb-9 sm:mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <h2 id="booking-day-heading" className="text-lg font-semibold">{t('Choose your day')}</h2>
          <label className="flex max-w-full items-center gap-3 text-sm text-dim">
            <span>{t('Another date')}</span>
            <input type="date" aria-label={t('Booking date')} lang={locale} value={date} min={todayStr()} max={maxBookingDate()} onChange={e => chooseDate(e.target.value)} className="date-input" />
          </label>
        </div>
        <div className="day-strip" role="group" aria-label={t('Choose a date')}>
          {days.map((day, i) => {
            const value = format(day, 'yyyy-MM-dd')
            const active = date === value
            return (
              <button type="button" key={value} onClick={() => chooseDate(value)} aria-pressed={active} aria-label={formatDate(value)} className={cn('day-choice', active && 'is-selected')}>
                <span className="text-[13px] font-medium">{i === 0 ? t('Today') : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}</span>
                <span className="mt-1 text-2xl font-semibold tabular-nums">{new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(day)}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-sm text-muted">{formatDate(date)}</p>
      </section>

      <section aria-labelledby="booking-table-heading">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="booking-table-heading" className="text-lg font-semibold">{t('Choose your table')}</h2>
          <button type="button" onClick={refresh} disabled={refreshing} aria-label={t('Refresh availability')} title={t('Refresh availability')} className="btn-icon border-transparent"><RotateCw className={cn('h-[18px] w-[18px]', refreshing && 'animate-spin')} /></button>
        </div>
        {loading && <div role="status" aria-label={t('Loading tables')} className="grid grid-cols-1 gap-5 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-surface" />)}</div>}
        {!loading && failed && <div className="card flex flex-wrap items-center justify-between gap-5 p-6" role="alert"><div><h3 className="font-semibold">{t("We couldn't load the tables")}</h3><p className="mt-2 text-base text-dim">{t('Check your connection and try again.')}</p></div><button onClick={refresh} disabled={refreshing} className="btn-secondary">{t('Try again')} <RotateCw className="h-4 w-4" /></button></div>}
        {!loading && !failed && <TableGrid tables={tables} bookings={bookings} date={date} onTableClick={chooseTable} />}
      </section>
      {selectedTable && <BookingDialog table={selectedTable} date={date} bookings={bookings} initialHour={initialHour} onClose={() => setSelectedTable(null)} onRefresh={() => { void bookingsQuery.refetch() }} />}
    </div>
  )
}
