import { formatTime, getTableAvailability } from '@/lib/availability'
import { CLUB_OPEN, CLUB_CLOSE } from '@/lib/dates'
import { usePreferences } from '@/preferences/PreferencesContext'

interface AvailabilityTimelineProps {
  availability: ReturnType<typeof getTableAvailability>
  selectedHour?: number
}

/** Exact reservation boundaries; the surrounding text does not rely on colour. */
export function AvailabilityTimeline({ availability, selectedHour }: AvailabilityTimelineProps) {
  const { t } = usePreferences()
  const start = CLUB_OPEN * 60
  const duration = (CLUB_CLOSE - CLUB_OPEN) * 60
  const position = (minutes: number) => `${(minutes - start) / duration * 100}%`
  const busyTimes = availability.busy.map(range => `${formatTime(range.start)} - ${formatTime(range.end)}`).join(', ')
  const freeTimes = availability.free.map(range => `${formatTime(range.start)} - ${formatTime(range.end)}`).join(', ')
  const showSelection = selectedHour !== undefined && selectedHour >= CLUB_OPEN && selectedHour < CLUB_CLOSE

  return (
    <div>
      <p className="sr-only">
        {busyTimes ? t('Busy: {times}', { times: busyTimes }) : t('Free all day')}
        {freeTimes && busyTimes ? ` ${t('Free: {times}', { times: freeTimes })}` : ''}
      </p>
      <div aria-hidden="true">
        <div className="relative h-5 rounded-md border border-border bg-raised">
          <div className="absolute inset-0 overflow-hidden rounded-[5px]">
            {availability.busy.map(range => <span key={range.start} className="absolute inset-y-0 bg-gold/70" style={{ left: position(range.start), width: `${(range.end - range.start) / duration * 100}%`, backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 5px, rgb(var(--surface) / .18) 5px, rgb(var(--surface) / .18) 7px)' }} />)}
            {Array.from({ length: CLUB_CLOSE - CLUB_OPEN - 1 }, (_, index) => <span key={index} className="absolute inset-y-0 w-px bg-surface/50" style={{ left: position((CLUB_OPEN + index + 1) * 60) }} />)}
          </div>
          {showSelection && <span className="absolute -bottom-1 -top-1 z-10 w-0.5 bg-text shadow-[0_0_0_2px_rgb(var(--surface))]" style={{ left: position(selectedHour * 60) }} />}
        </div>
        <div className="mt-2 flex justify-between text-xs tabular-nums text-dim">
          {[CLUB_OPEN, 14, 18, CLUB_CLOSE].map(hour => <span key={hour}>{formatTime(hour * 60)}</span>)}
        </div>
      </div>
    </div>
  )
}
