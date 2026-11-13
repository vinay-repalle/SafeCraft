// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getLevel, LEVEL_IDS, type PlayableRole } from '../content'
import { LevelRunner } from '../engine/levelRunner'
import type { Step } from '../engine/types'
import { describeAction, nextAction, nextActionFor, repoFacts, zoneOf, type RepoFacts } from './nextAction'

const clean: RepoFacts = { merging: false, markersLeft: false, uncommitted: false, unpushed: false }
const step = (over: Partial<Step>): Step => ({ id: 's', role: 'frontend', kind: 'git', prompt: 'Do it', ...over })

describe('nextAction', () => {
  it('names a control for each kind of check', () => {
    expect(nextAction(step({ kind: 'chat', check: { type: 'chatDone', chatId: 'intro' } }), clean, false)).toEqual({ kind: 'chat' })
    expect(nextAction(step({ kind: 'board', check: { type: 'ticketStatus', ticketId: 'ORD-14', status: 'inprogress' } }), clean, false)).toEqual({
      kind: 'ticket',
      ticketId: 'ORD-14',
      to: 'inprogress',
    })
    expect(nextAction(step({ check: { type: 'branchNamed', pattern: '.*' } }), clean, false)).toEqual({ kind: 'git', tool: 'branch' })
    expect(nextAction(step({ kind: 'code', check: { type: 'fileContains', path: 'a.js' } }), clean, false)).toEqual({ kind: 'editor' })
    expect(nextAction(step({ check: { type: 'branchHasCommit' } }), clean, false)).toEqual({ kind: 'git', tool: 'commit' })
    expect(nextAction(step({ kind: 'syncCheck', check: { type: 'syncResolved', phase: 'start' } }), clean, false)).toEqual({ kind: 'git', tool: 'pull' })
    expect(nextAction(step({ check: { type: 'pushed' } }), clean, false)).toEqual({ kind: 'git', tool: 'push' })
    expect(nextAction(step({ kind: 'pr', check: { type: 'prRaised' } }), clean, false)).toEqual({ kind: 'git', tool: 'pr' })
    expect(nextAction(step({ kind: 'pr', check: { type: 'prMerged' } }), clean, false)).toEqual({ kind: 'merge' })
  })

  it('has nothing to point at when a step runs on its own or the level is over', () => {
    expect(nextAction(null, clean, false)).toBeNull()
    expect(nextAction(step({ kind: 'review', auto: { type: 'approvePr' }, check: { type: 'prApproved' } }), clean, false)).toBeNull()
    expect(nextAction(step({ kind: 'tests', auto: { type: 'runTests' }, check: { type: 'testsPassed' } }), clean, false)).toBeNull()
  })

  it('walks the learner through a failed test run: edit, then commit, then push', () => {
    const tests = step({ kind: 'tests', auto: { type: 'runTests' }, check: { type: 'testsPassed' } })
    expect(nextAction(tests, clean, true)).toEqual({ kind: 'editor' })
    expect(nextAction(tests, { ...clean, uncommitted: true }, true)).toEqual({ kind: 'git', tool: 'commit' })
    expect(nextAction(tests, { ...clean, unpushed: true }, true)).toEqual({ kind: 'git', tool: 'push' })
  })

  it('puts a waiting merge first: fix the markers, then commit', () => {
    const push = step({ check: { type: 'pushed' } })
    expect(nextAction(push, { ...clean, merging: true, markersLeft: true }, false)).toEqual({ kind: 'editor' })
    expect(nextAction(push, { ...clean, merging: true }, false)).toEqual({ kind: 'git', tool: 'commit' })
  })

  it('places board and chat in the task zone, and everything else with the code', () => {
    expect(zoneOf({ kind: 'chat' })).toBe('task')
    expect(zoneOf({ kind: 'ticket', ticketId: 'ORD-14', to: 'done' })).toBe('task')
    expect(zoneOf({ kind: 'editor' })).toBe('code')
    expect(zoneOf({ kind: 'merge' })).toBe('code')
  })

  it('says the control in words', () => {
    const label = (s: string) => (s === 'inprogress' ? 'In progress' : s)
    expect(describeAction({ kind: 'ticket', ticketId: 'ORD-14', to: 'inprogress' }, label)).toBe('Move ORD-14 to In progress on the board')
    expect(describeAction({ kind: 'git', tool: 'branch' }, label)).toBe('Use the Create branch button')
  })
})

describe('repoFacts', () => {
  it('notices uncommitted edits and unpushed commits', () => {
    const r = new LevelRunner(getLevel(1)!)
    const path = Object.keys(r.git.files())[0]
    expect(repoFacts(r)).toMatchObject({ merging: false, uncommitted: false })
    r.git.editFile(path, 'changed')
    expect(repoFacts(r).uncommitted).toBe(true)
  })
})

// Plays every level with Skip & Auto-Fill. Before each step the learner does by hand, the game
// must be able to point at a control, or the learner would be left guessing.
describe('every learner step has a place to act', () => {
  for (const role of ['frontend', 'backend'] as PlayableRole[]) {
    for (const id of LEVEL_IDS) {
      it(`Level ${id} (${role})`, () => {
        const r = new LevelRunner(getLevel(id, role)!)
        for (let guard = 0; !r.isFinished && guard < 60; guard++) {
          const current = r.currentStep()!
          if (!current.auto) expect(nextActionFor(r), current.id).not.toBeNull()
          r.act({ type: 'autoFill' })
        }
        expect(r.isFinished).toBe(true)
        expect(nextActionFor(r)).toBeNull()
      })
    }
  }
})
