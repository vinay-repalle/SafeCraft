import { describe, expect, it } from 'vitest'
import { DEFAULT_PROGRESS } from '../store/progressSchema'
import type { Progress } from '../store/types'
import { isPlainLeftClick, parseRoute, playHref, startTarget } from './route'

const IDS = [1, 2, 3, 4, 5]
const progress = (patch: Partial<Progress> = {}): Progress => ({ ...DEFAULT_PROGRESS, ...patch, settings: { ...DEFAULT_PROGRESS.settings, ...patch.settings } })

describe('parseRoute', () => {
  it('shows the landing page at the root and at any unknown address', () => {
    expect(parseRoute('/', '', IDS)).toEqual({ page: 'landing', level: null })
    expect(parseRoute('/about', '', IDS)).toEqual({ page: 'landing', level: null })
    expect(parseRoute('/playground', '', IDS)).toEqual({ page: 'landing', level: null })
  })

  it('shows the game at /play, with or without a trailing slash', () => {
    expect(parseRoute('/play', '', IDS)).toEqual({ page: 'play', level: null })
    expect(parseRoute('/play/', '', IDS)).toEqual({ page: 'play', level: null })
  })

  it('reads a level from the address only when that level exists', () => {
    expect(parseRoute('/play', '?level=3', IDS).level).toBe(3)
    expect(parseRoute('/play', '?level=9', IDS).level).toBeNull()
    expect(parseRoute('/play', '?level=2x', IDS).level).toBeNull()
    expect(parseRoute('/play', '?level=', IDS).level).toBeNull()
    expect(parseRoute('/', '?level=3', IDS).level).toBeNull()
  })

  it('builds the links it reads back', () => {
    expect(parseRoute(playHref(4).split('?')[0], '?' + playHref(4).split('?')[1], IDS)).toEqual({ page: 'play', level: 4 })
    expect(playHref()).toBe('/play')
  })
})

describe('isPlainLeftClick', () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false }
  it('handles a plain left click in the page', () => {
    expect(isPlainLeftClick(click)).toBe(true)
  })
  it('leaves new-tab clicks and other buttons to the browser', () => {
    expect(isPlainLeftClick({ ...click, button: 1 })).toBe(false)
    expect(isPlainLeftClick({ ...click, metaKey: true })).toBe(false)
    expect(isPlainLeftClick({ ...click, ctrlKey: true })).toBe(false)
    expect(isPlainLeftClick({ ...click, shiftKey: true })).toBe(false)
    expect(isPlainLeftClick({ ...click, altKey: true })).toBe(false)
    expect(isPlainLeftClick({ ...click, defaultPrevented: true })).toBe(false)
  })
})

describe('startTarget', () => {
  it('starts Level 1 on a first visit', () => {
    expect(startTarget(progress(), IDS)).toEqual({ label: 'Start level 1', href: '/play?level=1', level: 1 })
  })

  it('continues Level 1 for someone who has opened the game but finished nothing', () => {
    expect(startTarget(progress({ seenTerms: ['ticket'] }), IDS).label).toBe('Continue: Level 1')
  })

  it('continues from the first level not finished in the learner’s seat', () => {
    const completed = { 1: { frontend: true }, 2: { frontend: true }, 4: { frontend: true } }
    expect(startTarget(progress({ completed }), IDS)).toEqual({ label: 'Continue: Level 3', href: '/play?level=3', level: 3 })
  })

  it('looks at the backend seat for a backend learner', () => {
    const completed = { 1: { frontend: true, backend: true }, 2: { frontend: true } }
    const p = progress({ completed, settings: { ...DEFAULT_PROGRESS.settings, role: 'backend' } })
    expect(startTarget(p, IDS).label).toBe('Continue: Level 2')
  })

  it('uses the frontend seat for an observe-only role', () => {
    const p = progress({ completed: { 1: { backend: true } }, settings: { ...DEFAULT_PROGRESS.settings, role: 'qa' } })
    expect(startTarget(p, IDS).label).toBe('Continue: Level 1')
  })

  it('opens the level map when every level is finished in the seat', () => {
    const completed = Object.fromEntries(IDS.map((id) => [id, { frontend: true }]))
    expect(startTarget(progress({ completed }), IDS)).toEqual({ label: 'Open the levels', href: '/play', level: null })
  })
})
