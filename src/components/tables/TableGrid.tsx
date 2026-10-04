import { motion, type Variants } from 'framer-motion'
import { Armchair } from 'lucide-react'
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
      <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
        <Armchair className="mx-auto mb-4 h-7 w-7 text-muted" aria-hidden="true" />
        <h3 className="font-display text-2xl text-text">No tables available</h3>
        <p className="mt-2 text-sm text-dim">The club has not added any tables yet. Check back soon.</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
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
