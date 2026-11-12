// Plays every level, from both seats, and checks the things that make each one different:
// the red test in Level 3, the conflict in Level 4, the changed ticket in Level 5.
import { describe, expect, it } from 'vitest'
import { getLevel, jargon, levels, LEVEL_IDS, type PlayableRole } from '../content'
import { LevelRunner } from './levelRunner'
import { validateLevel } from './levelValidation'
import type { Action } from './types'

const ROLES: PlayableRole[] = ['frontend', 'backend']
const git = (command: string): Action => ({ type: 'git', command })
const runner = (id: number, role: PlayableRole) => new LevelRunner(getLevel(id, role)!)

// Skip & Auto-Fill until the level ends. Returns the step ids in order.
function autoPlay(r: LevelRunner): string[] {
  const seen: string[] = []
  for (let guard = 0; !r.isFinished && guard < 60; guard++) {
    const step = r.currentStep()!
    seen.push(step.id)
    const result = r.act({ type: 'autoFill' })
    // The one place a step is meant to "fail": pulling into a conflict.
    if (!result.ok && step.id !== 'pull-main') throw new Error(`${step.id}: ${result.message}`)
  }
  return seen
}

describe('every level, both roles', () => {
  it('has all five levels in both roles, and they pass the content validator', () => {
    const ids = new Set(jargon.map((t) => t.id))
    expect(levels).toHaveLength(10)
    for (const role of ROLES) expect(LEVEL_IDS.map((id) => getLevel(id, role)?.perspective ?? 'frontend')).toEqual(Array(5).fill(role))
    for (const level of levels) expect(validateLevel(level, ids), `Level ${level.id} ${level.perspective ?? 'frontend'}`).toEqual([])
  })

  for (const role of ROLES) {
    for (const id of [1, 2, 3, 4, 5]) {
      it(`Level ${id} (${role}) finishes using only Skip & Auto-Fill, and ends live`, () => {
        const r = runner(id, role)
        autoPlay(r)
        expect(r.isFinished).toBe(true)
        expect(r.snapshot().deployed).toBe(true)
        expect(r.result().mistakes).toEqual([])
        // Everything the learner does is theirs; the engine runs QA, review and release.
        const learnerSteps = r.level.steps.filter((s) => !s.auto)
        expect(learnerSteps.every((s) => s.role === role || s.chat !== undefined)).toBe(true)
      })

      it(`Level ${id} (${role}): every step can be reached, with a hint on every learner step that needs one`, () => {
        const level = getLevel(id, role)!
        const hasChat = level.steps.filter((s) => s.kind === 'chat')
        expect(hasChat.length).toBeGreaterThan(0)
        for (const s of level.steps.filter((s) => ['git', 'code', 'syncCheck'].includes(s.kind))) expect(s.hint, `${s.id} needs a hint`).toBeTruthy()
      })
    }
  }
})

describe('Level 2: API contract', () => {
  it('has the backend teammate push the endpoint while you build against mock data, then merges it on pull', () => {
    const r = runner(2, 'frontend')
    r.act({ type: 'chat', chatId: 'contract-talk', replyId: 'number' })
    r.act(git('git pull origin main'))
    r.act({ type: 'moveTicket', ticketId: 'ORD-31', to: 'inprogress' })
    r.act(git('git checkout -b feature/ORD-31-delivery-estimate'))
    expect(r.git.remoteFiles('main')['src/api/orders.js']).not.toContain('estimatedMinutes')
    r.act({ type: 'autoFill' }) // write the contract
    expect(r.git.remoteFiles('main')['src/api/orders.js']).toContain('estimatedMinutes: 25')
    expect(r.log.some((e) => e.type === 'git:remote-commit')).toBe(true)
    autoPlay(r)
    expect(r.log.some((e) => e.type === 'git:pull' && e.result === 'merged')).toBe(true)
  })

  it('records a mistake when you tell the backend to send whatever is easiest', () => {
    for (const role of ROLES) {
      const r = runner(2, role)
      r.act({ type: 'chat', chatId: 'contract-talk', replyId: 'whatever' })
      expect(r.snapshot().mistakes.map((m) => m.id)).toEqual(['unagreed-contract'])
      expect(r.replay()[0]).toMatchObject({ mistake: 'unagreed-contract', you: expect.stringContaining('whatever was easiest') })
    }
  })

  it('does not accept a contract that leaves the field out', () => {
    const r = runner(2, 'frontend')
    autoPlayUntil(r, 'write-contract')
    r.act({ type: 'editFile', path: 'docs/orders-contract.json', content: '{ "response": {} }' })
    expect(r.currentStep()?.id).toBe('write-contract')
  })
})

