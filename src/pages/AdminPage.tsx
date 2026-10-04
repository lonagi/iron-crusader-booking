import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  List, Wrench, Map, CalendarDays, Trash2, Download,
  Plus, ChevronLeft, ChevronRight, RotateCw, Edit2, Check, X,
} from 'lucide-react'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { cn } from '@/lib/cn'
import {
  useAdminBookings, useAdminTables, useAdminCancelBooking,
  useCreateTable, useUpdateTable, useBookingsByDate,
} from '@/api/hooks'
import { useToast } from '@/lib/toast'
import { todayStr, tomorrowStr, formatDate, maxBookingDate } from '@/lib/dates'
import { FloorPlan } from '@/components/tables/FloorPlan'
import { addDays, format, parseISO } from 'date-fns'
import type { TableOut } from '@/api/types'

type AdminTab = 'bookings' | 'tables' | 'floorplan'

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('bookings')

  return (
    <div className="space-y-7">
      <header className="border-b border-border pb-6">
        <p className="label mb-2">Club management</p>
        <h1 className="font-display text-4xl tracking-tight text-text sm:text-5xl">Admin</h1>
        <p className="mt-3 text-sm text-dim">Manage bookings, tables and the room layout.</p>
      </header>
      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-border bg-raised p-1" aria-label="Admin sections">
        {([
          { id: 'bookings', label: 'Bookings', icon: List },
          { id: 'tables', label: 'Tables', icon: Wrench },
          { id: 'floorplan', label: 'Room layout', icon: Map },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cn(
              'flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors sm:px-4 sm:text-sm',
              tab === id ? 'border-border bg-surface text-gold' : 'border-transparent text-dim hover:text-text',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      {tab === 'bookings' && <BookingsTab />}
      {tab === 'tables' && <TablesTab />}
      {tab === 'floorplan' && <FloorPlanTab />}
    </div>
  )
}

function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 p-5" role="alert">
      <p className="text-sm text-dim">{message}</p>
      <button onClick={retry} className="btn btn-secondary">
        <RotateCw className="h-4 w-4" aria-hidden="true" />Try again
      </button>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  )
}

function BookingsTab() {
  const [date, setDate] = useState(todayStr())
  const { data: bookings = [], isLoading, isFetching, isError, refetch } = useAdminBookings(date)
  const { data: tables = [] } = useAdminTables()
  const cancelBooking = useAdminCancelBooking()
  const toast = useToast()
  const tableMap = Object.fromEntries(tables.map(table => [table.id, table]))

  function shiftDate(days: number) {
    const next = format(addDays(parseISO(date), days), 'yyyy-MM-dd')
    if (next >= todayStr() && next <= maxBookingDate()) setDate(next)
  }

  async function handleCancel(id: number) {
    try {
      await cancelBooking.mutateAsync(id)
      toast('Booking cancelled', 'info')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not cancel the booking. Try again.', 'error')
    }
  }

  function exportCsv() {
    const cell = (value: string | number) => {
      const text = String(value)
      const safe = /^[=+@\-\t\r\n]/.test(text) ? `'${text}` : text
      return `"${safe.replace(/"/g, '""')}"`
    }
    const rows = bookings.map(booking =>
      [booking.id, tableMap[booking.table_id]?.name ?? booking.table_id, booking.user_name, booking.date, booking.start_time, booking.end_time].map(cell).join(','),
    )
    const blob = new Blob([['id,table,user,date,start,end', ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bookings-${date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const timeInMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  const totalHours = bookings.reduce((total, booking) =>
    total + (timeInMinutes(booking.end_time) - timeInMinutes(booking.start_time)) / 60, 0)

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="flex gap-2">
          {[{ label: 'Today', value: todayStr() }, { label: 'Tomorrow', value: tomorrowStr() }].map(day => (
            <button
              key={day.value}
              onClick={() => setDate(day.value)}
              aria-pressed={date === day.value}
              className={cn('btn text-xs', date === day.value ? 'btn-primary' : 'btn-secondary')}
            >{day.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button onClick={() => shiftDate(-1)} disabled={date <= todayStr()} className="btn-icon" aria-label="Previous date">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-bg px-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              type="date" value={date} min={todayStr()} max={maxBookingDate()} aria-label="Booking date"
              onChange={event => {
                const next = event.target.value
                if (next && next >= todayStr() && next <= maxBookingDate()) setDate(next)
              }}
              className="w-28 bg-transparent text-xs text-text outline-none"
            />
          </label>
          <button onClick={() => shiftDate(1)} disabled={date >= maxBookingDate()} className="btn-icon" aria-label="Next date">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-icon" aria-label="Refresh bookings">
          <RotateCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" />
        </button>
        <button onClick={exportCsv} disabled={bookings.length === 0 || isError} className="btn btn-secondary text-xs">
          <Download className="h-4 w-4" aria-hidden="true" />Export CSV
        </button>
      </div>

      {!isError && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Bookings', value: bookings.length },
            { label: 'Tables booked', value: new Set(bookings.map(booking => booking.table_id)).size },
            { label: 'Hours booked', value: Math.round(totalHours * 10) / 10 },
            { label: 'Players', value: new Set(bookings.map(booking => booking.user_id)).size },
          ].map(stat => (
            <div key={stat.label} className="border-l-2 border-gold-border py-1 pl-4">
              <div className="font-display text-3xl text-text">{isLoading ? '...' : stat.value}</div>
              <div className="mt-1 text-xs text-dim">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text">{formatDate(date)}</h2>
        {isLoading && <LoadingRows />}
        {isError && <QueryError message="Could not load bookings for this date." retry={() => refetch()} />}
        {!isLoading && !isError && bookings.length === 0 && (
          <div className="card px-6 py-10 text-center">
            <h3 className="font-medium text-text">No bookings for this date</h3>
            <p className="mt-2 text-sm text-dim">Choose another date to see the schedule.</p>
          </div>
        )}
        {bookings.map(booking => {
          const tableName = tableMap[booking.table_id]?.name ?? `Table ${booking.table_id}`
          return (
            <div key={booking.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-semibold text-text">{tableName}</h3>
                <p className="mt-1 text-sm text-dim">{booking.user_name || 'Player'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <p className="text-sm tabular-nums text-gold">{booking.start_time.slice(0, 5)} to {booking.end_time.slice(0, 5)}</p>
                <button
                  onClick={() => handleCancel(booking.id)} disabled={cancelBooking.isPending}
                  aria-label={`Cancel ${booking.user_name || 'player'} booking for ${tableName} at ${booking.start_time.slice(0, 5)}`}
                  className="btn btn-danger text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {cancelBooking.isPending && cancelBooking.variables === booking.id ? 'Cancelling' : 'Cancel'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TablesTab() {
  const { data: tables = [], isLoading, isFetching, isError, refetch } = useAdminTables()
  const createTable = useCreateTable()
  const toast = useToast()
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('\u{1F3B2}')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  async function handleCreate() {
    if (!newName.trim() || createTable.isPending) return
    try {
      await createTable.mutateAsync({ name: newName.trim(), emoji: newEmoji })
      toast('Table added', 'success')
      setNewName('')
      setNewEmoji('\u{1F3B2}')
      setShowEmojiPicker(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add the table. Try again.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <form className="card p-5 sm:p-6" onSubmit={event => { event.preventDefault(); void handleCreate() }}>
        <h2 className="text-base font-semibold text-text">Add a table</h2>
        <p className="mt-1 text-sm text-dim">Give it a name players can find in the club.</p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="relative">
            <span className="mb-2 block text-xs font-medium text-dim">Icon</span>
            <button
              type="button" onClick={() => setShowEmojiPicker(previous => !previous)}
              aria-label="Choose table icon" aria-expanded={showEmojiPicker}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-raised text-xl hover:border-border-strong"
            >{newEmoji}</button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-full z-50 mt-2">
                <EmojiPicker onEmojiClick={emoji => { setNewEmoji(emoji.emoji); setShowEmojiPicker(false) }} theme={Theme.LIGHT} height={340} width={270} />
              </div>
            )}
          </div>
          <label className="min-w-36 flex-1">
            <span className="mb-2 block text-xs font-medium text-dim">Table name</span>
            <input value={newName} onChange={event => setNewName(event.target.value)} placeholder="For example, Table 1" className="input h-11" required />
          </label>
          <button type="submit" disabled={!newName.trim() || createTable.isPending} className="btn btn-primary min-h-11">
            <Plus className="h-4 w-4" aria-hidden="true" />{createTable.isPending ? 'Adding' : 'Add table'}
          </button>
        </div>
      </form>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">Tables {tables.length > 0 && <span className="ml-1 font-normal text-muted">({tables.length})</span>}</h2>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-icon" aria-label="Refresh tables">
          <RotateCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" />
        </button>
      </div>
      {isLoading && <LoadingRows />}
      {isError && <QueryError message="Could not load the tables." retry={() => refetch()} />}
      {!isLoading && !isError && tables.length === 0 && <p className="card p-7 text-sm text-dim">No tables yet. Add your first table above to open it for bookings.</p>}
      <div className="space-y-3">
        {tables.map(table => <TableRow key={table.id} table={table} />)}
      </div>
    </div>
  )
}

function TableRow({ table }: { table: TableOut }) {
  const updateTable = useUpdateTable(table.id)
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(table.name)
  const [emoji, setEmoji] = useState(table.emoji)
  const [showPicker, setShowPicker] = useState(false)

  async function handleSave() {
    if (!name.trim() || updateTable.isPending) return
    try {
      await updateTable.mutateAsync({ name: name.trim(), emoji })
      toast('Table updated', 'success')
      setEditing(false)
      setShowPicker(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the table. Try again.', 'error')
    }
  }

  async function toggleActive() {
    try {
      await updateTable.mutateAsync({ is_active: !table.is_active })
      toast(table.is_active ? 'Table closed for bookings' : 'Table open for bookings', 'info')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update the table. Try again.', 'error')
    }
  }

  return (
    <motion.div layout className="card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-0 flex-1 basis-48">
        {editing ? (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <button
                onClick={() => setShowPicker(previous => !previous)} aria-label={`Choose icon for ${table.name}`} aria-expanded={showPicker}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-raised text-xl hover:border-border-strong"
              >{emoji}</button>
              {showPicker && (
                <div className="absolute left-0 top-full z-50 mt-2">
                  <EmojiPicker onEmojiClick={selected => { setEmoji(selected.emoji); setShowPicker(false) }} theme={Theme.LIGHT} height={300} width={260} />
                </div>
              )}
            </div>
            <input
              value={name} onChange={event => setName(event.target.value)} aria-label="Table name"
              className="input min-w-0 flex-1" autoFocus
              onKeyDown={event => { if (event.key === 'Enter') void handleSave() }}
            />
          </div>
        ) : (
          <div>
            <h3 className="break-words text-sm font-semibold text-text">{table.name}</h3>
            <p className="mt-1 text-xs text-dim">{table.is_active ? 'Open for bookings' : 'Closed for bookings'}</p>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {editing ? (
          <>
            <button onClick={handleSave} disabled={updateTable.isPending || !name.trim()} className="btn-icon" aria-label="Save table">
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => { setEditing(false); setName(table.name); setEmoji(table.emoji); setShowPicker(false) }}
              disabled={updateTable.isPending} className="btn-icon" aria-label="Discard table changes"
            ><X className="h-4 w-4" aria-hidden="true" /></button>
          </>
        ) : (
          <button onClick={() => { setName(table.name); setEmoji(table.emoji); setEditing(true) }} className="btn-icon" aria-label={`Edit ${table.name}`}>
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button onClick={toggleActive} disabled={updateTable.isPending} className="btn btn-secondary text-xs">
          {table.is_active ? 'Close table' : 'Open table'}
        </button>
      </div>
    </motion.div>
  )
}

function FloorPlanTab() {
  const tablesQuery = useAdminTables()
  const bookingsQuery = useBookingsByDate(todayStr())
  const toast = useToast()

  if (tablesQuery.isLoading || bookingsQuery.isLoading) return <LoadingRows />
  if (tablesQuery.isError || bookingsQuery.isError) {
    return <QueryError message="Could not load the room layout." retry={() => { void tablesQuery.refetch(); void bookingsQuery.refetch() }} />
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text">Room layout</h2>
        <p className="mt-1 text-sm text-dim">Move each table to match its position in the club, then save the layout.</p>
      </div>
      {tablesQuery.data?.length === 0 ? (
        <p className="card p-7 text-sm text-dim">Add a table in the Tables section to start arranging the room.</p>
      ) : (
        <FloorPlan tables={tablesQuery.data ?? []} bookings={bookingsQuery.data ?? []} editable onPositionsSaved={() => toast('Layout saved', 'success')} />
      )}
    </div>
  )
}
