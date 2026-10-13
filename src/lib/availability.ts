import type { BookingOut } from '@/api/types'

export const CLUB_OPEN = 10
export const CLUB_CLOSE = 22

export interface TimeRange {
  start: number
  end: number
}

export interface TableAvailability {
  busy: TimeRange[]
  free: TimeRange[]
  slots: { hour: number; available: boolean }[]
}

function timeToMinutes(value: string): number | null {
  const parts = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(value)
  if (!parts) return null
  const hour = Number(parts[1])
  if (hour > 23) return null
  return hour * 60 + Number(parts[2]) + Number(parts[3] ?? 0) / 60
}

export function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`
}

/** Intervals are in minutes; touching reservations form one occupied period. */
export function getTableAvailability(bookings: BookingOut[], tableId: number, date: string): TableAvailability {
  const startOfDay = CLUB_OPEN * 60
  const endOfDay = CLUB_CLOSE * 60
  const intervals: TimeRange[] = []
  for (const booking of bookings) {
    if (booking.table_id !== tableId || booking.date !== date) continue
    const start = timeToMinutes(booking.start_time)
    const end = timeToMinutes(booking.end_time)
    if (start === null || end === null || end <= start) continue
    const clipped = { start: Math.max(startOfDay, start), end: Math.min(endOfDay, end) }
    if (clipped.end > clipped.start) intervals.push(clipped)
  }
  intervals.sort((a, b) => a.start - b.start || a.end - b.end)
  const busy: TimeRange[] = []
  for (const interval of intervals) {
    const previous = busy[busy.length - 1]
    if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end)
    else busy.push({ ...interval })
  }
  const free: TimeRange[] = []
  let cursor = startOfDay
  for (const interval of busy) {
    if (interval.start > cursor) free.push({ start: cursor, end: interval.start })
    cursor = interval.end
  }
  if (cursor < endOfDay) free.push({ start: cursor, end: endOfDay })
  const slots = Array.from({ length: CLUB_CLOSE - CLUB_OPEN }, (_, index) => {
    const hour = CLUB_OPEN + index
    return { hour, available: !busy.some(range => range.start < (hour + 1) * 60 && range.end > hour * 60) }
  })
  return { busy, free, slots }
}

/** An hour is free only if its entire booking interval is free, including partial overlaps. */
export function getHourAvailability(availability: TableAvailability, hour: number): { available: boolean; until: number } {
  if (!Number.isInteger(hour) || hour < CLUB_OPEN || hour >= CLUB_CLOSE) {
    return { available: false, until: CLUB_CLOSE * 60 }
  }
  const overlap = availability.busy.filter(range => range.start < (hour + 1) * 60 && range.end > hour * 60)
  if (overlap.length) return { available: false, until: overlap[overlap.length - 1].end }
  const free = availability.free.find(range => range.start <= hour * 60 && range.end >= (hour + 1) * 60)
  return { available: Boolean(free), until: free?.end ?? CLUB_CLOSE * 60 }
}

export function initialAvailableHour(availability: TableAvailability, hour: number | undefined): number | null {
  return hour !== undefined && getHourAvailability(availability, hour).available ? hour : null
}
