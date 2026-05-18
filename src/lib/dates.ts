import { format, addDays, isBefore, startOfDay } from 'date-fns'

export const CLUB_OPEN = 10
export const CLUB_CLOSE = 22

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function tomorrowStr(): string {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return format(d, 'EEEE, d MMMM yyyy')
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return format(d, 'd MMM')
}

export function isPastDate(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  return isBefore(d, startOfDay(new Date()))
}

export function hourToTimeStr(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00:00`
}

export function timeStrToHour(timeStr: string): number {
  return parseInt(timeStr.split(':')[0], 10)
}

/** Returns array of hours from CLUB_OPEN to CLUB_CLOSE-1 */
export function clubHours(): number[] {
  const hours: number[] = []
  for (let h = CLUB_OPEN; h < CLUB_CLOSE; h++) {
    hours.push(h)
  }
  return hours
}

export function maxBookingDate(): string {
  return format(addDays(new Date(), 30), 'yyyy-MM-dd')
}
