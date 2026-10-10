import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  List, Wrench, CalendarDays, Trash2, Download,
  Plus, ChevronLeft, ChevronRight, RotateCw, Edit2, Check, X,
} from 'lucide-react'
import { usePreferences } from '@/preferences/PreferencesContext'
import { cn } from '@/lib/cn'
import {
  useAdminBookings, useAdminTables, useAdminCancelBooking,
  useCreateTable, useUpdateTable,
} from '@/api/hooks'
import { useToast } from '@/lib/toast'
import { todayStr, tomorrowStr, maxBookingDate } from '@/lib/dates'
import { addDays, format, parseISO } from 'date-fns'
import type { TableOut } from '@/api/types'

type AdminTab = 'bookings' | 'tables'

export function AdminPage() {
  const { t } = usePreferences()
  const [tab, setTab] = useState<AdminTab>('bookings')

  return (
    <div className="mx-auto max-w-5xl space-y-8 sm:space-y-10">
      <header>
        <h1 className="page-heading">{t('Admin')}</h1>
      </header>
      <div className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label={t('Admin sections')}>
        {([
          { id: 'bookings', label: 'Bookings', icon: List },
          { id: 'tables', label: 'Tables', icon: Wrench },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cn(
              'flex min-h-12 items-center gap-2 rounded-lg px-5 text-base font-semibold transition-colors',
              tab === id ? 'bg-gold-muted text-gold' : 'text-dim hover:bg-surface hover:text-text',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />{t(label)}
          </button>
        ))}
      </div>
      {tab === 'bookings' && <BookingsTab />}
      {tab === 'tables' && <TablesTab />}
    </div>
  )
}

function QueryError({ message, retry }: { message: string; retry: () => void }) {
  const { t } = usePreferences()
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 p-5" role="alert">
      <p className="text-base text-dim">{t(message)}</p>
      <button onClick={retry} className="btn btn-secondary">
        <RotateCw className="h-4 w-4" aria-hidden="true" />{t('Try again')}
      </button>
    </div>
  )
}

function LoadingRows() {
  const { t } = usePreferences()
  return (
    <div className="space-y-3" role="status" aria-label={t('Loading')}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  )
}

