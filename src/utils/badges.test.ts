import { describe, expect, it } from 'vitest'
import { jargon, levelSummaries } from '../content'
import { guides } from '../content/guides'
import { DEFAULT_PROGRESS } from '../store/progressSchema'
import type { Progress } from '../store/types'
import { buildCardData, computeBadges } from './badges'
import { CARD_SIZE, drawProgressCard, readCardColors } from './progressCard'

const earnedIds = (p: Progress) => computeBadges(p).filter((b) => b.earned).map((b) => b.id)

describe('badges', () => {
  it('earns nothing on a fresh start', () => {
    expect(earnedIds(DEFAULT_PROGRESS)).toEqual([])
  })

  it('earns a level badge for either seat', () => {
    const p: Progress = { ...DEFAULT_PROGRESS, completed: { 1: { frontend: true }, 2: { backend: true } } }
    expect(earnedIds(p)).toEqual(['level-1', 'level-2'])
  })

  it('earns Both seats only when one level is finished from each', () => {
    const split: Progress = { ...DEFAULT_PROGRESS, completed: { 1: { frontend: true }, 2: { backend: true } } }
    expect(earnedIds(split)).not.toContain('both-seats')
    const both: Progress = { ...DEFAULT_PROGRESS, completed: { 2: { frontend: true, backend: true } } }
    expect(earnedIds(both)).toContain('both-seats')
  })

  it('earns All five levels and the guide badge from complete progress', () => {
    const completed: Progress['completed'] = {}
    for (const l of levelSummaries) completed[l.id] = { frontend: true }
    const p: Progress = { ...DEFAULT_PROGRESS, completed, guidesRead: guides.map((g) => g.slug) }
    expect(earnedIds(p)).toEqual(expect.arrayContaining(['all-levels', 'all-guides']))
  })

  it('counts only guides that exist', () => {
    const p: Progress = { ...DEFAULT_PROGRESS, guidesRead: ['not-a-guide', guides[0].slug] }
    expect(buildCardData(p, jargon.length, '2026-11-12').guidesRead).toBe(1)
  })
})

describe('progress card', () => {
  it('paints every level title and the totals, inside the card size', () => {
    const data = buildCardData(
      { ...DEFAULT_PROGRESS, completed: { 1: { frontend: true } }, seenTerms: ['ticket'] },
      jargon.length,
      '2026-11-12',
    )
    const texts: string[] = []
    const calls: string[] = []
    // A stand-in canvas that records what is drawn, so the layout can be checked without a browser.
    const ctx = new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          if (prop === 'measureText') return (s: string) => ({ width: s.length * 8 })
          if (prop === 'fillText') return (s: string) => void texts.push(s)
          return (..._a: unknown[]) => void calls.push(prop)
        },
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D
    drawProgressCard(ctx, data, readCardColors())
    const all = texts.join('\n')
    expect(all).toContain('SyncCraft progress')
    expect(all).toContain('1 of 5 levels finished')
    expect(all).toContain(`1 of ${jargon.length} terms met`)
    expect(all).toContain('Level 1')
    expect(all).toContain('Level 5')
    expect(CARD_SIZE).toEqual({ width: 1200, height: 540 })
  })
})
