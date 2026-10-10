export type RoomTableRole = 'rpg' | 'warhammer1' | 'warhammer2' | 'craft'

export interface RoomTableIdentity {
  id: number
  name?: string
  role?: RoomTableRole
}

export interface RoomItem {
  x: number
  z: number
  width: number
  depth: number
}

// Positions follow the supplied top-down drawing. They describe relative placement,
// not a measured architectural survey. X runs left to right; Z runs top to bottom.
const SCALE = 140
const PLAN_WIDTH = 1990
const PLAN_DEPTH = 864
const ROOM_WIDTH = PLAN_WIDTH / SCALE
const ROOM_DEPTH = PLAN_DEPTH / SCALE
function rectangle(left: number, top: number, right: number, bottom: number): RoomItem {
  return {
    x: ((left + right) / 2 - PLAN_WIDTH / 2) / SCALE,
    z: ((top + bottom) / 2 - PLAN_DEPTH / 2) / SCALE,
    width: (right - left) / SCALE,
    depth: (bottom - top) / SCALE,
  }
}

export const ROOM_LAYOUT = {
  width: ROOM_WIDTH,
  depth: ROOM_DEPTH,
  outline: [
    [0, 0], [PLAN_WIDTH, 0], [PLAN_WIDTH, PLAN_DEPTH], [0, PLAN_DEPTH],
  ].map(([x, z]) => ({ x: (x - PLAN_WIDTH / 2) / SCALE, z: (z - PLAN_DEPTH / 2) / SCALE })),
  tables: {
    rpg: rectangle(191, 211, 478, 594),
    warhammer1: rectangle(641, 276, 1077, 508),
    warhammer2: rectangle(1223, 278, 1658, 508),
  } satisfies Record<Exclude<RoomTableRole, 'craft'>, RoomItem>,
  kitchen: rectangle(12, 17, 422, 171),
  sofa: rectangle(17, 206, 129, 597),
  craft: rectangle(20, 702, 358, 843),
  // The corrected entrance is on the front wall, facing the gaming tables.
  entrance: { x: 0, z: ROOM_DEPTH / 2, width: 1.5, depth: 0.42 },
  // On your right when entering from the front. Doors face back into the room.
  cabinet: { x: ROOM_WIDTH / 2 - 1.2, z: ROOM_DEPTH / 2 - 0.29, width: 1.05, depth: 0.44, rotation: Math.PI },
  // Mounted on the left wall immediately behind the craft desk.
  banner: { x: -ROOM_WIDTH / 2 + 0.062, z: rectangle(20, 702, 358, 843).z, y: 1.48, rotation: Math.PI / 2 },
}

function recognizedRole(table: RoomTableIdentity): RoomTableRole | null {
  if (table.role && (table.role === 'craft' || Object.prototype.hasOwnProperty.call(ROOM_LAYOUT.tables, table.role))) return table.role
  const name = (table.name ?? '').normalize('NFKC').toLowerCase().replace(/[_-]/g, ' ')
  if (/\bcraft\b/u.test(name)) return 'craft'
  if (/(?:\brpg\b|рпг|\bd\s*(?:&|and|n)\s*d\b|dungeons\s*(?:&|and)\s*dragons)/u.test(name)) return 'rpg'
  if (!/(?:warhammer|wargam(?:e|ing)|\bwh(?=$|[\s\d])|\b40\s*k\b|ваха|вархаммер|варгейм)/u.test(name)) return null
  const one = /(?:^|[^\d])0?1(?=$|[^\d\p{L}])|(?:^|[^\d\p{L}])i(?=$|[^\d\p{L}])/u.test(name)
  const two = /(?:^|[^\d])0?2(?=$|[^\d\p{L}])|(?:^|[^\d\p{L}])ii(?=$|[^\d\p{L}])/u.test(name)
  if (one === two) return null
  return one ? 'warhammer1' : 'warhammer2'
}

/** Never infer a physical table from API ordering or an arbitrary numeric ID. */
export function resolveRoomTables<T extends RoomTableIdentity>(tables: T[]): Partial<Record<RoomTableRole, T>> {
  const matches = new Map<RoomTableRole, T[]>()
  for (const table of tables) {
    const role = recognizedRole(table)
    if (role) matches.set(role, [...(matches.get(role) ?? []), table])
  }
  const result: Partial<Record<RoomTableRole, T>> = {}
  for (const [role, candidates] of matches) {
    if (candidates.length === 1) result[role] = candidates[0]
  }
  return result
}
