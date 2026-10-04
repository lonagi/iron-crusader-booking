import { useId, useMemo, useState } from 'react'
import { ArrowRight, Check, Grip, MoveHorizontal } from 'lucide-react'
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { cn } from '@/lib/cn'
import { loadTablePositions, saveTablePositions, type TablePosition } from '@/lib/storage'
import { clubHours, timeStrToHour } from '@/lib/dates'
import type { BookingOut, TableOut } from '@/api/types'

const CANVAS_W = 900
const CARD_W = 144
const CARD_H = 104
const SNAP = 20

function snapToGrid(value: number) {
  return Math.round(value / SNAP) * SNAP
}

function defaultPositions(tables: TableOut[]): Record<number, TablePosition> {
  return Object.fromEntries(tables.map((table, index) => [table.id, {
    x: 40 + (index % 5) * 164,
    y: 48 + Math.floor(index / 5) * 144,
  }]))
}

interface DraggableCardProps {
  table: TableOut
  position: TablePosition
  bookings: BookingOut[]
  editable: boolean
  onClick?: () => void
}

function DraggableCard({ table, position, bookings, editable, onClick }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: table.id, disabled: !editable })
  const booked = bookings.filter(booking => booking.table_id === table.id)
    .reduce((sum, booking) => sum + timeStrToHour(booking.end_time) - timeStrToHour(booking.start_time), 0)
  const total = clubHours().length
  const free = Math.max(0, total - booked)

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(editable ? { ...attributes, ...listeners } : {})}
      onClick={!editable ? onClick : undefined}
      disabled={!editable && !onClick}
      aria-label={editable ? `Move ${table.name}` : `${table.name}, ${free} hours available. View times.`}
      className={cn(
        'absolute rounded-md border bg-surface p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
        isDragging ? 'border-gold shadow-lg' : 'border-gold/30 shadow-sm',
        editable ? 'cursor-grab active:cursor-grabbing' : 'hover:border-gold hover:bg-gold-muted',
        !table.is_active && 'opacity-50',
      )}
      style={{
        left: position.x,
        top: position.y,
        width: CARD_W,
        height: CARD_H,
        transform: transform ? `translate(${snapToGrid(transform.x)}px, ${snapToGrid(transform.y)}px)` : undefined,
        zIndex: isDragging ? 50 : 1,
        touchAction: editable ? 'none' : 'auto',
      }}
    >
      <span className="absolute -top-2 left-5 h-1.5 w-7 rounded-t-sm bg-gold/25" aria-hidden="true" />
      <span className="absolute -top-2 right-5 h-1.5 w-7 rounded-t-sm bg-gold/25" aria-hidden="true" />
      <span className="absolute -bottom-2 left-5 h-1.5 w-7 rounded-b-sm bg-gold/25" aria-hidden="true" />
      <span className="absolute -bottom-2 right-5 h-1.5 w-7 rounded-b-sm bg-gold/25" aria-hidden="true" />
      <span className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider text-muted">
        <span>Table {String(table.id).padStart(2, '0')}</span>
        {editable && <Grip className="h-3 w-3" aria-hidden="true" />}
      </span>
      <span className="mt-1 block truncate text-sm font-semibold text-text">{table.name}</span>
      <span className={cn('mt-3 block text-[11px]', free ? 'text-gold' : 'text-muted')}>
        {!table.is_active ? 'Inactive' : free ? `${free}h available` : 'Fully booked'}
      </span>
    </button>
  )
}

interface FloorPlanProps {
  tables: TableOut[]
  bookings: BookingOut[]
  editable?: boolean
  onTableClick?: (table: TableOut) => void
  onPositionsSaved?: () => void
}

export function FloorPlan({ tables, bookings, editable = false, onTableClick, onPositionsSaved }: FloorPlanProps) {
  const activeTables = useMemo(() => editable ? tables : tables.filter(table => table.is_active), [editable, tables])
  const defaults = useMemo(() => defaultPositions(activeTables), [activeTables])
  const [positions, setPositions] = useState<Record<number, TablePosition>>(loadTablePositions)
  const [saved, setSaved] = useState(false)
  const gridId = useId().replace(/:/g, '')
  const canvasHeight = Math.max(500, Math.ceil(activeTables.length / 5) * 144 + 96)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function getPosition(id: number): TablePosition {
    const position = positions[id] ?? defaults[id] ?? { x: 40, y: 48 }
    return {
      x: Math.max(0, Math.min(CANVAS_W - CARD_W, position.x)),
      y: Math.max(0, Math.min(canvasHeight - CARD_H, position.y)),
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = Number(event.active.id)
    const current = getPosition(id)
    setPositions(previous => ({
      ...previous,
      [id]: {
        x: Math.max(0, Math.min(CANVAS_W - CARD_W, snapToGrid(current.x + event.delta.x))),
        y: Math.max(0, Math.min(canvasHeight - CARD_H, snapToGrid(current.y + event.delta.y))),
      },
    }))
    setSaved(false)
  }

  function handleSave() {
    saveTablePositions({ ...defaults, ...positions })
    setSaved(true)
    onPositionsSaved?.()
  }

  if (activeTables.length === 0) {
    return <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center text-sm text-dim">{editable ? 'Add a table to start arranging the room.' : 'No tables are available yet. Check back soon.'}</div>
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-relaxed text-dim">{editable ? 'Drag tables into place. With a keyboard, press Space, use the arrows, then press Space again.' : 'Choose a table to see its available times.'}</p>
        {editable && (
          <button onClick={handleSave} className="btn-primary shrink-0">
            {saved && <Check className="h-3.5 w-3.5" />}
            {saved ? 'Layout saved' : 'Save layout'}
          </button>
        )}
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={editable ? [restrictToParentElement] : []}>
        <div className="overflow-x-auto rounded-lg border border-border bg-raised" role="region" aria-label="Club floor plan" tabIndex={0}>
          <div className="relative mx-auto" style={{ width: CANVAS_W, height: canvasHeight }}>
            <svg className="pointer-events-none absolute inset-0 h-full w-full text-border" aria-hidden="true">
              <defs>
                <pattern id={gridId} width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
                  <path d={`M ${SNAP} 0 L 0 0 0 ${SNAP}`} fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${gridId})`} opacity={editable ? 0.7 : 0.3} />
            </svg>
            <div className="pointer-events-none absolute inset-5 rounded border border-border" />
            {activeTables.map(table => (
              <DraggableCard
                key={table.id}
                table={table}
                position={getPosition(table.id)}
                bookings={bookings}
                editable={editable}
                onClick={onTableClick ? () => onTableClick(table) : undefined}
              />
            ))}
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 bg-raised px-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-dim">
              Entrance <ArrowRight className="h-3 w-3 -rotate-90" aria-hidden="true" />
            </div>
          </div>
        </div>
      </DndContext>

      <p className="flex items-center gap-2 text-[11px] text-muted lg:hidden"><MoveHorizontal className="h-3.5 w-3.5" aria-hidden="true" />Scroll sideways to see the whole room.</p>
    </div>
  )
}
