import { describe, expect, it } from 'vitest'
import { STORY } from '../../content/landing'
import { gatePoints } from '../pipeline/mergeGate'
import { PARCEL_OFFSET, SPACING, parcelSpot, stationPositions } from '../pipeline/sceneLayout'
import { HERO_FRAME, STORY_FRAMES, progressFromCenters, stopIndex, storyPose } from './story'

const wide = stationPositions('wide')
const tall = stationPositions('tall')
const at = (id: string) => STORY_FRAMES.findIndex((f) => f.id === id)
const close = (a: readonly number[], b: readonly number[]) => a.forEach((n, i) => expect(n).toBeCloseTo(b[i], 5))

describe('progressFromCenters', () => {
  const centers = [100, 400, 700]

  it('is 0 until the first card reaches the reading line', () => {
    expect(progressFromCenters(centers, 50)).toBe(0)
    expect(progressFromCenters(centers, 100)).toBe(0)
  })

  it('is a whole number when a card sits on the line, and a fraction between cards', () => {
    expect(progressFromCenters(centers, 400)).toBe(1)
    expect(progressFromCenters(centers, 250)).toBeCloseTo(0.5)
    expect(progressFromCenters(centers, 625)).toBeCloseTo(1.75)
  })

  it('stops at the last card', () => {
    expect(progressFromCenters(centers, 700)).toBe(2)
    expect(progressFromCenters(centers, 5000)).toBe(2)
  })

  it('goes up as the page scrolls down, and back down when it scrolls up (rewind)', () => {
    // Scrolling down moves every card up the screen, which is the same as the line moving down.
    const lines = [0, 120, 300, 480, 690, 800]
    const forward = lines.map((l) => progressFromCenters(centers, l))
    for (let i = 1; i < forward.length; i++) expect(forward[i]).toBeGreaterThanOrEqual(forward[i - 1])
    const back = [...lines].reverse().map((l) => progressFromCenters(centers, l))
    expect(back).toEqual([...forward].reverse())
  })

  it('copes with no cards', () => {
    expect(progressFromCenters([], 100)).toBe(0)
  })
})

describe('stopIndex', () => {
  it('rounds to the nearest card and stays in range', () => {
    expect(stopIndex(1.4, 9)).toBe(1)
    expect(stopIndex(1.6, 9)).toBe(2)
    expect(stopIndex(-3, 9)).toBe(0)
    expect(stopIndex(42, 9)).toBe(8)
  })
})

describe('story frames', () => {
  it('match the text cards one to one, in order', () => {
    expect(STORY_FRAMES.map((f) => f.id)).toEqual(STORY.stops.map((s) => s.id))
  })

  it('follow the real route: the parcel never goes back up the line', () => {
    const order = ['pm', 'dev', 'gate', 'github', 'tests', 'live']
    const steps = STORY_FRAMES.map((f) => order.indexOf(f.parcel))
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1])
  })

  it('turns the test server red, then green, then approves the review, then goes live', () => {
    expect(STORY_FRAMES[at('tests-red')].stations.tests).toBe('fail')
    expect(STORY_FRAMES[at('tests-green')].stations.tests).toBe('pass')
    expect(STORY_FRAMES[at('review')].stations.github).toBe('pass')
    expect(STORY_FRAMES[at('live')].stations.live).toBe('pass')
  })

  it('shows the merge gate closed, then merged', () => {
    expect(STORY_FRAMES[at('conflict')].gate).toBe('closed')
    expect(STORY_FRAMES[at('merged')].gate).toBe('merged')
  })
})

