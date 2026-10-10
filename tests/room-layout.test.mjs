import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/three/roomLayout.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
const { ROOM_LAYOUT, resolveRoomTables } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('physical gaming tables follow the supplied plan, independent of API order', () => {
  const { rpg, warhammer1, warhammer2 } = ROOM_LAYOUT.tables
  assert.ok(ROOM_LAYOUT.sofa.x < rpg.x)
  assert.ok(rpg.x < warhammer1.x && warhammer1.x < warhammer2.x)
  assert.ok(rpg.depth > rpg.width)
  assert.ok(warhammer1.width > warhammer1.depth && warhammer2.width > warhammer2.depth)
  assert.ok(ROOM_LAYOUT.kitchen.z < rpg.z && ROOM_LAYOUT.craft.z > rpg.z)
})

test('corrected room is rectangular with its entrance in front of the gaming tables', () => {
  const { width, depth, outline, entrance, tables } = ROOM_LAYOUT
  assert.equal(outline.length, 4, 'no side recess or entrance extension')
  assert.deepEqual(new Set(outline.map(point => `${point.x},${point.z}`)), new Set([
    `${-width / 2},${-depth / 2}`, `${width / 2},${-depth / 2}`,
    `${width / 2},${depth / 2}`, `${-width / 2},${depth / 2}`,
  ]))
  assert.equal(entrance.z, depth / 2, 'entrance is on the front wall')
  assert.ok(entrance.x >= tables.warhammer1.x && entrance.x <= tables.warhammer2.x)
  assert.ok(entrance.width >= 1, 'entry has a clear walkable opening')
  for (const table of Object.values(tables)) {
    assert.ok(table.z + table.depth / 2 < entrance.z - entrance.depth, 'tables leave the front aisle clear')
  }
})

test('cabinet stands to the right on entering and its doors face into the room', () => {
  const { cabinet, entrance, width, depth, tables } = ROOM_LAYOUT
  assert.ok(cabinet.x - cabinet.width / 2 > entrance.x + entrance.width / 2, 'cabinet does not obstruct the entrance')
  assert.ok(cabinet.x + cabinet.width / 2 < width / 2)
  assert.ok(cabinet.z + cabinet.depth / 2 <= depth / 2)
  assert.ok(cabinet.z > tables.warhammer2.z, 'cabinet is at the front, opposite its former back-wall location')
  assert.ok(Math.cos(cabinet.rotation) < -0.99, 'cabinet front faces north into the room')
})

test('red banner is on the wall immediately behind the craft desk', () => {
  const { banner, craft, width } = ROOM_LAYOUT
  assert.ok(Math.abs(banner.x + width / 2) < 0.1, 'banner is mounted on the left wall')
  assert.ok(Math.abs(banner.z - craft.z) < craft.depth / 2, 'banner is aligned with the craft desk')
  assert.ok(banner.y > 1, 'banner is visible above the desk')
  assert.ok(Math.sin(banner.rotation) > 0.99, 'banner faces into the room')
})

test('semantic labels bind to correct API IDs regardless of array order', () => {
  const first = { id: 67, name: 'Warhammer 1' }
  const second = { id: 3, name: 'Ваха 2 стол' }
  const rpg = { id: 89, name: 'РПГ стол' }
  assert.deepEqual(resolveRoomTables([second, rpg, first]), { warhammer2: second, rpg, warhammer1: first })
})

test('the four current club names retain their API identity when shuffled', () => {
  const first = { id: 1, name: 'Warhammer Big #1' }
  const second = { id: 2, name: 'Warhammer Big #2' }
  const rpg = { id: 3, name: 'RPG' }
  const craft = { id: 4, name: 'Craft' }
  const resolved = resolveRoomTables([craft, second, rpg, first])
  assert.deepEqual(resolved, { craft, warhammer2: second, rpg, warhammer1: first })
  assert.strictEqual(resolved.warhammer1, first)
  assert.strictEqual(resolved.warhammer2, second)
  assert.strictEqual(resolved.rpg, rpg)
  assert.strictEqual(resolved.craft, craft)
  assert.equal(resolved.warhammer1.name, 'Warhammer Big #1')
  assert.equal(resolved.warhammer2.name, 'Warhammer Big #2')
  assert.equal(resolved.craft.name, 'Craft')
})

test('recognized language and numbered aliases preserve roles', () => {
  for (const name of ['RPG', 'РПГ', 'D&D', 'Dungeons and Dragons']) {
    assert.equal(resolveRoomTables([{ id: 31, name }]).rpg?.id, 31, name)
  }
  for (const [name, role] of [
    ['Warhammer1', 'warhammer1'], ['Warhammer II', 'warhammer2'], ['WH 01', 'warhammer1'],
    ['WH2', 'warhammer2'], ['40K table 1', 'warhammer1'], ['Wargaming 2', 'warhammer2'],
  ]) assert.equal(resolveRoomTables([{ id: 72, name }])[role]?.id, 72, name)
})

test('unknown, ambiguous and duplicate names do not silently book an arbitrary table', () => {
  for (const tables of [
    [{ id: 1, name: 'Table 1' }, { id: 2, name: 'Table 2' }, { id: 3, name: 'Table 3' }],
    [{ id: 7, name: 'Warhammer' }],
    [{ id: 7, name: 'Warhammer 1 or 2' }],
    [{ id: 7, name: 'Warhammer 1' }, { id: 8, name: 'WH1' }],
    [{ id: 7, name: 'RPG' }, { id: 8, name: 'D&D' }],
    [{ id: 7, name: 'Craft' }, { id: 8, name: 'Craft' }],
    [{ id: 7, name: 'Warcraft' }],
  ]) assert.deepEqual(resolveRoomTables(tables), {})
})

test('explicit mapping can bind a named API table without relying on order', () => {
  const record = { id: 391, name: 'Crusader', role: 'warhammer2' }
  assert.deepEqual(resolveRoomTables([record]), { warhammer2: record })
  const craft = { id: 82, name: 'Workshop', role: 'craft' }
  assert.deepEqual(resolveRoomTables([craft]), { craft })
})
