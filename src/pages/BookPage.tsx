import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, LayoutGrid, Map, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { todayStr, tomorrowStr, formatDate, maxBookingDate, isPastDate } from '@/lib/dates'
import { useTables, useBookingsByDate } from '@/api/hooks'
import { TableGrid } from '@/components/tables/TableGrid'
import { FloorPlan } from '@/components/tables/FloorPlan'
import { BookingDialog } from '@/components/booking/BookingDialog'
import type { TableOut } from '@/api/types'
import { addDays, format, parseISO } from 'date-fns'

type ViewMode = 'grid' | 'floor'

export function BookPage() {
  const [date, setDate] = useState(todayStr())
  const [view, setView] = useState<ViewMode>(() => window.innerWidth >= 768 ? 'floor' : 'grid')
  const [selectedTable, setSelectedTable] = useState<TableOut | null>(null)

  const { data: tables = [], isLoading: tablesLoading } = useTables()
  const { data: bookings = [], isLoading: bookingsLoading, refetch } = useBookingsByDate(date)

  const isToday = date === todayStr()
  const isTomorrow = date === tomorrowStr()
  const isPast = isPastDate(date)

  function shiftDate(days: number) {
    const next = format(addDays(parseISO(date), days), 'yyyy-MM-dd')
    if (next >= todayStr() && next <= maxBookingDate()) setDate(next)
  }

  return (
    <div className="space-y-5">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold text-text tracking-tight">Reservations</h1>
        <p className="text-sm text-muted mt-1">Select a date and book a table</p>
      </div>

      {/* Controls */}
      <div
        className="flex flex-wrap items-center gap-2 p-3 rounded-lg"
        style={{ background: '#111', border: '1px solid #1e1e1e' }}
      >
        {/* Shortcuts */}
        {[
          { label: 'Today',    value: todayStr()    },
          { label: 'Tomorrow', value: tomorrowStr() },
        ].map(d => (
          <button
            key={d.value}
            onClick={() => setDate(d.value)}
            className={cn(
              'btn btn-secondary text-xs py-1.5 px-3',
              date === d.value && 'border-gold-border text-gold',
            )}
            style={date === d.value ? { borderColor: 'rgba(232,201,109,0.3)', color: '#e8c96d', background: 'rgba(232,201,109,0.06)' } : {}}
          >
            {d.label}
          </button>
        ))}

        {/* Date nav */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => shiftDate(-1)}
            disabled={date <= todayStr()}
            className="btn-icon"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
            style={{ border: '1px solid #2e2e2e', background: '#0a0a0a' }}
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0 text-muted" />
            <input
              type="date"
              value={date}
              min={todayStr()}
              max={maxBookingDate()}
              onChange={e => setDate(e.target.value)}
              className="bg-transparent text-xs outline-none w-28 text-dim"
              style={{ fontFamily: 'inherit' }}
            />
          </div>

          <button
            onClick={() => shiftDate(1)}
            disabled={date >= maxBookingDate()}
            className="btn-icon"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View toggle */}
        <div
          className="flex items-center gap-0.5 p-1 rounded-md"
          style={{ border: '1px solid #2e2e2e', background: '#0a0a0a' }}
        >
          {([
            { mode: 'grid',  icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Grid' },
            { mode: 'floor', icon: <Map className="w-3.5 h-3.5" />,        label: 'Floor plan' },
          ] as const).map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              title={label}
              className="px-2 py-1.5 rounded transition-all text-xs flex items-center gap-1.5"
              style={{
                background: view === mode ? '#222' : 'transparent',
                color: view === mode ? '#ebebeb' : '#666',
                border: view === mode ? '1px solid #333' : '1px solid transparent',
              }}
            >
              {icon}
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => refetch()}
          title="Refresh"
          className="btn-icon"
        >
          <RotateCw className={cn('w-3.5 h-3.5', bookingsLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Date label */}
      <div className="flex items-center gap-3">
        <div className="flex-1 divider" />
        <span className="text-xs text-muted whitespace-nowrap">
          {formatDate(date)}
          {isToday    && ' · Today'}
          {isTomorrow && ' · Tomorrow'}
          {isPast     && ' · Past'}
        </span>
        <div className="flex-1 divider" />
      </div>

      {/* Skeleton */}
      {(tablesLoading || bookingsLoading) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg animate-pulse"
              style={{ height: '88px', background: '#111', border: '1px solid #1e1e1e' }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      {!tablesLoading && !bookingsLoading && (
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {view === 'grid'
              ? <TableGrid tables={tables} bookings={bookings} onTableClick={setSelectedTable} />
              : <FloorPlan  tables={tables} bookings={bookings} onTableClick={setSelectedTable} />
            }
          </motion.div>
        </AnimatePresence>
      )}

      {selectedTable && (
        <BookingDialog
          table={selectedTable}
          date={date}
          bookings={bookings}
          onClose={() => setSelectedTable(null)}
          onRefresh={() => refetch()}
        />
      )}
    </div>
  )
}