// Plays with Skip & Auto-Fill until the named step is the current one.
function autoPlayUntil(r: LevelRunner, stepId: string) {
  for (let guard = 0; r.currentStep()?.id !== stepId && guard < 60; guard++) r.act({ type: 'autoFill' })
  expect(r.currentStep()?.id).toBe(stepId)
}

describe('Level 3: failed tests and review', () => {
  for (const role of ROLES) {
    it(`(${role}) the exact line from the ticket fails the tests, and the fix passes them`, () => {
      const r = runner(3, role)
      // The engine runs the tests the moment the pull request exists, so the next step you see is Sam's question.
      autoPlayUntil(r, 'read-the-log')
      expect(r.snapshot().lastTestReport?.passed).toBe(false)
      expect(r.snapshot().lastTestReport?.log.join('\n')).toContain('FAIL')
      expect(r.snapshot().pullRequests.at(-1)?.checks).toBe('failed')
      // Merging is blocked while the checks are red.
      expect(r.act({ type: 'mergePr' }).ok).toBe(false)

      autoPlayUntil(r, 'answer-reviewer') // pushing the fix re-ran the tests
      expect(r.snapshot().lastTestReport?.passed).toBe(true)
      expect(r.snapshot().pullRequests.at(-1)?.checks).toBe('passed')
      autoPlay(r)
      expect(r.isFinished).toBe(true)
      expect(r.log.filter((e) => e.type === 'tests:run').map((e) => (e.type === 'tests:run' ? e.passed : null))).toEqual([false, true])
    })
  }

  it('records a mistake for rerunning the tests or asking for approval before reading the log', () => {
    const r = runner(3, 'frontend')
    autoPlayUntil(r, 'read-the-log')
    r.act({ type: 'chat', chatId: 'tests-failed', replyId: 'rerun' })
    expect(r.snapshot().mistakes.map((m) => m.id)).toEqual(['ignored-failing-tests'])
  })

  it('records a mistake for brushing off the reviewer', () => {
    const r = runner(3, 'backend')
    autoPlayUntil(r, 'answer-reviewer')
    r.act({ type: 'chat', chatId: 'review-comment', replyId: 'small' })
    expect(r.snapshot().mistakes.map((m) => m.id)).toEqual(['dismissed-review'])
    expect(r.replay()[0].result).toContain('next person')
  })

  it('needs a second commit before the fix counts, and sends the pull request back through the checks', () => {
    const r = runner(3, 'frontend')
    autoPlayUntil(r, 'fix-total')
    r.act({ type: 'autoFill' }) // the fixed file, not committed yet
    expect(r.currentStep()?.id).toBe('commit-fix')
    expect(r.snapshot().pullRequests.at(-1)?.checks).toBe('failed')
    r.act({ type: 'autoFill' }) // commit
    expect(r.currentStep()?.id).toBe('sync-push-fix')
  })
})

