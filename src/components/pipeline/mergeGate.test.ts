import { describe, expect, it } from 'vitest'
import { GATE_GAP, GATE_OPEN_SECONDS, MERGE_SLIDE_SECONDS, gateDescription, gateFrame, gatePhase, gatePoints } from './mergeGate'
import { SHAKE_SECONDS, stallPoint } from './pipelineMotion'
import { PACKAGE_SECONDS, stationPositions, type XZ } from './sceneLayout'

const OFFSET: XZ = [0.85, 0.85]

describe('merge gate phase', () => {
  it('is closed while the conflict is open, merged once fixed, and absent with no stall', () => {
    expect(gatePhase('dev', true)).toBe('closed')
    expect(gatePhase('dev', false)).toBe('merged')
    expect(gatePhase(null, true)).toBeNull()
    expect(gatePhase(null, false)).toBeNull()
  })

  it('describes each phase in words', () => {
    expect(gateDescription('closed')).toMatch(/same lines/)
    expect(gateDescription('merged')).toMatch(/one commit/)
  })
})

describe('merge gate points', () => {
  // The conflict always stalls between the developer desk and GitHub; check both layouts.
  for (const layout of ['wide', 'tall'] as const) {
    it(`puts the gate at the stall point with yours toward the desk and theirs toward GitHub (${layout})`, () => {
      const p = stationPositions(layout)
      const { gate, yours, theirs } = gatePoints(p.dev, p.github, OFFSET)
      expect(gate).toEqual(stallPoint(p.dev, p.github, OFFSET))
      const dist = (a: XZ, b: XZ) => Math.hypot(a[0] - b[0], a[1] - b[1])
      expect(dist(yours, gate)).toBeCloseTo(GATE_GAP)
      expect(dist(theirs, gate)).toBeCloseTo(GATE_GAP)
      // Yours is on the desk's side of the gate, theirs on GitHub's.
      expect(dist(yours, p.dev)).toBeLessThan(dist(theirs, p.dev))
      expect(dist(theirs, p.github)).toBeLessThan(dist(yours, p.github))
      // All three sit on one line along the route.
      const sameX = yours[0] === gate[0] && theirs[0] === gate[0]
      const sameZ = yours[1] === gate[1] && theirs[1] === gate[1]
      expect(sameX || sameZ).toBe(true)
    })
  }
})

describe('merge gate timeline', () => {
  it('starts a new conflict with their parcel at GitHub and the gate still', () => {
    const f = gateFrame('closed', 0)
    expect(f).toMatchObject({ theirsK: 0, theirsVisible: true, shake: 0, barOpen: 0, moving: true })
  })

  it('brings their parcel down in one hop, then shakes the gate once and stops', () => {
    const mid = gateFrame('closed', PACKAGE_SECONDS / 2)
    expect(mid.theirsK).toBeGreaterThan(0)
    expect(mid.theirsK).toBeLessThan(1)
    expect(mid.theirsLift).toBeGreaterThan(0)
    expect(mid.shake).toBe(0)

    const shaking = gateFrame('closed', PACKAGE_SECONDS + SHAKE_SECONDS / 6)
    expect(shaking.theirsK).toBe(1)
    expect(shaking.theirsLift).toBe(0)
    expect(shaking.shake).not.toBe(0)
    expect(shaking.moving).toBe(true)

    const after = gateFrame('closed', PACKAGE_SECONDS + SHAKE_SECONDS + 0.01)
    expect(after).toMatchObject({ theirsK: 1, shake: 0, moving: false, barOpen: 0 })
  })

  it('lifts the bar first, then slides their parcel into yours and hides it', () => {
    const lifting = gateFrame('merged', GATE_OPEN_SECONDS / 2)
    expect(lifting.barOpen).toBeGreaterThan(0)
    expect(lifting.barOpen).toBeLessThan(1)
    expect(lifting.theirsK).toBe(0)
    expect(lifting.theirsVisible).toBe(true)

    const sliding = gateFrame('merged', GATE_OPEN_SECONDS + MERGE_SLIDE_SECONDS / 2)
    expect(sliding.barOpen).toBe(1)
    expect(sliding.theirsK).toBeCloseTo(0.5)

    const done = gateFrame('merged', GATE_OPEN_SECONDS + MERGE_SLIDE_SECONDS)
    expect(done).toMatchObject({ theirsVisible: false, barOpen: 1, moving: false })
  })

  // Infinity is what the scene passes for the first draw and for reduced motion.
  it('shows the end state straight away when asked for it', () => {
    expect(gateFrame('closed', Infinity)).toMatchObject({ theirsK: 1, theirsVisible: true, shake: 0, barOpen: 0, moving: false })
    expect(gateFrame('closed', Infinity).theirsLift).toBe(0)
    expect(gateFrame('merged', Infinity)).toMatchObject({ theirsVisible: false, barOpen: 1, moving: false })
  })
})
