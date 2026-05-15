import { motion, type Variants } from 'framer-motion'
import { TableCard } from './TableCard'
import type { BookingOut, TableOut } from '@/api/types'

interface TableGridProps {
  tables: TableOut[]
  bookings: BookingOut[]
  onTableClick: (table: TableOut) => void
}

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 250, damping: 22 } },
}

export function TableGrid({ tables, bookings, onTableClick }: TableGridProps) {
  const activeTables = tables.filter((t) => t.is_active)

  if (activeTables.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-40">🎲</div>
        <p className="text-sm text-muted">No active tables configured</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {activeTables.map((table) => (
        <motion.div key={table.id} variants={item}>
          <TableCard
            table={table}
            bookings={bookings}
            onClick={() => onTableClick(table)}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
