import { motion } from 'framer-motion'
import type { BookingOut, TableOut } from '@/api/types'
import { clubHours } from '@/lib/dates'

interface TableCardProps {
  table: TableOut
  bookings?: BookingOut[]
  onClick?: () => void
  compact?: boolean
}

function getOccupancy(bookings: BookingOut[], tableId: number) {
  const tb = bookings.filter(b => b.table_id === tableId)
  let booked = 0
  for (const b of tb) {
    booked += parseInt(b.end_time.split(':')[0], 10) - parseInt(b.start_time.split(':')[0], 10)
  }
  return { booked, total: clubHours().length, count: tb.length }
}

export function TableCard({ table, bookings = [], onClick, compact = false }: TableCardProps) {
  const { booked, total, count } = getOccupancy(bookings, table.id)
  const pct = Math.min((booked / total) * 100, 100)
  const isFull = booked >= total

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card cursor-pointer overflow-hidden transition-colors"
      style={{
        opacity: table.is_active ? 1 : 0.4,
        padding: compact ? '12px' : '16px',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#2e2e2e'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#222'}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="shrink-0 flex items-center justify-center rounded-md"
            style={{
              width: compact ? 32 : 38,
              height: compact ? 32 : 38,
              background: '#161616',
              border: '1px solid #2a2a2a',
              fontSize: compact ? 16 : 20,
            }}
          >
            {table.emoji}
          </div>
          <div>
            <div className="text-sm font-semibold text-text">{table.name}</div>
            {!compact && <div className="text-xs text-muted mt-0.5">Station #{table.id}</div>}
          </div>
        </div>

        <span className={isFull ? 'badge-full' : 'badge-open'}>
          {isFull ? 'Full' : 'Open'}
        </span>
      </div>

      {/* Occupancy bar */}
      {!compact && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="label">Occupancy</span>
            <span className="text-xs text-muted">
              {booked}h / {total}h{count > 0 && ` · ${count} booking${count > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="h-1 rounded-full" style={{ background: '#1e1e1e' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-1 rounded-full"
              style={{
                background: isFull
                  ? '#f04040'
                  : pct > 60
                  ? '#e8c96d'
                  : '#4caf72',
              }}
            />
          </div>
        </div>
      )}

      {!table.is_active && (
        <div className="mt-2">
          <span className="label" style={{ color: '#555' }}>Inactive</span>
        </div>
      )}
    </motion.div>
  )
}