function BookingsTab() {
  const { t, formatDate, locale } = usePreferences()
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
      toast(t('Booking cancelled'), 'info')
    } catch (err) {
      toast(t(err instanceof Error ? err.message : 'Could not cancel the booking. Try again.'), 'error')
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
    const header = ['ID', 'Table', 'Player', 'Date', 'Start', 'End'].map(label => cell(t(label))).join(',')
    const blob = new Blob(['\uFEFF', [header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[{ label: 'Today', value: todayStr() }, { label: 'Tomorrow', value: tomorrowStr() }].map(day => (
            <button
              key={day.value}
              onClick={() => setDate(day.value)}
              aria-pressed={date === day.value}
              className={cn('btn', date === day.value ? 'btn-primary' : 'btn-secondary')}
            >{t(day.label)}</button>
          ))}
        </div>
        <div className="flex w-full max-w-xs items-center gap-2 sm:ml-auto sm:w-auto">
          <button onClick={() => shiftDate(-1)} disabled={date <= todayStr()} className="btn-icon" aria-label={t('Previous date')}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              type="date" value={date} min={todayStr()} max={maxBookingDate()} aria-label={t('Booking date')} lang={locale}
              onChange={event => {
                const next = event.target.value
                if (next && next >= todayStr() && next <= maxBookingDate()) setDate(next)
              }}
              className="min-w-0 w-full bg-transparent text-base text-text outline-none sm:w-36"
            />
          </label>
          <button onClick={() => shiftDate(1)} disabled={date >= maxBookingDate()} className="btn-icon" aria-label={t('Next date')}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-icon" aria-label={t('Refresh bookings')}>
          <RotateCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" />
        </button>
        <button onClick={exportCsv} disabled={bookings.length === 0 || isError} className="btn btn-secondary">
          <Download className="h-4 w-4" aria-hidden="true" />{t('Export CSV')}
        </button>
      </div>

      {!isError && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {[
            { label: 'Bookings', value: bookings.length },
            { label: 'Tables booked', value: new Set(bookings.map(booking => booking.table_id)).size },
            { label: 'Hours booked', value: Math.round(totalHours * 10) / 10 },
            { label: 'Players', value: new Set(bookings.map(booking => booking.user_id)).size },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-3xl font-semibold tabular-nums text-text">{isLoading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-raised" aria-label={t('Loading')} /> : stat.value.toLocaleString(locale)}</div>
              <div className="mt-2 text-sm text-dim">{t(stat.label)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text">{formatDate(date)}</h2>
        {isLoading && <LoadingRows />}
        {isError && <QueryError message="Could not load bookings for this date." retry={() => refetch()} />}
        {!isLoading && !isError && bookings.length === 0 && (
          <div className="card px-6 py-10 text-center">
            <h3 className="font-medium text-text">{t('No bookings for this date')}</h3>
            <p className="mt-2 text-base text-dim">{t('Choose another date to see the schedule.')}</p>
          </div>
        )}
        {bookings.map(booking => {
          const tableName = tableMap[booking.table_id]?.name ?? t('Table {number}', { number: booking.table_id })
          return (
            <div key={booking.id} className="card flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold text-text">{tableName}</h3>
                <p className="mt-2 text-sm text-dim">{booking.user_name || t('Player')}</p>
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:w-auto sm:gap-6">
                <p className="text-base tabular-nums text-text">{t('{start} to {end}', { start: booking.start_time.slice(0, 5), end: booking.end_time.slice(0, 5) })}</p>
                <button
                  onClick={() => handleCancel(booking.id)} disabled={cancelBooking.isPending}
                  aria-label={t('Cancel {player} booking for {table} at {time}', { player: booking.user_name || t('Player'), table: tableName, time: booking.start_time.slice(0, 5) })}
                  className="btn btn-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t(cancelBooking.isPending && cancelBooking.variables === booking.id ? 'Cancelling' : 'Cancel')}
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
  const { t, locale } = usePreferences()
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
      toast(t('Table added'), 'success')
      setNewName('')
      setNewEmoji('\u{1F3B2}')
      setShowEmojiPicker(false)
    } catch (err) {
      toast(t(err instanceof Error ? err.message : 'Could not add the table. Try again.'), 'error')
    }
  }

  return (
    <div className="space-y-8">
      <form className="card p-5 sm:p-6" onSubmit={event => { event.preventDefault(); void handleCreate() }}>
        <h2 className="text-lg font-semibold text-text">{t('Add a table')}</h2>
        <p className="mt-2 text-base text-dim">{t('Give it a name players can find in the club.')}</p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="relative">
            <span className="mb-2 block text-sm font-medium text-dim">{t('Icon')}</span>
            <button
              type="button" onClick={() => setShowEmojiPicker(previous => !previous)}
              aria-label={t('Choose table icon')} aria-expanded={showEmojiPicker}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-raised text-xl hover:border-border-strong"
            >{newEmoji}</button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-full z-50 mt-2">
                <TableIconPicker selected={newEmoji} onSelect={emoji => { setNewEmoji(emoji); setShowEmojiPicker(false) }} />
              </div>
            )}
          </div>
          <label className="min-w-36 flex-1">
            <span className="mb-2 block text-sm font-medium text-dim">{t('Table name')}</span>
            <input value={newName} onChange={event => setNewName(event.target.value)} placeholder={t('For example, Table 1')} className="input" required />
          </label>
          <button type="submit" disabled={!newName.trim() || createTable.isPending} className="btn btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" />{t(createTable.isPending ? 'Adding' : 'Add table')}
          </button>
        </div>
      </form>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">{t('Tables')} {tables.length > 0 && <span className="ml-1 font-normal text-muted">({tables.length.toLocaleString(locale)})</span>}</h2>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-icon" aria-label={t('Refresh tables')}>
          <RotateCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" />
        </button>
      </div>
      {isLoading && <LoadingRows />}
      {isError && <QueryError message="Could not load the tables." retry={() => refetch()} />}
      {!isLoading && !isError && tables.length === 0 && <p className="card p-7 text-base text-dim">{t('No tables yet. Add your first table above to open it for bookings.')}</p>}
      <div className="space-y-4">
        {tables.map(table => <TableRow key={table.id} table={table} />)}
      </div>
    </div>
  )
}

function TableRow({ table }: { table: TableOut }) {
  const { t } = usePreferences()
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
      toast(t('Table updated'), 'success')
      setEditing(false)
      setShowPicker(false)
    } catch (err) {
      toast(t(err instanceof Error ? err.message : 'Could not save the table. Try again.'), 'error')
    }
  }

  async function toggleActive() {
    try {
      await updateTable.mutateAsync({ is_active: !table.is_active })
      toast(t(table.is_active ? 'Table closed for bookings' : 'Table open for bookings'), 'info')
    } catch (err) {
      toast(t(err instanceof Error ? err.message : 'Could not update the table. Try again.'), 'error')
    }
  }

  return (
    <motion.div layout className="card flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
      <div className="min-w-0 flex-1 basis-48">
        {editing ? (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <button
                onClick={() => setShowPicker(previous => !previous)} aria-label={t('Choose icon for {table}', { table: table.name })} aria-expanded={showPicker}
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-raised text-xl hover:border-border-strong"
              >{emoji}</button>
              {showPicker && (
                <div className="absolute left-0 top-full z-50 mt-2">
                  <TableIconPicker selected={emoji} onSelect={selected => { setEmoji(selected); setShowPicker(false) }} />
                </div>
              )}
            </div>
            <input
              value={name} onChange={event => setName(event.target.value)} aria-label={t('Table name')}
              className="input min-w-0 flex-1" autoFocus
              onKeyDown={event => { if (event.key === 'Enter') void handleSave() }}
            />
          </div>
        ) : (
          <div>
            <h3 className="break-words text-base font-semibold text-text">{table.name}</h3>
            <p className="mt-2 text-sm text-dim">{t(table.is_active ? 'Open for bookings' : 'Closed for bookings')}</p>
          </div>
        )}
      </div>
      <div className="flex max-w-full flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button onClick={handleSave} disabled={updateTable.isPending || !name.trim()} className="btn-icon" aria-label={t('Save table')}>
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => { setEditing(false); setName(table.name); setEmoji(table.emoji); setShowPicker(false) }}
              disabled={updateTable.isPending} className="btn-icon" aria-label={t('Discard table changes')}
            ><X className="h-4 w-4" aria-hidden="true" /></button>
          </>
        ) : (
          <button onClick={() => { setName(table.name); setEmoji(table.emoji); setEditing(true) }} className="btn-icon" aria-label={t('Edit {table}', { table: table.name })}>
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button onClick={toggleActive} disabled={updateTable.isPending} className="btn btn-secondary">
          {t(table.is_active ? 'Close table' : 'Open table')}
        </button>
      </div>
    </motion.div>
  )
}

function TableIconPicker({ selected, onSelect }: { selected: string; onSelect: (emoji: string) => void }) {
  const { t } = usePreferences()
  const icons = [
    ['🎲', 'Dice'], ['♟️', 'Chess'], ['🃏', 'Cards'], ['🛡️', 'Shield'],
    ['⚔️', 'Swords'], ['🎯', 'Target'], ['🧩', 'Puzzle'], ['⭐', 'Star'],
  ] as const

  return (
    <div className="grid w-52 grid-cols-4 gap-1 rounded-lg border border-border bg-surface p-2 shadow-card" role="group" aria-label={t('Choose table icon')}>
      {icons.map(([emoji, label]) => (
        <button
          key={label} type="button" aria-label={t(label)} title={t(label)} aria-pressed={selected === emoji}
          onClick={() => onSelect(emoji)}
          className={cn('flex h-11 w-11 items-center justify-center rounded-md border text-xl transition-colors', selected === emoji ? 'border-gold bg-gold-dim' : 'border-transparent hover:border-border hover:bg-raised')}
        >{emoji}</button>
      ))}
    </div>
  )
}
