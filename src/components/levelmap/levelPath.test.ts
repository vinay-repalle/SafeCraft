import { describe, expect, it } from 'vitest'
import { levelSummaries } from '../../content'
import { guides } from '../../content/guides'
import { MIN_STEP, PATH_STOPS, PLINTH_INDEX, STOP_RADIUS, ZIG, badgeCount, levelMapModel, pathFit, pebbleSpots, stopX, stopZ, walkHops } from './levelPath'

const noProgress = { completed: {}, guidesRead: [] as string[] }

describe('level path layout', () => {
  it('has one stone per level and the plinth last', () => {
    expect(PATH_STOPS).toBe(levelSummaries.length + 1)
    expect(PLINTH_INDEX).toBe(levelSummaries.length)
  })

  it('spaces the stops evenly, centred on 0, zig-zagging front and back', () => {
    const xs = Array.from({ length: PATH_STOPS }, (_, i) => stopX(i, 2.5))
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(2.5)
    expect(xs[0]).toBeCloseTo(-xs[xs.length - 1])
    expect(stopZ(0)).toBe(ZIG)
    expect(stopZ(1)).toBe(-ZIG)
    expect(stopZ(2)).toBe(ZIG)
  })

  // The narrowest My view column is about 248px inside its padding; a wide screen gives ~420px.
  for (const width of [248, 320, 420]) {
    it(`fits the whole path inside a ${width}px band, stones never closer than the minimum`, () => {
      const { zoom, step } = pathFit(width, 112, 1.9, 8, 58)
      expect(step).toBeGreaterThanOrEqual(MIN_STEP)
      const pathWidthPx = ((PATH_STOPS - 1) * step + 2 * STOP_RADIUS) * zoom
      expect(pathWidthPx).toBeLessThanOrEqual(width - 16 + 0.001)
      // The scene's height fits in what is left after the label rows.
      expect(1.9 * zoom).toBeLessThanOrEqual(112 - 58 + 0.001)
      // Buttons under neighbouring stones are at least 40px apart, centre to centre.
      expect(step * zoom).toBeGreaterThanOrEqual(40)
    })
  }

  it('stretches the step to use a wide band when the height limits the zoom', () => {
    const { zoom, step } = pathFit(1000, 112, 1.9, 8, 58)
    expect(step).toBeGreaterThan(MIN_STEP)
    expect(((PATH_STOPS - 1) * step + 2 * STOP_RADIUS) * zoom).toBeCloseTo(1000 - 16)
  })

  it('never zooms below 1 on a tiny band', () => {
    expect(pathFit(10, 10, 1.9, 8, 58).zoom).toBe(1)
  })
})

describe('pebbles between stones', () => {
  it('puts every pebble in the open gap, never on a stone', () => {
    const a = [0, ZIG] as const
    const b = [3, -ZIG] as const
    const spots = pebbleSpots(a, b, STOP_RADIUS)
    expect(spots).toHaveLength(2)
    for (const [x, z] of spots) {
      expect(Math.hypot(x - a[0], z - a[1])).toBeGreaterThan(STOP_RADIUS)
      expect(Math.hypot(x - b[0], z - b[1])).toBeGreaterThan(STOP_RADIUS)
    }
  })

  it('uses one pebble in a short gap and none when the stones touch', () => {
    expect(pebbleSpots([0, 0], [STOP_RADIUS * 2 + 0.5, 0], STOP_RADIUS)).toEqual([[STOP_RADIUS + 0.25, 0]])
    expect(pebbleSpots([0, 0], [STOP_RADIUS * 2, 0], STOP_RADIUS)).toEqual([])
  })
})

describe('walking the path', () => {
  it('hops across every stone on the way, in order, in both directions', () => {
    expect(walkHops(0, 3)).toEqual([1, 2, 3])
    expect(walkHops(4, 1)).toEqual([3, 2, 1])
    expect(walkHops(2, 3)).toEqual([3])
  })

  it('does not move when the level is the same', () => {
    expect(walkHops(2, 2)).toEqual([])
  })
})

describe('level map model', () => {
  it('marks the current level and nothing else on a fresh start', () => {
    const model = levelMapModel(noProgress, 'frontend', 1)
    expect(model.stops.map((s) => s.id)).toEqual(levelSummaries.map((l) => l.id))
    expect(model.stops.filter((s) => s.current).map((s) => s.id)).toEqual([1])
    expect(model.stops.some((s) => s.doneHere || s.badge)).toBe(false)
    expect(model.plinth.map((b) => b.id)).toEqual(['both-seats', 'all-levels', 'all-guides'])
    expect(model.earned).toBe(0)
    expect(model.total).toBe(levelSummaries.length + 3)
  })

  it('turns a stone green only in the seat that finished it, but shows the badge in both', () => {
    const progress = { completed: { 2: { backend: true } }, guidesRead: [] }
    const asFrontend = levelMapModel(progress, 'frontend', 1).stops.find((s) => s.id === 2)!
    const asBackend = levelMapModel(progress, 'backend', 1).stops.find((s) => s.id === 2)!
    expect(asFrontend).toMatchObject({ doneHere: false, badge: true })
    expect(asBackend).toMatchObject({ doneHere: true, badge: true })
  })

  it('earns the plinth badges with the same rules as the Progress Card', () => {
    const completed = Object.fromEntries(levelSummaries.map((l) => [l.id, { frontend: true, backend: l.id === 1 }]))
    const model = levelMapModel({ completed, guidesRead: guides.map((g) => g.slug) }, 'frontend', 3)
    expect(model.plinth.every((b) => b.earned)).toBe(true)
    expect(model.earned).toBe(model.total)
  })

  it('says the badge count in words', () => {
    expect(badgeCount(2, 8)).toBe('Badges 2 of 8')
  })
})
