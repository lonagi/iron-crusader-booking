const POSITIONS_KEY = 'ic.tables.positions.v1'

export interface TablePosition {
  x: number
  y: number
}

export type TablePositions = Record<number, TablePosition>

export function loadTablePositions(): TablePositions {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as TablePositions
  } catch {
    return {}
  }
}

export function saveTablePositions(positions: TablePositions) {
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions))
}
