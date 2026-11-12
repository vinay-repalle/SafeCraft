import { describe, expect, it } from 'vitest'
import { getLevel } from '../content'
import { LevelRunner } from '../engine/levelRunner'
import { hopsToPlay, ticketJourney } from './ticketJourney'

const level1 = getLevel(1)!

describe('ticketJourney on Level 1', () => {
  it('starts with the project manager, who wrote the ticket, handing it to the developer', () => {
    const j = ticketJourney(level1, 'read-ticket-message', false)
    expect(j.ticketId).toBe(level1.scenario.ticket.id)
    expect(j.stops).toEqual(['pm', 'frontend'])
    expect(j.holder).toBe('frontend')
    expect(j.next).toBe('qa')
  })

  it('keeps one stop while the same role works through several steps', () => {
    expect(ticketJourney(level1, 'raise-pr', false).stops).toEqual(['pm', 'frontend'])
  })

  it('includes the steps the engine runs by itself, so QA and the reviewer are on the journey', () => {
    const j = ticketJourney(level1, 'merge-pr', false)
    expect(j.stops).toEqual(['pm', 'frontend', 'qa', 'reviewer', 'frontend'])
    expect(j.next).toBe('pm')
  })

  it('ends with the release, and nobody next', () => {
    const j = ticketJourney(level1, null, true)
    expect(j.stops).toEqual(['pm', 'frontend', 'qa', 'reviewer', 'frontend', 'pm'])
    expect(j.holder).toBe('pm')
    expect(j.next).toBeNull()
    expect(j.finished).toBe(true)
  })

  it('follows a real run: after raising the pull request the ticket has been to QA and the reviewer', () => {
    const runner = new LevelRunner(level1)
    for (let i = 0; i < 40 && runner.snapshot().currentStepId !== 'merge-pr'; i++) runner.act({ type: 'autoFill' })
    const s = runner.snapshot()
    expect(ticketJourney(level1, s.currentStepId, s.finished).stops).toEqual(['pm', 'frontend', 'qa', 'reviewer', 'frontend'])
  })
})

describe('ticketJourney on other levels', () => {
  it('sends the ticket back to QA a second time when the tests failed first (Level 3)', () => {
    const level3 = getLevel(3)!
    const stops = ticketJourney(level3, null, true).stops
    expect(stops.filter((r) => r === 'qa')).toHaveLength(2)
  })

  it('follows the backend seat', () => {
    const backend = getLevel(1, 'backend')!
    expect(ticketJourney(backend, backend.steps[0].id, false).stops).toEqual(['pm', 'backend'])
  })
})

describe('hopsToPlay', () => {
  it('snaps on the first draw', () => {
    expect(hopsToPlay([], ['pm', 'frontend'])).toEqual({ snap: true, hops: [] })
  })

  it('plays every new stop in order, including ones passed in the same moment', () => {
    expect(hopsToPlay(['pm', 'frontend'], ['pm', 'frontend', 'qa', 'reviewer', 'frontend'])).toEqual({ snap: false, hops: ['qa', 'reviewer', 'frontend'] })
  })

  it('does nothing when the journey has not changed', () => {
    expect(hopsToPlay(['pm', 'frontend'], ['pm', 'frontend'])).toEqual({ snap: false, hops: [] })
  })

  it('snaps when the journey restarts or is a different one', () => {
    expect(hopsToPlay(['pm', 'frontend', 'qa'], ['pm', 'frontend'])).toEqual({ snap: true, hops: [] })
    expect(hopsToPlay(['pm', 'frontend'], ['pm', 'backend', 'qa'])).toEqual({ snap: true, hops: [] })
  })
})
