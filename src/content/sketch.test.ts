import { describe, expect, it } from 'vitest'
import { jargon } from '.'
import { GUIDE_ORDER } from './guides'
import { GUIDE_DIAGRAMS } from './guideDiagrams'
import { checkSketch, isAnimated, MAX_SECONDS, sketchDuration, tagWidth, type Sketch } from './sketch'
import { CORE_ANIMATED_TERMS, TERM_ANIMATIONS } from './termAnimations'

const tiny = (items: Sketch['items']): Sketch => ({ id: 't', width: 100, height: 50, title: 'T', caption: 'C', items })

describe('checkSketch', () => {
  it('accepts a sketch whose shapes are labelled and on the canvas', () => {
    expect(checkSketch(tiny([{ kind: 'dot', x: 50, y: 20, label: 'A' }]))).toEqual([])
  })

  it('catches a shape with no words, off the canvas, or too slow', () => {
    expect(checkSketch(tiny([{ kind: 'dot', x: 50, y: 20, label: ' ' }]))[0]).toContain('needs a label')
    expect(checkSketch(tiny([{ kind: 'box', x: 80, y: 10, w: 40, h: 20, label: 'B' }]))[0]).toContain('off the canvas')
    expect(checkSketch(tiny([{ kind: 'tag', x: 60, y: 25, label: 'a-long-branch' }]))[0]).toContain('off the canvas')
    expect(checkSketch(tiny([{ kind: 'text', x: 50, y: 20, text: 'x', at: MAX_SECONDS }]))[0]).toContain('more than')
  })

  it('works out how long an animation plays', () => {
    expect(sketchDuration(tiny([{ kind: 'dot', x: 50, y: 20, label: 'A' }]))).toBe(0)
    expect(sketchDuration(tiny([{ kind: 'dot', x: 50, y: 20, label: 'A', at: 1 }]))).toBeCloseTo(1.6)
    expect(isAnimated(tiny([{ kind: 'dot', x: 50, y: 20, label: 'A', from: [10, 0] }]))).toBe(true)
    expect(tagWidth('main')).toBeGreaterThan(30)
  })
})

describe('jargon mini-animations (7c)', () => {
  it('has one for each core term, keyed by a real jargon id', () => {
    for (const id of CORE_ANIMATED_TERMS) expect(TERM_ANIMATIONS[id], id).toBeDefined()
    const ids = new Set(jargon.map((t) => t.id))
    for (const id of Object.keys(TERM_ANIMATIONS)) expect(ids.has(id), `${id} is not in jargon.json`).toBe(true)
  })

  for (const sketch of Object.values(TERM_ANIMATIONS)) {
    it(`${sketch.id}: labelled, on the canvas, plays once within ${MAX_SECONDS}s`, () => {
      expect(checkSketch(sketch)).toEqual([])
      expect(isAnimated(sketch)).toBe(true)
    })
  }
})

describe('Field Guide diagrams (7d)', () => {
  it('has exactly one for each article', () => {
    expect(Object.keys(GUIDE_DIAGRAMS).sort()).toEqual([...GUIDE_ORDER].sort())
  })

  for (const sketch of Object.values(GUIDE_DIAGRAMS)) {
    it(`${sketch.id}: labelled, on the canvas, and still`, () => {
      expect(checkSketch(sketch)).toEqual([])
      expect(isAnimated(sketch)).toBe(false)
    })
  }
})
