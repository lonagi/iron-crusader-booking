import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  List, Wrench, Map, CalendarDays, Trash2, Download,
  Plus, ChevronLeft, ChevronRight, RotateCw, Edit2, Check, X,
} from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { cn } from '@/lib/cn'
import {
  useAdminBookings, useAdminTables, useAdminCancelBooking,
  useCreateTable, useUpdateTable,
  useTables, useBookingsByDate,
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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text tracking-tight">Admin</h1>
        <p className="text-sm text-muted mt-1">Iron Crusader — Management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        {([
          { id: 'bookings',  label: 'Bookings',  icon: <List className="w-3.5 h-3.5" /> },
          { id: 'tables',    label: 'Tables',    icon: <Wrench className="w-3.5 h-3.5" /> },
          { id: 'floorplan', label: 'Floor Plan', icon: <Map className="w-3.5 h-3.5" /> },
        ] as const).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all',
              tab === id
                ? 'bg-raised border border-border-strong text-text'
                : 'text-muted hover:text-dim',
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'bookings'  && <BookingsTab />}
          {tab === 'tables'    && <TablesTab />}
          {tab === 'floorplan' && <FloorPlanTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Bookings Tab ──────────────────────────────────────────────────────────────

function BookingsTab() {
  const [date, setDate] = useState(todayStr())
  const { data: bookings = [], isLoading, refetch } = useAdminBookings(date)
  const { data: tables = [] } = useTables()
  const cancelBooking = useAdminCancelBooking()
  const toast = useToast()

  const tableMap = Object.fromEntries(tables.map(t => [t.id, t]))

  function shiftDate(days: number) {
    const next = format(addDays(parseISO(date), days), 'yyyy-MM-dd')
    if (next >= todayStr() && next <= maxBookingDate()) setDate(next)
  }

  async function handleCancel(id: number) {
    try {
      await cancelBooking.mutateAsync(id)
      toast('Booking cancelled', 'info')
      refetch()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to cancel', 'error')
    }
  }

  function exportCsv() {
    const header = 'id,table,user,date,start,end'
    const rows = bookings.map(b =>
      [b.id, tableMap[b.table_id]?.name ?? b.table_id, b.user_name, b.date, b.start_time, b.end_time].join(','),
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `bookings-${date}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const totalHours = bookings.reduce((acc, b) =>
    acc + parseInt(b.end_time.split(':')[0]) - parseInt(b.start_time.split(':')[0]), 0)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        {[{ label: 'Today', v: todayStr() }, { label: 'Tomorrow', v: tomorrowStr() }].map(d => (
          <button
            key={d.v}
            onClick={() => setDate(d.v)}
            className={cn('btn btn-secondary text-xs py-1.5 px-3', date === d.v && 'border-gold-border text-gold')}
            style={date === d.v ? { borderColor: 'rgba(232,201,109,0.3)', color: '#e8c96d', background: 'rgba(232,201,109,0.06)' } : {}}
          >
            {d.label}
          </button>
        ))}

        <div className="flex items-center gap-1.5 ml-auto">
          <button onClick={() => shiftDate(-1)} className="btn-icon"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md" style={{ border: '1px solid #2e2e2e', background: '#0a0a0a' }}>
            <CalendarDays className="w-3.5 h-3.5 text-muted shrink-0" />
            <input
              type="date" value={date} min={todayStr()} max={maxBookingDate()}
              onChange={e => setDate(e.target.value)}
              className="bg-transparent text-xs outline-none w-28 text-dim"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
          <button onClick={() => shiftDate(1)} className="btn-icon"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>

        <button onClick={() => refetch()} className="btn-icon">
          <RotateCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </button>
        <button onClick={exportCsv} disabled={bookings.length === 0} className="btn btn-secondary text-xs py-1.5">
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Bookings',    value: bookings.length },
          { label: 'Tables',      value: new Set(bookings.map(b => b.table_id)).size },
          { label: 'Hours',       value: totalHours + 'h' },
          { label: 'Commanders',  value: new Set(bookings.map(b => b.user_id)).size },
        ].map(stat => (
          <div key={stat.label} className="card p-3 text-center">
            <div className="text-xl font-semibold text-text">{stat.value}</div>
            <div className="label mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div>
        <div className="label mb-2">{formatDate(date)} · {bookings.length} booking{bookings.length !== 1 ? 's' : ''}</div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg animate-pulse" style={{ height: '60px', background: '#111', border: '1px solid #1e1e1e' }} />
            ))}
          </div>
        )}

        {!isLoading && bookings.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">No bookings for this date</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {bookings.map(b => {
            const table = tableMap[b.table_id]
            return (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card px-4 py-3 flex items-center justify-between gap-3 mt-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{table?.emoji ?? '🎲'}</span>
                  <div>
                    <div className="text-sm font-medium text-text">{table?.name ?? `Table #${b.table_id}`}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {b.user_name ?? 'Unknown'} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(b.id)}
                  disabled={cancelBooking.isPending}
                  className="btn btn-danger text-xs py-1.5 px-3"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Tables Tab ────────────────────────────────────────────────────────────────

function TablesTab() {
  const { data: tables = [], isLoading, refetch } = useAdminTables()
  const createTable = useCreateTable()
  const toast = useToast()

  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🎲')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      await createTable.mutateAsync({ name: newName.trim(), emoji: newEmoji })
      toast(`Table "${newName}" created`, 'success')
      setNewName(''); setNewEmoji('🎲')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create table', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Create */}
      <div className="card p-4">
        <div className="label mb-3 flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          New table
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(p => !p)}
              className="w-10 h-9 rounded-md border border-border text-xl flex items-center justify-center hover:border-border-strong transition-colors"
              style={{ background: '#161616' }}
            >
              {newEmoji}
            </button>
            {showEmojiPicker && (
              <div className="absolute z-50 top-11 left-0">
                <EmojiPicker
                  onEmojiClick={e => { setNewEmoji(e.emoji); setShowEmojiPicker(false) }}
                  theme={'dark' as never}
                  height={340}
                  width={280}
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-36">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Table name…"
              className="input"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={!newName.trim() || createTable.isPending}
            className="btn btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            {createTable.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>

      {/* List header */}
      <div className="flex items-center justify-between">
        <span className="label">All tables ({tables.length})</span>
        <button onClick={() => refetch()} className="btn-icon">
          <RotateCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg animate-pulse" style={{ height: '56px', background: '#111', border: '1px solid #1e1e1e' }} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {tables.map(table => (
          <TableRow key={table.id} table={table} onUpdated={refetch} />
        ))}
      </div>
    </div>
  )
}

function TableRow({ table, onUpdated }: { table: TableOut; onUpdated: () => void }) {
  const updateTable = useUpdateTable(table.id)
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(table.name)
  const [emoji, setEmoji] = useState(table.emoji)
  const [showPicker, setShowPicker] = useState(false)

  async function handleSave() {
    try {
      await updateTable.mutateAsync({ name, emoji })
      toast('Table updated', 'success')
      setEditing(false)
      onUpdated()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  async function toggleActive() {
    try {
      await updateTable.mutateAsync({ is_active: !table.is_active })
      toast(`Table ${table.is_active ? 'deactivated' : 'activated'}`, 'info')
      onUpdated()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  return (
    <motion.div
      layout
      className={cn('card px-4 py-3 flex items-center justify-between gap-3', !table.is_active && 'opacity-50')}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <div className="relative">
              <button
                onClick={() => setShowPicker(p => !p)}
                className="w-9 h-9 border border-border rounded-md text-xl flex items-center justify-center hover:border-border-strong transition-colors"
                style={{ background: '#161616' }}
              >
                {emoji}
              </button>
              {showPicker && (
                <div className="absolute z-50 top-11 left-0">
                  <EmojiPicker
                    onEmojiClick={e => { setEmoji(e.emoji); setShowPicker(false) }}
                    theme={'dark' as never}
                    height={300}
                    width={260}
                  />
                </div>
              )}
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input flex-1 text-sm py-1.5"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xl">{table.emoji}</span>
            <div>
              <div className="text-sm font-medium text-text">{table.name}</div>
              <div className="text-xs text-muted mt-0.5">#{table.id} · {table.is_active ? 'Active' : 'Inactive'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {editing ? (
          <>
            <button onClick={handleSave} disabled={updateTable.isPending} className="btn-icon" title="Save">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setEditing(false); setName(table.name); setEmoji(table.emoji) }} className="btn-icon" title="Cancel">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="btn-icon" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={toggleActive}
          disabled={updateTable.isPending}
          className="btn btn-secondary text-xs py-1 px-2.5"
        >
          {table.is_active ? 'Disable' : 'Enable'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Floor Plan Tab ────────────────────────────────────────────────────────────

function FloorPlanTab() {
  const { data: tables = [] } = useAdminTables()
  const { data: bookings = [] } = useBookingsByDate(todayStr())
  const toast = useToast()

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Drag tables to set their positions on the floor plan</p>
      <FloorPlan
        tables={tables}
        bookings={bookings}
        editable
        onPositionsSaved={() => toast('Layout saved', 'success')}
      />
    </div>
  )
}
