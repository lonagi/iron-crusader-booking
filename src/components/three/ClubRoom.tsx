import { useEffect, useRef, useState } from 'react'
import { Box, List, Minus, Plus, RotateCcw } from 'lucide-react'
import { usePreferences } from '@/preferences/PreferencesContext'
import { createClubScene, type ClubScene, type SceneTable } from './createClubScene'

interface ClubRoomProps {
  tables: SceneTable[]
  highlightedId: number | null
  onHover: (id: number | null) => void
  onPick: (id: number) => void
  onList: () => void
}

export function ClubRoom({ tables, highlightedId, onHover, onPick, onList }: ClubRoomProps) {
  const { theme, t } = usePreferences()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<ClubScene | null>(null)
  const callbacks = useRef({ onHover, onPick })
  callbacks.current = { onHover, onPick }
  const tablesRef = useRef(tables)
  tablesRef.current = tables
  const [unavailable, setUnavailable] = useState(false)
  // Availability refreshes should not rebuild the room or move the camera.
  const tableKey = tables.map(table => `${table.id}:${table.number}`).join(',')

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    setUnavailable(false)
    try {
      sceneRef.current = createClubScene({
        canvas, container, theme, tables: tablesRef.current,
        onPick: id => callbacks.current.onPick(id),
        onHover: id => callbacks.current.onHover(id),
        onError: () => setUnavailable(true),
      })
    } catch {
      setUnavailable(true)
    }
    return () => { sceneRef.current?.dispose(); sceneRef.current = null }
  }, [theme, tableKey])

  useEffect(() => { sceneRef.current?.setAvailability(tables) }, [tables])
  useEffect(() => { sceneRef.current?.highlight(highlightedId) }, [highlightedId, theme, tableKey])

  return (
    <div className="relative min-w-0 overflow-hidden bg-raised">
      <div ref={containerRef} className="relative h-[340px] sm:h-[470px] xl:h-[540px]">
        <canvas
          ref={canvasRef}
          tabIndex={unavailable ? -1 : 0}
          aria-hidden={unavailable || undefined}
          aria-label={t('3D club room. Drag to rotate, pinch or scroll to zoom. Use the table list to book with a keyboard.')}
          aria-describedby="room-keyboard-help"
          className="block h-full w-full cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
        />
        {unavailable && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-raised px-6 text-center" role="status">
            <Box className="h-10 w-10 text-muted" aria-hidden="true" />
            <p className="max-w-sm text-sm leading-6 text-dim">{t('The 3D view is unavailable on this device. You can still book from the table list.')}</p>
            <button type="button" onClick={onList} className="btn-primary">{t('Choose from the list')}</button>
          </div>
        )}
        {!unavailable && (
          <div className="absolute right-3 top-3 flex gap-1 rounded-lg border border-border bg-surface/95 p-1 shadow-sm" role="group" aria-label={t('View controls')}>
            <button type="button" className="btn-icon" aria-label={t('Zoom in')} title={t('Zoom in')} onClick={() => sceneRef.current?.zoom(1.2)}><Plus className="h-4 w-4" /></button>
            <button type="button" className="btn-icon" aria-label={t('Zoom out')} title={t('Zoom out')} onClick={() => sceneRef.current?.zoom(1 / 1.2)}><Minus className="h-4 w-4" /></button>
            <button type="button" className="btn-icon" aria-label={t('Reset view')} title={t('Reset view')} onClick={() => sceneRef.current?.reset()}><RotateCcw className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-4 py-2.5">
        <p className="text-[11px] leading-5 text-dim">{t(unavailable ? 'Choose a table to see its available times.' : 'Drag to look around. Tap a table to book.')}</p>
        <button type="button" onClick={onList} className="btn-ghost min-h-10 text-xs"><List className="h-3.5 w-3.5" />{t('Choose from the list')}</button>
      </div>
      <span id="room-keyboard-help" className="sr-only">{t('Use arrow keys to rotate, + or - to zoom, and R to reset the view.')}</span>
    </div>
  )
}
