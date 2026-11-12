import { describe, expect, it } from 'vitest'
import { ROLE_INFO } from '../../app/nav'
import { COLUMN_GAP_PX, COLUMNS, DESK_ORDER, MIN_SPACING, columnPitch, deskX, rowFit } from './ticketLayout'

describe('ticket journey layout', () => {
  it('puts the desks in Team view column order, evenly spaced and centred', () => {
    expect(DESK_ORDER).toEqual(ROLE_INFO.map((r) => r.id))
    const xs = DESK_ORDER.map((r) => deskX(r, 4))
    expect(xs[2]).toBe(0)
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBe(4)
    expect(xs[0]).toBe(-xs[xs.length - 1])
  })

  // The band is as wide as the grid of columns under it.
  for (const width of [1100, 1248, 1600, 1888]) {
    it(`lines each desk up with the centre of its column at ${width}px wide`, () => {
      const { zoom, spacing } = rowFit(width, 224, 3.3, 8)
      const columnWidth = (width - COLUMN_GAP_PX * (COLUMNS - 1)) / COLUMNS
      DESK_ORDER.forEach((role, i) => {
        const columnCentre = i * (columnWidth + COLUMN_GAP_PX) + columnWidth / 2
        const deskCentre = width / 2 + deskX(role, spacing) * zoom
        expect(deskCentre).toBeCloseTo(columnCentre)
      })
    })
  }

  it('fits the scene to the band height', () => {
    const { zoom } = rowFit(1600, 224, 3.3, 8)
    expect(zoom * 3.3).toBeCloseTo(224 - 16)
  })

  it('never lets the desks touch, and never zooms below 1', () => {
    const narrow = rowFit(500, 600, 3.3, 8)
    expect(narrow.spacing).toBeGreaterThanOrEqual(MIN_SPACING - 1e-9)
    expect(narrow.zoom).toBeCloseTo(columnPitch(500) / MIN_SPACING)
    expect(rowFit(10, 10, 3.3, 8).zoom).toBe(1)
  })
})