describe('Level 4: merge conflict', () => {
  for (const role of ROLES) {
    it(`(${role}) a teammate pushes the same line, the pull stops on a conflict, and resolving it finishes the level`, () => {
      const r = runner(4, role)
      autoPlayUntil(r, 'mate-heads-up')
      expect(r.log.some((e) => e.type === 'git:remote-commit')).toBe(true)
      r.act({ type: 'autoFill' }) // chat
      expect(r.currentStep()?.id).toBe('pull-main')

      const pulled = r.act({ type: 'autoFill' })
      expect(pulled.ok).toBe(false)
      expect(pulled.message).toContain('CONFLICT')
      expect(r.snapshot().git.conflicts).toHaveLength(1)
      expect(r.currentStep()?.id).toBe('resolve-conflict')
      const path = r.snapshot().git.conflicts[0]
      expect(r.snapshot().git.files[path]).toContain('<<<<<<<')

      // Keeping only your own change is not enough.
      r.act({ type: 'editFile', path, content: r.snapshot().git.files[path].split('<<<<<<< HEAD\n')[1].split('=======')[0] })
      expect(r.currentStep()?.id).toBe('resolve-conflict')

      autoPlay(r)
      expect(r.isFinished).toBe(true)
      expect(r.snapshot().git.conflicts).toEqual([])
      expect(r.snapshot().git.files[path]).not.toContain('<<<<<<<')
      expect(r.result().mistakes).toEqual([])
    })
  }

  it('flags committing the file with the markers still in it', () => {
    const r = runner(4, 'frontend')
    autoPlayUntil(r, 'pull-main')
    r.act({ type: 'autoFill' })
    r.act(git('git add .'))
    r.act(git('git commit -m "Merge main into my branch"'))
    expect(r.snapshot().mistakes.map((m) => m.id)).toContain('committed-conflict-markers')
    expect(r.replay().some((i) => i.mistake === 'committed-conflict-markers')).toBe(true)
  })

  it('flags saying you will let the last change win', () => {
    const r = runner(4, 'backend')
    autoPlayUntil(r, 'mate-heads-up')
    r.act({ type: 'chat', chatId: 'heads-up', replyId: 'last-wins' })
    expect(r.snapshot().mistakes.map((m) => m.id)).toEqual(['overwrote-teammate'])
  })

  it('has no conflict if you only pull before the teammate pushes', () => {
    const r = runner(4, 'frontend')
    autoPlayUntil(r, 'edit-line')
    expect(r.act(git('git pull origin main')).ok).toBe(true)
    expect(r.snapshot().git.conflicts).toEqual([])
  })
})

describe('Level 5: sudden requirement change', () => {
  for (const role of ROLES) {
    it(`(${role}) the project manager changes the ticket after your first reply`, () => {
      const r = runner(5, role)
      expect(r.jira.get('ORD-23')?.title).toBe('Show the delivery estimate in minutes')
      r.act({ type: 'chat', chatId: 'change', replyId: 'check-contract' })
      expect(r.jira.get('ORD-23')?.title).toBe('Show the delivery estimate as a range')
      expect(r.jira.get('ORD-23')?.description).toContain('25 to 35')
      expect(r.log.some((e) => e.type === 'jira:ticket-updated')).toBe(true)
    })

    it(`(${role}) the teammate updates their half when you update the contract, and the tests check both halves agree`, () => {
      const r = runner(5, role)
      autoPlayUntil(r, 'update-contract')
      r.act({ type: 'autoFill' })
      expect(r.log.filter((e) => e.type === 'git:remote-commit')).toHaveLength(1)
      autoPlay(r)
      expect(r.snapshot().lastTestReport?.passed).toBe(true)
      expect(r.snapshot().lastTestReport?.summary.total).toBeGreaterThanOrEqual(6)
    })
  }

  it('records a mistake for changing your side before agreeing the new shape', () => {
    const r = runner(5, 'frontend')
    r.act({ type: 'chat', chatId: 'change', replyId: 'just-change' })
    expect(r.snapshot().mistakes.map((m) => m.id)).toEqual(['unagreed-contract'])
  })

  it('fails the tests if the contract and the code disagree', () => {
    const r = runner(5, 'frontend')
    autoPlayUntil(r, 'update-ui')
    // Contract updated, but the screen still reads the old field.
    expect(r.snapshot().git.files['src/api/orders.contract.json']).toContain('estimatedMinutesMax')
    expect(r.snapshot().git.files['src/components/DeliveryEstimate.jsx']).toContain('order.estimatedMinutes}')
    expect(r.currentStep()?.id).toBe('update-ui')
  })
})
