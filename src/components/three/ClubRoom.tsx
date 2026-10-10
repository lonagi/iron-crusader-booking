import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Minus, Plus, RotateCcw, Scan } from 'lucide-react'
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
  const tableKey = JSON.stringify(tables.map(({ id, name, role }) => ({ id, name, role })))
  const labels = useMemo(() => ({ kitchen: t('Kitchen'), craft: t('Craft table'), sofa: t('Sofa'), entrance: t('Entrance') }), [t])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    setUnavailable(false)
    try {
      sceneRef.current = createClubScene({
        canvas, container, theme, tables: tablesRef.current, labels,
        onPick: id => callbacks.current.onPick(id),
        onHover: id => callbacks.current.onHover(id),
        onError: () => setUnavailable(true),
      })
    } catch {
      setUnavailable(true)
    }
    return () => { sceneRef.current?.dispose(); sceneRef.current = null }
  }, [theme, tableKey, labels])

  useEffect(() => { sceneRef.current?.setAvailability(tables) }, [tables])
  useEffect(() => { sceneRef.current?.highlight(highlightedId) }, [highlightedId, theme, tableKey, labels])

  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl bg-raised">
      <div ref={containerRef} className="relative h-[330px] sm:h-[470px] xl:h-[540px]">
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
            <p className="max-w-sm text-base leading-relaxed text-dim">{t('The 3D view is unavailable on this device. You can still book from the table list.')}</p>
            <button type="button" onClick={onList} className="btn-primary">{t('Choose from the list')}</button>
          </div>
        )}
      </div>
      {!unavailable && <div className="flex flex-wrap items-center justify-between gap-2 bg-surface p-3 sm:px-5" role="group" aria-label={t('View controls')}>
        <button type="button" className="btn-ghost px-2" onClick={() => sceneRef.current?.topDown()}><Scan className="h-5 w-5" />{t('View from above')}</button>
        <div className="flex gap-1">
          <button type="button" className="btn-icon border-transparent" aria-label={t('Zoom out')} title={t('Zoom out')} onClick={() => sceneRef.current?.zoom(1 / 1.2)}><Minus className="h-5 w-5" /></button>
          <button type="button" className="btn-icon border-transparent" aria-label={t('Zoom in')} title={t('Zoom in')} onClick={() => sceneRef.current?.zoom(1.2)}><Plus className="h-5 w-5" /></button>
          <button type="button" className="btn-icon border-transparent" aria-label={t('Reset view')} title={t('Reset view')} onClick={() => sceneRef.current?.reset()}><RotateCcw className="h-5 w-5" /></button>
        </div>
      </div>}
      {!unavailable && <p className="bg-surface px-5 pb-4 text-sm leading-relaxed text-muted">{t('Drag to look around. Tap a table to book.')}</p>}
      {!unavailable && <span id="room-keyboard-help" className="sr-only">{t('Use arrow keys to rotate, + or - to zoom, and R to reset the view.')}</span>}
    </div>
  )
}
