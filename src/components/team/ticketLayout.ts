// Phase 7f: where the five desks of the ticket journey stand, and how big to draw them. Pure
// numbers, no three.js, so it is unit-tested and stays out of the 3D chunk.
//
// The desks stand in one row, in the same order as the five columns of Team view, each one
// right above its own column at any screen width. The camera looks at the row from the front
// and a little above, so the row runs straight across the screen. The zoom is set by the band's
// height (so the desks always fit), and the spacing between desks is then whatever lines them
// up with the columns.
import { ROLE_INFO } from '../../app/nav'
import type { Role } from '../../store/types'

// Team view's columns use gap-4 (16px). The layout matches that grid.
export const COLUMN_GAP_PX = 16
export const COLUMNS = ROLE_INFO.length
// Desks are 2.8 units wide; below this spacing they would touch.
export const MIN_SPACING = 3.2

// Left-to-right order of the desks: the Team view column order.
export const DESK_ORDER: Role[] = ROLE_INFO.map((r) => r.id)

// Centre of a role's desk along the row, in scene units. The middle desk is at 0.
export function deskX(role: Role, spacing: number): number {
  const i = DESK_ORDER.indexOf(role)
  return (i - (COLUMNS - 1) / 2) * spacing
}

// Distance in pixels from one column's centre to the next, for a grid this wide.
export function columnPitch(width: number, columns = COLUMNS, gap = COLUMN_GAP_PX): number {
  return (width - gap * (columns - 1)) / columns + gap
}

// Pixels per scene unit, and scene units between desk centres, for a band this big.
//   sceneHeight  how tall the scene is on screen, in scene units, at zoom 1
export function rowFit(width: number, height: number, sceneHeight: number, paddingPx: number): { zoom: number; spacing: number } {
  const pitch = columnPitch(width)
  const byHeight = (height - paddingPx * 2) / Math.max(sceneHeight, 0.01)
  // On a narrow, tall band, shrink until the desks no longer touch.
  const zoom = Math.max(1, Math.min(byHeight, pitch / MIN_SPACING))
  return { zoom, spacing: pitch / zoom }
}
