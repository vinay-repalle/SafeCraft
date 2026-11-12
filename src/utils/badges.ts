import { guides } from '../content/guides'
import { levelSummaries } from '../content'
import type { Progress } from '../store/types'

export type Badge = { id: string; label: string; detail: string; earned: boolean }

const doneAs = (p: Progress, level: number) => p.completed[level] ?? {}
const doneAny = (p: Progress, level: number) => doneAs(p, level).frontend === true || doneAs(p, level).backend === true

// Badges are worked out from progress each time, not stored. That way an imported file or a
// change to the rules can never leave a badge that was not earned, or hide one that was.
export function computeBadges(p: Progress): Badge[] {
  const badges: Badge[] = levelSummaries.map((l) => ({
    id: `level-${l.id}`,
    label: `Level ${l.id}`,
    detail: l.title,
    earned: doneAny(p, l.id),
  }))

  const bothSeats = levelSummaries.some((l) => doneAs(p, l.id).frontend === true && doneAs(p, l.id).backend === true)
  badges.push({
    id: 'both-seats',
    label: 'Both seats',
    detail: 'Finished one level as frontend and as backend',
    earned: bothSeats,
  })
  badges.push({
    id: 'all-levels',
    label: 'All five levels',
    detail: 'Finished every level',
    earned: levelSummaries.every((l) => doneAny(p, l.id)),
  })
  badges.push({
    id: 'all-guides',
    label: 'Field guide',
    detail: 'Read every article',
    earned: guides.length > 0 && guides.every((g) => p.guidesRead.includes(g.slug)),
  })
  return badges
}

export type CardData = {
  levels: { id: number; title: string; frontend: boolean; backend: boolean }[]
  badges: Badge[]
  termsMet: number
  termsTotal: number
  guidesRead: number
  guidesTotal: number
  stamp: string
}

export function buildCardData(p: Progress, termsTotal: number, stamp: string): CardData {
  return {
    levels: levelSummaries.map((l) => ({
      id: l.id,
      title: l.title,
      frontend: doneAs(p, l.id).frontend === true,
      backend: doneAs(p, l.id).backend === true,
    })),
    badges: computeBadges(p),
    termsMet: p.seenTerms.length,
    termsTotal,
    guidesRead: guides.filter((g) => p.guidesRead.includes(g.slug)).length,
    guidesTotal: guides.length,
    stamp,
  }
}
