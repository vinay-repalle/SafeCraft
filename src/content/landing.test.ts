import { describe, expect, it } from 'vitest'
import { ROLE_INFO } from '../app/nav'
import { CLOSING, FACTS, FOOTER, FOOTER_LINKS, GAME, HERO, HOW_TO_PLAY, ROLES, STORY } from './landing'
import { checkSketch } from './sketch'

// Every string in the landing copy, for the copy rules.
const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []

describe('landing page copy', () => {
  const all = strings({ HERO, STORY, ROLES, HOW_TO_PLAY: { ...HOW_TO_PLAY, steps: HOW_TO_PLAY.steps.map((s) => ({ title: s.title, body: s.body })) }, CLOSING, FOOTER, FACTS, GAME, FOOTER_LINKS })

  it('follows the copy rules: no exclamation marks, em dashes or emoji', () => {
    expect(all.length).toBeGreaterThan(40)
    for (const text of all) {
      expect(text, text).not.toContain('!')
      expect(text, text).not.toContain('—')
      expect(text, text).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })

  it('writes titles in sentence case', () => {
    const titles = [HERO.title, STORY.title, GAME.title, ROLES.title, HOW_TO_PLAY.title, CLOSING.title, ...GAME.panels.map((p) => p.name), ...STORY.stops.map((s) => s.title), ...HOW_TO_PLAY.steps.map((s) => s.title)]
    // After the first word, only names (Git, GitHub, Level) may start with a capital letter.
    const names = new Set(['Git', 'GitHub', 'Level', 'JSON', 'ORD-14'])
    for (const title of titles) {
      for (const word of title.split(/\s+/).slice(1)) if (/^[A-Z]/.test(word)) expect(names.has(word.replace(/[^\w-]/g, '')), `${title}: ${word}`).toBe(true)
    }
  })

  it('has a story stop for every scene frame, each linked to a real level', () => {
    expect(STORY.stops.map((s) => s.id)).toEqual(['ticket', 'parallel', 'conflict', 'merged', 'github', 'tests-red', 'tests-green', 'review', 'live'])
    for (const stop of STORY.stops) expect([1, 2, 3, 4, 5]).toContain(stop.level)
  })

  it('describes all five roles', () => {
    for (const role of ROLE_INFO) expect(ROLES.detail[role.id].length, role.id).toBeGreaterThan(20)
  })

  it('has four how-to-play steps, each with a drawing that passes the sketch checks', () => {
    expect(HOW_TO_PLAY.steps).toHaveLength(4)
    for (const step of HOW_TO_PLAY.steps) expect(checkSketch(step.sketch)).toEqual([])
  })

  it('names the four helpers', () => {
    expect(HOW_TO_PLAY.helpers.map((h) => h.id)).toEqual(['jargon', 'guide', 'cheat', 'skip'])
  })
})