describe('storyPose', () => {
  it('puts the parcel on the right pad at each stop, in both layouts', () => {
    for (const positions of [wide, tall]) {
      const g = gatePoints(positions.dev, positions.github, PARCEL_OFFSET)
      close(storyPose(STORY_FRAMES, at('ticket'), positions).parcel.at, parcelSpot(positions.pm))
      close(storyPose(STORY_FRAMES, at('parallel'), positions).parcel.at, parcelSpot(positions.dev))
      close(storyPose(STORY_FRAMES, at('conflict'), positions).parcel.at, g.yours)
      close(storyPose(STORY_FRAMES, at('github'), positions).parcel.at, parcelSpot(positions.github))
      close(storyPose(STORY_FRAMES, at('tests-red'), positions).parcel.at, parcelSpot(positions.tests))
      close(storyPose(STORY_FRAMES, at('live'), positions).parcel.at, parcelSpot(positions.live))
    }
  })

  it('rests at every stop: no hop in the air when a card sits on the line', () => {
    for (let i = 0; i < STORY_FRAMES.length; i++) expect(storyPose(STORY_FRAMES, i, wide).parcel.lift).toBeCloseTo(0, 9)
  })

  it('hops between pads but rides the conveyor flat from GitHub to the test server', () => {
    expect(storyPose(STORY_FRAMES, at('ticket') + 0.5, wide).parcel.lift).toBeGreaterThan(0)
    expect(storyPose(STORY_FRAMES, at('github') + 0.5, wide).parcel.lift).toBe(0)
  })

  it('moves the conveyor only while the parcel rides it, and keeps it where it stopped', () => {
    expect(storyPose(STORY_FRAMES, at('github'), wide).belt).toBe(0)
    expect(storyPose(STORY_FRAMES, at('github') + 0.5, wide).belt).toBeCloseTo(SPACING / 2)
    expect(storyPose(STORY_FRAMES, at('tests-red'), wide).belt).toBeCloseTo(SPACING)
    expect(storyPose(STORY_FRAMES, at('live'), wide).belt).toBeCloseTo(SPACING)
  })

  it('brings the teammate’s parcel to a closed gate, then merges it into yours as the bar lifts', () => {
    const g = gatePoints(wide.dev, wide.github, PARCEL_OFFSET)
    expect(storyPose(STORY_FRAMES, at('parallel'), wide).theirs).toBeNull()
    const closed = storyPose(STORY_FRAMES, at('conflict'), wide)
    close(closed.theirs!.at, g.theirs)
    expect(closed.gate).toMatchObject({ closed: true, barOpen: 0 })
    const lifting = storyPose(STORY_FRAMES, at('conflict') + 0.3, wide)
    expect(lifting.gate!.barOpen).toBeGreaterThan(0)
    close(lifting.theirs!.at, g.theirs) // still waiting while the bar lifts
    const merged = storyPose(STORY_FRAMES, at('merged'), wide)
    expect(merged.theirs).toBeNull()
    expect(merged.gate).toMatchObject({ closed: false, barOpen: 1 })
    expect(storyPose(STORY_FRAMES, at('github'), wide).gate).toBeNull()
  })

  it('plays backward the same way it plays forward', () => {
    for (const p of [0.3, 2.2, 3.6, 4.5, 7.9]) expect(storyPose(STORY_FRAMES, p, wide)).toEqual(storyPose(STORY_FRAMES, p, wide))
    const a = storyPose(STORY_FRAMES, 2.5, wide)
    storyPose(STORY_FRAMES, 6, wide) // no hidden state between calls
    expect(storyPose(STORY_FRAMES, 2.5, wide)).toEqual(a)
  })

  it('zooms in on each stop and pulls back to the whole diorama at the end', () => {
    expect(storyPose(STORY_FRAMES, at('parallel'), wide).zoom).toBeGreaterThan(1)
    const end = storyPose(STORY_FRAMES, at('live'), wide)
    expect(end.zoom).toBe(1)
    close([end.focus[0], end.focus[2]], [0, 0])
  })

  it('clamps progress outside the story', () => {
    expect(storyPose(STORY_FRAMES, -2, wide).index).toBe(0)
    expect(storyPose(STORY_FRAMES, 99, wide).index).toBe(STORY_FRAMES.length - 1)
  })

  it('draws the hero as one still frame with the change at GitHub', () => {
    const hero = storyPose([HERO_FRAME], 0, wide)
    close(hero.parcel.at, parcelSpot(wide.github))
    expect(hero.gate).toBeNull()
    expect(hero.zoom).toBe(1)
  })
})
