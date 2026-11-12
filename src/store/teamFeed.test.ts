import { describe, expect, it } from 'vitest'
import { getLevel } from '../content'
import { describeEvent, involvedRoles, roleStatuses } from './teamFeed'

const level = getLevel(1)!
const step = (id: string) => level.steps.find((s) => s.id === id)!

describe('roleStatuses on Level 1', () => {
  it('has the frontend developer working and the project manager waiting for a reply', () => {
    const s = roleStatuses(level, step('read-ticket-message'), false)
    expect(s.frontend.state).toBe('active')
    expect(s.pm).toMatchObject({ state: 'waiting' })
    expect(s.pm.detail).toContain('reply from Frontend developer')
  })

  it('shows who the others are waiting on, and what they do next', () => {
    const s = roleStatuses(level, step('create-branch'), false)
    expect(s.qa.state).toBe('waiting')
    expect(s.qa.detail).toContain('Waiting for Frontend developer')
    expect(s.qa.detail).toContain('run the tests')
    expect(s.reviewer.detail).toContain('review the change')
  })

  it('marks the engine-run step as automatic for its role', () => {
    const s = roleStatuses(level, step('run-tests'), false)
    expect(s.qa.state).toBe('automatic')
    expect(s.frontend.state).toBe('waiting')
  })

  it('says a role with no steps ahead is done, and a role with no part is not involved', () => {
    const s = roleStatuses(level, step('release'), false)
    expect(s.qa.state).toBe('done')
    expect(s.pm.state).toBe('automatic')
    expect(s.backend.state).toBe('uninvolved')
  })

  it('marks everyone who took part as done when the level is finished', () => {
    const s = roleStatuses(level, null, true)
    expect(s.frontend.state).toBe('done')
    expect(s.backend.state).toBe('uninvolved')
  })

  it('treats a chat sender as involved', () => {
    expect([...involvedRoles(level)].sort()).toEqual(['frontend', 'pm', 'qa', 'reviewer'])
  })
})

describe('describeEvent', () => {
  it('attributes engine-run events to the right role and lists who hears about them', () => {
    const tests = describeEvent({ type: 'tests:run', prId: 1, passed: true, report: {} as never }, 'frontend')
    expect(tests).toMatchObject({ actor: 'qa', text: 'Tests passed on pull request #1' })
    expect(tests?.notifies).toContain('frontend')
    expect(describeEvent({ type: 'github:pr-approved', prId: 1 }, 'frontend')).toMatchObject({ actor: 'reviewer', notifies: ['frontend'] })
  })

  it('tells the project manager when a ticket moves', () => {
    expect(describeEvent({ type: 'jira:ticket-moved', ticketId: 'ORD-14', from: 'todo', to: 'inprogress' }, 'frontend')).toEqual({
      actor: 'frontend',
      notifies: ['pm'],
      text: 'Moved ORD-14 to In progress',
    })
  })

  it('ignores events that are not worth a line', () => {
    expect(describeEvent({ type: 'step:active', stepId: 'x', index: 0 }, 'frontend')).toBeNull()
  })
})
