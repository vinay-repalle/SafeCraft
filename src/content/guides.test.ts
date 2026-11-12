import { describe, expect, it } from 'vitest'
import { GUIDE_ORDER, guides } from './guides'
import { jargon } from './index'

describe('Field Guide content', () => {
  it('ships at least the five articles the PRD asks for, and loads every listed one', () => {
    expect(guides.length).toBeGreaterThanOrEqual(5)
    expect(guides.map((g) => g.slug)).toEqual([...GUIDE_ORDER])
  })

  it('gives every article a title, a summary and a two minute read at most', () => {
    for (const g of guides) {
      expect(g.title.length, g.slug).toBeGreaterThan(0)
      expect(g.title, g.slug).not.toBe(g.slug)
      expect(g.summary.length, g.slug).toBeGreaterThan(20)
      expect(g.blocks.some((b) => b.kind === 'h2'), g.slug).toBe(true)
      expect(g.minutes, g.slug).toBeLessThanOrEqual(2)
    }
  })

  it('has an article behind every guide link in the jargon file', () => {
    const slugs = new Set(guides.map((g) => g.slug))
    for (const t of jargon) if (t.guide) expect(slugs.has(t.guide), `${t.id} -> ${t.guide}`).toBe(true)
  })

  it('follows the copy rules: no exclamation marks, no em dashes, no emoji', () => {
    for (const g of guides) {
      const text = JSON.stringify(g.blocks) + g.title
      expect(text, g.slug).not.toContain('!')
      expect(text, g.slug).not.toContain('—')
      expect(text, g.slug).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })
})
