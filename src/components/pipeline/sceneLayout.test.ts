import { describe, expect, it } from 'vitest'
import { STATIONS } from '../../engine/types'
import { PAD, SPACING, cubicBezier, ease, isWeakDevice, layoutForAspect, slabSize, stationPositions } from './sceneLayout'
import { shouldUse3d } from './pipelineMode'

describe('stationPositions', () => {
  for (const layout of ['wide', 'tall'] as const) {
    it(`puts the ${layout} route one step apart, in pipeline order, with no overlap`, () => {
      const p = stationPositions(layout)
      for (let i = 0; i < STATIONS.length - 1; i++) {
        const [ax, az] = p[STATIONS[i]]
        const [bx, bz] = p[STATIONS[i + 1]]
        expect(Math.hypot(ax - bx, az - bz)).toBeCloseTo(SPACING)
      }
      const keys = new Set(STATIONS.map((s) => p[s].join(',')))
      expect(keys.size).toBe(STATIONS.length)
    })

    it(`keeps every ${layout} pad on the base slab`, () => {
      const p = stationPositions(layout)
      const { width, depth } = slabSize(layout)
      for (const s of STATIONS) {
        expect(Math.abs(p[s][0]) + PAD / 2).toBeLessThan(width / 2)
        expect(Math.abs(p[s][1]) + PAD / 2).toBeLessThan(depth / 2)
      }
    })
  }

  it('turns the same route a quarter turn between layouts', () => {
    const wide = stationPositions('wide')
    const tall = stationPositions('tall')
    for (const s of STATIONS) expect([tall[s][1], tall[s][0]]).toEqual([wide[s][0], wide[s][1]])
  })

  it('picks the layout from the panel shape', () => {
    expect(layoutForAspect(2)).toBe('wide')
    expect(layoutForAspect(0.6)).toBe('tall')
  })
})

describe('ease', () => {
  it('starts at 0, ends at 1 and never goes backwards', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    let last = 0
    for (let t = 0; t <= 1; t += 0.05) {
      const v = ease(t)
      expect(v).toBeGreaterThanOrEqual(last)
      last = v
    }
  })

  it('matches a straight line when the control points are on it', () => {
    const linear = cubicBezier(0, 0, 1, 1)
    expect(linear(0.5)).toBeCloseTo(0.5, 3)
  })

  it('is fast at the start and slow at the end, like the app easing', () => {
    expect(ease(0.2)).toBeGreaterThan(0.5)
  })
})

describe('weak device check', () => {
  it('skips 3D for low memory, few cores or a software renderer', () => {
    expect(isWeakDevice({ deviceMemory: 2 })).toBe(true)
    expect(isWeakDevice({ hardwareConcurrency: 2 })).toBe(true)
    expect(isWeakDevice({ renderer: 'Google SwiftShader' })).toBe(true)
  })

  it('treats missing hints as a normal device', () => {
    expect(isWeakDevice({})).toBe(false)
    expect(isWeakDevice({ deviceMemory: 8, hardwareConcurrency: 8, renderer: 'Apple M2' })).toBe(false)
  })
})

describe('shouldUse3d', () => {
  const good = { webgl: true, weak: false }
  const weak = { webgl: true, weak: true }
  it('follows the device in auto mode', () => {
    expect(shouldUse3d('auto', good)).toBe(true)
    expect(shouldUse3d('auto', weak)).toBe(false)
  })
  it('lets the learner override a weak device, but never without WebGL', () => {
    expect(shouldUse3d('3d', weak)).toBe(true)
    expect(shouldUse3d('3d', { webgl: false, weak: false })).toBe(false)
    expect(shouldUse3d('list', good)).toBe(false)
  })
})
