import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { loadTablePositions, saveTablePositions, type TablePosition } from '@/lib/storage'
import { clubHours, timeStrToHour } from '@/lib/dates'
import type { BookingOut, TableOut } from '@/api/types'

const CANVAS_W = 900
const CANVAS_H = 500
const CARD_W   = 130
const CARD_H   = 90
const SNAP     = 20

function snapToGrid(value: number, snap: number) {
  return Math.round(value / snap) * snap
}

function defaultPositions(tables: TableOut[]): Record<number, TablePosition> {
  const positions: Record<number, TablePosition> = {}
  const cols = 5
  tables.forEach((t, i) => {
    positions[t.id] = {
      x: 40 + (i % cols) * (CARD_W + 30),
      y: 40 + Math.floor(i / cols) * (CARD_H + 40),
    }
  })
  return positions
}

interface DraggableCardProps {
  table: TableOut
  position: TablePosition
  bookings: BookingOut[]
  editable: boolean
  onClick: () => void
}

function DraggableCard({ table, position, bookings, editable, onClick }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    disabled: !editable,
  })

  const tb = bookings.filter(b => b.table_id === table.id)
  let booked = 0
  for (const b of tb) booked += timeStrToHour(b.end_time) - timeStrToHour(b.start_time)
  const total = clubHours().length
  const pct   = Math.min((booked / total) * 100, 100)
  const isFull = booked >= total

  const x = transform ? snapToGrid(position.x + transform.x, SNAP) : position.x
  const y = transform ? snapToGrid(position.y + transform.y, SNAP) : position.y

  return (
    <motion.div
      ref={setNodeRef}
      {...(editable ? { ...attributes, ...listeners } : {})}
      onClick={!editable ? onClick : undefined}
      style={{
        position: 'absolute',
        left: x, top: y,
        width: CARD_W, height: CARD_H,
        zIndex: isDragging ? 50 : 1,
        touchAction: 'none',
        background: isDragging ? '#1c1c1c' : '#161616',
        border: `1px solid ${isDragging ? '#3a3a3a' : isFull ? 'rgba(240,64,64,0.25)' : '#2a2a2a'}`,
        borderRadius: '8px',
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.7)' : '0 2px 8px rgba(0,0,0,0.4)',
        cursor: editable ? 'grab' : 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      whileHover={!editable ? { y: -2, scale: 1.03 } : {}}
    >
      {/* Status dot */}
      <div
        className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
        style={{ background: isFull ? '#f04040' : '#4caf72' }}
      />

      <div className="p-2.5 h-full flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{table.emoji}</span>
          <div className="text-xs font-medium text-text truncate leading-tight">{table.name}</div>
        </div>

        <div>
          <div className="text-[9px] text-muted mb-1 uppercase font-medium tracking-wide">
            {isFull ? 'Full' : `${total - booked}h free`}
          </div>
          <div className="h-0.5 rounded-full" style={{ background: '#222' }}>
            <div
              className="h-0.5 rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: isFull ? '#f04040' : pct >= 60 ? '#e8c96d' : '#4caf72',
              }}
            />
          </div>
        </div>
      </div>

      {editable && (
        <div className="absolute bottom-1.5 right-1.5 opacity-20">
          <svg width="8" height="8" viewBox="0 0 8 8">
            <circle cx="2" cy="2" r="1" fill="#999" />
            <circle cx="6" cy="2" r="1" fill="#999" />
            <circle cx="2" cy="6" r="1" fill="#999" />
            <circle cx="6" cy="6" r="1" fill="#999" />
          </svg>
        </div>
      )}
    </motion.div>
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
  const activeTables = editable ? tables : tables.filter(t => t.is_active)
  const stored = loadTablePositions()
  const defaults = defaultPositions(activeTables)
  const [positions, setPositions] = useState<Record<number, TablePosition>>(() => ({ ...defaults, ...stored }))
  const [saved, setSaved] = useState(false)

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const id = Number(event.active.id)
    setPositions(prev => {
      const cur = prev[id] ?? defaults[id] ?? { x: 40, y: 40 }
      return {
        ...prev,
        [id]: {
          x: Math.max(0, Math.min(CANVAS_W - CARD_W, snapToGrid(cur.x + event.delta.x, SNAP))),
          y: Math.max(0, Math.min(CANVAS_H - CARD_H, snapToGrid(cur.y + event.delta.y, SNAP))),
        },
      }
    })
  }, [defaults])

  function handleSave() {
    saveTablePositions(positions)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onPositionsSaved?.()
  }

  return (
    <div className="flex flex-col gap-3">
      {editable && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Drag tables to arrange the floor plan</span>
          <button
            onClick={handleSave}
            className="btn btn-primary text-xs py-1.5 px-3"
          >
            {saved ? 'Saved' : 'Save Layout'}
          </button>
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd} modifiers={editable ? [restrictToParentElement] : []}>
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            width: '100%',
            aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
            background: '#0d0d0d',
            border: '1px solid #1e1e1e',
          }}
        >
          {/* Subtle grid for editable mode */}
          {editable && (
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
                  <path d={`M ${SNAP} 0 L 0 0 0 ${SNAP}`} fill="none" stroke="#fff" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          )}

          {/* Entrance label */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-subtle uppercase tracking-widest pointer-events-none">
            Entrance
          </div>

          <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
            {activeTables.map(table => (
              <DraggableCard
                key={table.id}
                table={table}
                position={positions[table.id] ?? defaults[table.id] ?? { x: 40, y: 40 }}
                bookings={bookings}
                editable={editable}
                onClick={() => onTableClick?.(table)}
              />
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  )
}
