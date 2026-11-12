import { describe, expect, it } from 'vitest'
import { STATIONS, type Station } from '../../engine/types'
import type { StationState } from '../../store/levelStore'
import {
  SHAKE_SECONDS,
  TEST_RUN_SECONDS,
  conveyorOffset,
  displayStations,
  msUntilNextPhase,
  nextStation,
  shakeOffset,
  stallPoint,
  stallText,
  testRunPhase,
  travel,
} from './pipelineMotion'
import { PAD, SPACING, stationPositions } from './sceneLayout'

const at = (seconds: number) => 1000 + seconds * 1000
const failed = { seq: 1, passed: false, startedAt: 1000 }
const passed = { seq: 1, passed: true, startedAt: 1000 }

describe('testRunPhase', () => {
  it('is none before any tests have run', () => {
    expect(testRunPhase(null, at(0), false)).toBe('none')
  })

  it('runs for TEST_RUN_SECONDS, then settles on a pass', () => {
    expect(testRunPhase(passed, at(0), false)).toBe('running')
    expect(testRunPhase(passed, at(TEST_RUN_SECONDS - 0.01), false)).toBe('running')
    expect(testRunPhase(passed, at(TEST_RUN_SECONDS), false)).toBe('settled')
  })

  it('shakes once after a failed run, then settles', () => {
    expect(testRunPhase(failed, at(TEST_RUN_SECONDS + 0.1), false)).toBe('shaking')
    expect(testRunPhase(failed, at(TEST_RUN_SECONDS + SHAKE_SECONDS), false)).toBe('settled')
  })

  it('shows the end state at once when reduced motion is on', () => {
    expect(testRunPhase(failed, at(0), true)).toBe('settled')
    expect(msUntilNextPhase(failed, at(0), true)).toBeNull()
  })

  it('says how long until the next change, and nothing once settled', () => {
    expect(msUntilNextPhase(failed, at(0.5), false)).toBeCloseTo((TEST_RUN_SECONDS - 0.5) * 1000)
    expect(msUntilNextPhase(failed, at(TEST_RUN_SECONDS + 0.1), false)).toBeCloseTo((SHAKE_SECONDS - 0.1) * 1000)
    expect(msUntilNextPhase(passed, at(10), false)).toBeNull()
    expect(msUntilNextPhase(null, at(0), false)).toBeNull()
  })
})

describe('displayStations', () => {
  const base = Object.fromEntries(STATIONS.map((s) => [s, 'idle'])) as Record<Station, StationState>
  const after = { ...base, dev: 'done', github: 'pass', tests: 'pass' } as Record<Station, StationState>

  it('holds back the result and the approval while the tests run', () => {
    const shown = displayStations(after, true)
    expect(shown.tests).toBe('active')
    expect(shown.github).toBe('done')
    expect(shown.dev).toBe('done')
  })

  it('shows the store as it is once the run is over', () => {
    expect(displayStations(after, false)).toBe(after)
  })
})

describe('shakeOffset', () => {
  it('starts and ends at rest, and swings both ways in between', () => {
    expect(shakeOffset(0)).toBe(0)
    expect(shakeOffset(1)).toBe(0)
    const samples = Array.from({ length: 19 }, (_, i) => shakeOffset((i + 1) / 20))
    expect(Math.max(...samples)).toBeGreaterThan(0.3)
    expect(Math.min(...samples)).toBeLessThan(-0.3)
  })

  it('gets smaller as it goes', () => {
    expect(Math.abs(shakeOffset(1 / 6))).toBeGreaterThan(Math.abs(shakeOffset(5 / 6)))
  })
})

describe('conveyorOffset', () => {
  it('moves at the given speed and wraps every slat gap', () => {
    expect(conveyorOffset(0, 2, 0.3)).toBe(0)
    expect(conveyorOffset(0.1, 2, 0.3)).toBeCloseTo(0.2)
    expect(conveyorOffset(0.2, 2, 0.3)).toBeCloseTo(0.1)
    for (let s = 0; s < 3; s += 0.07) {
      const d = conveyorOffset(s, 2.1, 0.3)
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThan(0.3)
    }
  })
})

describe('travel', () => {
  it('rides the belt at a steady speed with no lift', () => {
    expect(travel('ride', 0.25)).toEqual({ k: 0.25, lift: 0 })
    expect(travel('ride', 0.75)).toEqual({ k: 0.75, lift: 0 })
  })

  it('hops when carried, landing exactly on the target', () => {
    expect(travel('hop', 0)).toEqual({ k: 0, lift: 0 })
    const end = travel('hop', 1)
    expect(end.k).toBe(1)
    expect(end.lift).toBeCloseTo(0)
    expect(travel('hop', 0.3).lift).toBeGreaterThan(0)
  })

  it('clamps progress outside 0..1', () => {
    expect(travel('ride', 2).k).toBe(1)
    expect(travel('ride', -1).k).toBe(0)
  })
})

describe('stall', () => {
  it('knows the next station on the route, and that the live app is last', () => {
    expect(nextStation('dev')).toBe('github')
    expect(nextStation('live')).toBeNull()
  })

  for (const layout of ['wide', 'tall'] as const) {
    it(`waits in the gap between the developer desk and GitHub (${layout})`, () => {
      const p = stationPositions(layout)
      const [x, z] = stallPoint(p.dev, p.github, [0.85, 0.85])
      // Off both pads: more than half a pad from each station centre along the route.
      const alongDev = layout === 'wide' ? Math.abs(z - p.dev[1]) : Math.abs(x - p.dev[0])
      const alongGithub = layout === 'wide' ? Math.abs(z - p.github[1]) : Math.abs(x - p.github[0])
      expect(alongDev).toBeGreaterThan(PAD / 2)
      expect(alongGithub).toBeGreaterThan(PAD / 2)
      expect(alongDev + alongGithub).toBeCloseTo(SPACING)
    })
  }

  it('says what happened in words', () => {
    expect(stallText(true)).toBe('Stopped: merge conflict')
    expect(stallText(false)).toContain('Waiting to be pushed')
  })
})
