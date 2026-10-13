import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/availability.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
const { getTableAvailability, getHourAvailability, initialAvailableHour, formatTime } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const date = '2026-10-13'
const booking = (start, end, extra = {}) => ({ id: 1, table_id: 2, date, user_id: 42, user_name: 'Test', start_time: start, end_time: end, created_at: '', ...extra })

test('an empty day contains all twelve bookable hours and one continuous free window', () => {
  const result = getTableAvailability([], 2, date)
  assert.deepEqual(result.busy, [])
  assert.deepEqual(result.free, [{ start: 600, end: 1320 }])
  assert.deepEqual(result.slots.map(slot => slot.hour), [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21])
  assert.ok(result.slots.every(slot => slot.available))
  assert.equal(formatTime(600), '10:00')
  assert.equal(formatTime(885), '14:45')
  assert.equal(formatTime(1320), '22:00')
})

test('only the selected table and date contribute to its timetable', () => {
  const records = [booking('12:00', '15:00', { table_id: 1 }), booking('10:00', '22:00', { date: '2026-10-14' }), booking('17:00', '20:00')]
  assert.deepEqual(getTableAvailability(records, 2, date).busy, [{ start: 1020, end: 1200 }])
  assert.deepEqual(getTableAvailability(records, 2, '2026-10-14').busy, [{ start: 600, end: 1320 }])
})

test('overlapping, adjacent and duplicate reservations merge without mutating API data', () => {
  const records = [booking('14:00', '16:00'), booking('12:00', '14:00'), booking('13:00', '15:00'), booking('12:00', '14:00')]
  const before = JSON.stringify(records)
  const result = getTableAvailability(records, 2, date)
  assert.deepEqual(result.busy, [{ start: 720, end: 960 }])
  assert.deepEqual(result.free, [{ start: 600, end: 720 }, { start: 960, end: 1320 }])
  assert.equal(JSON.stringify(records), before)
})

test('intervals clip to club hours and retain separated free windows', () => {
  const result = getTableAvailability([booking('08:00', '11:00'), booking('13:00', '14:00'), booking('20:00', '23:00')], 2, date)
  assert.deepEqual(result.busy, [{ start: 600, end: 660 }, { start: 780, end: 840 }, { start: 1200, end: 1320 }])
  assert.deepEqual(result.free, [{ start: 660, end: 780 }, { start: 840, end: 1200 }])
  assert.deepEqual(getTableAvailability([booking('08:00', '10:00'), booking('22:00', '23:00')], 2, date).busy, [])
})

test('3D selected hour includes reservation start and excludes reservation end', () => {
  const availability = getTableAvailability([booking('12:00:00', '15:00:00')], 2, date)
  assert.deepEqual(getHourAvailability(availability, 11), { available: true, until: 720 })
  assert.deepEqual(getHourAvailability(availability, 12), { available: false, until: 900 })
  assert.deepEqual(getHourAvailability(availability, 14), { available: false, until: 900 })
  assert.deepEqual(getHourAvailability(availability, 15), { available: true, until: 1320 })
})

test('partial-hour reservations never offer a conflicting whole-hour booking', () => {
  const availability = getTableAvailability([booking('14:30:00', '16:15:00')], 2, date)
  assert.deepEqual(availability.busy, [{ start: 870, end: 975 }])
  assert.deepEqual(availability.slots.filter(slot => !slot.available).map(slot => slot.hour), [14, 15, 16])
  assert.equal(getHourAvailability(availability, 13).available, true)
  assert.equal(getHourAvailability(availability, 14).available, false)
  assert.equal(getHourAvailability(availability, 16).available, false)
  assert.equal(getHourAvailability(availability, 17).available, true)
})

test('free-period and 3D preselection accept only a complete free hour', () => {
  const availability = getTableAvailability([booking('12:00', '15:00')], 2, date)
  assert.equal(initialAvailableHour(availability, 11), 11)
  assert.equal(initialAvailableHour(availability, 15), 15)
  for (const hour of [undefined, 12, 14, 9, 22, 10.5, NaN]) assert.equal(initialAvailableHour(availability, hour), null)
  assert.equal(initialAvailableHour(getTableAvailability([booking('10:00', '22:00')], 2, date), 10), null)
})

test('availability changes immediately with added and cancelled reservations', () => {
  const records = [booking('12:00', '15:00')]
  assert.equal(getHourAvailability(getTableAvailability(records, 2, date), 12).available, false)
  assert.equal(getHourAvailability(getTableAvailability([], 2, date), 12).available, true)
  assert.deepEqual(getTableAvailability([booking('10:00', '22:00')], 2, date).free, [])
})
