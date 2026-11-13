import { describe, expect, it } from 'vitest'
import { STATIONS } from '../../engine/types'
import { buildStill, project } from './isoStill'
import { HERO_FRAME, STORY_FRAMES } from './story'

const viewBox = (s: string) => s.split(' ').map(Number)

describe('project', () => {
  it('matches the 3D camera: nearer to the camera is lower on screen, height is up', () => {
    const [, back] = project(-1, 0, -1)
    const [, front] = project(1, 0, 1)
    expect(front).toBeGreaterThan(back)
    const [, ground] = project(0, 0, 0)
    const [, raised] = project(0, 1, 0)
    expect(raised).toBeLessThan(ground)
    // Along x the picture runs right and down, along z left and down, at the same angle.
    const [xr, xd] = project(1, 0, 0)
    const [zl, zd] = project(0, 0, 1)
    expect(xr).toBeCloseTo(-zl)
    expect(xd).toBeCloseTo(zd)
  })
})

describe('buildStill', () => {
  it('draws the whole diorama for the hero, with a label for every station', () => {
    const still = buildStill([HERO_FRAME], 0, 'wide', false)
    expect(still.labels.map((l) => l.id)).toEqual([...STATIONS])
    expect(still.faces.length).toBeGreaterThan(100)
    const [, , w, h] = viewBox(still.viewBox)
    expect(w).toBeGreaterThan(h)
    // Seen from the isometric corner, the tall layout is the wide one in a mirror: same size.
    const [, , tw, th] = viewBox(buildStill([HERO_FRAME], 0, 'tall', false).viewBox)
    expect(tw).toBeCloseTo(w, 0)
    expect(th).toBeCloseTo(h, 0)
  })

  it('crops each story stop to the stations it is about, inside the whole picture', () => {
    const whole = viewBox(buildStill(STORY_FRAMES, 0, 'wide', false).viewBox)
    for (let i = 0; i < STORY_FRAMES.length; i++) {
      const [x, y, w, h] = viewBox(buildStill(STORY_FRAMES, i, 'wide', true).viewBox)
      expect(w).toBeLessThanOrEqual(whole[2] + 0.2)
      expect(x).toBeGreaterThanOrEqual(whole[0] - 0.2)
      expect(y).toBeGreaterThanOrEqual(whole[1] - 0.2)
      expect(x + w).toBeLessThanOrEqual(whole[0] + whole[2] + 0.2)
      expect(y + h).toBeLessThanOrEqual(whole[1] + whole[3] + 0.2)
    }
  })

  it('shows the closed gate in red at the conflict, and two parcels', () => {
    const i = STORY_FRAMES.findIndex((f) => f.id === 'conflict')
    const still = buildStill(STORY_FRAMES, i, 'wide', true)
    expect(still.faces.some((f) => f.fill === 'var(--fail)')).toBe(true)
    expect(still.faces.filter((f) => f.fill === 'var(--ink-2)').length).toBeGreaterThan(0)
    const merged = buildStill(STORY_FRAMES, i + 1, 'wide', true)
    expect(merged.faces.some((f) => f.fill === 'var(--fail)')).toBe(false)
  })

  it('uses only theme tokens for colour, so light and dark both work', () => {
    const still = buildStill(STORY_FRAMES, 5, 'wide', true)
    for (const f of still.faces) expect(f.fill).toMatch(/var\(--/)
  })
})

describe('still labels', () => {
  it('names only the stations a cropped stop is about, and keeps every tag inside the picture', () => {
    STORY_FRAMES.forEach((frame, i) => {
      const still = buildStill(STORY_FRAMES, i, 'wide', true, 16 / 10)
      const [x, y, w, h] = viewBox(still.viewBox)
      expect(w / h).toBeCloseTo(16 / 10, 1)
      for (const l of still.labels) {
        if (frame.zoom > 1) expect(frame.focus).toContain(l.id)
        expect(l.x - (l.width * l.scale) / 2).toBeGreaterThanOrEqual(x - 0.5)
        expect(l.x + (l.width * l.scale) / 2).toBeLessThanOrEqual(x + w + 0.5)
        expect(l.y).toBeGreaterThanOrEqual(y)
        expect(l.y).toBeLessThanOrEqual(y + h)
      }
      // At least one tag says where the work is at every stop.
      expect(still.labels.length, frame.id).toBeGreaterThan(0)
    })
  })
})
