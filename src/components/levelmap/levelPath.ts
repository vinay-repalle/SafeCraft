// Phase 7h: the level map as a 3D path. This file is the plain part: where the stepping-stones
// stand, how big to draw them, which stones the learner's figure hops across, and what each
// stone shows. No three.js and no React, so it is unit-tested and stays out of the 3D chunk.
//
// The path runs left to right: one stone per level, then a plinth at the end that holds the
// badges you earn for more than one level. The stones zig-zag a little front and back, so the
// row reads as a path and not as a ruler.
import { levelSummaries, type PlayableRole } from '../../content'
import type { Progress } from '../../store/types'
import { computeBadges } from '../../utils/badges'

// Radius of a stone, in scene units (a person is about 1 unit tall).
export const STOP_RADIUS = 0.75
// The closest two stone centres may be. Set by the level buttons under the stones rather than
// the stones themselves: at the narrowest My view column this keeps about 40px between button
// centres, so the buttons never overlap.
export const MIN_STEP = 2.1
// How far the stones step to the front and back of the centre line.
export const ZIG = 0.35
// One stone per level, then the badge plinth.
export const PATH_STOPS = levelSummaries.length + 1
export const PLINTH_INDEX = PATH_STOPS - 1

// Timing for the figure's hops and a newly earned medal, in seconds.
export const HOP_SECONDS = 0.45
export const MEDAL_SECONDS = 0.5

// Centre of stop `index` along the row. The middle of the row is at 0.
export function stopX(index: number, step: number): number {
  return (index - (PATH_STOPS - 1) / 2) * step
}

// Front (+) or back (-) of the centre line. The first stone is in front.
export function stopZ(index: number): number {
  return index % 2 === 0 ? ZIG : -ZIG
}

// Pixels per scene unit (zoom), and scene units between stones (step), for a band this big.
//   sceneHeight  how tall the scene is on screen, in scene units, at zoom 1
//   padX         empty pixels kept at the left and right
//   padY         empty pixels kept above and below the scene, added together (labels go here)
// The zoom fits the height, unless the stones would then be closer than MIN_STEP across the
// width; then it shrinks. The step then stretches so the path uses the whole width.
export function pathFit(width: number, height: number, sceneHeight: number, padX: number, padY: number): { zoom: number; step: number } {
  const usable = Math.max(width - padX * 2, 1)
  const byHeight = (height - padY) / Math.max(sceneHeight, 0.01)
  const byWidth = usable / ((PATH_STOPS - 1) * MIN_STEP + 2 * STOP_RADIUS)
  const zoom = Math.max(1, Math.min(byHeight, byWidth))
  const step = Math.max(MIN_STEP, (usable / zoom - 2 * STOP_RADIUS) / (PATH_STOPS - 1))
  return { zoom, step }
}

// The stops the figure lands on, in order, to get from one stone to another. It hops across
// every stone in between, so a jump from Level 1 to Level 4 still reads as walking the path.
export function walkHops(from: number, to: number): number[] {
  const hops: number[] = []
  const dir = Math.sign(to - from)
  if (dir === 0) return hops
  for (let i = from + dir; i !== to + dir; i += dir) hops.push(i)
  return hops
}

// Where the small pebbles go in the gap between two stones (`a` and `b` are their centres, in
// scene units along the floor). One pebble in a short gap, two in a longer one, always in the
// open ground between the stone edges, never on a stone.
export function pebbleSpots(a: readonly [number, number], b: readonly [number, number], radius: number): [number, number][] {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const length = Math.hypot(dx, dz)
  const gap = length - radius * 2
  if (gap <= 0) return []
  const fractions = gap < 0.8 ? [0.5] : [1 / 3, 2 / 3]
  return fractions.map((f) => {
    const d = (radius + gap * f) / length
    return [a[0] + dx * d, a[1] + dz * d]
  })
}

// What one level's stone shows.
//   current   the level loaded now: the learner's figure stands here
//   doneHere  finished in the seat being played: the stone turns flat green, as on the pipeline
//   badge     the level's badge is earned (in either seat): a medal stands on the stone
export type LevelStop = { id: number; title: string; current: boolean; doneHere: boolean; badge: boolean }
export type PlinthBadge = { id: string; label: string; detail: string; earned: boolean }
export type LevelMapModel = { stops: LevelStop[]; plinth: PlinthBadge[]; earned: number; total: number }

// Everything the map draws, worked out from progress. Badges come from computeBadges, the same
// rules as the Progress Card, so the map and the card can never disagree.
export function levelMapModel(progress: Pick<Progress, 'completed' | 'guidesRead'>, role: PlayableRole, currentId: number): LevelMapModel {
  const badges = computeBadges(progress)
  const earned = (id: string) => badges.find((b) => b.id === id)?.earned === true
  return {
    stops: levelSummaries.map((l) => ({
      id: l.id,
      title: l.title,
      current: l.id === currentId,
      doneHere: progress.completed[l.id]?.[role] === true,
      badge: earned(`level-${l.id}`),
    })),
    plinth: badges.filter((b) => !b.id.startsWith('level-')).map(({ id, label, detail, earned }) => ({ id, label, detail, earned })),
    earned: badges.filter((b) => b.earned).length,
    total: badges.length,
  }
}

// The words on the plinth's tag.
export const badgeCount = (earned: number, total: number) => `Badges ${earned} of ${total}`
