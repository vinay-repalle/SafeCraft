import { describe, expect, it } from 'vitest'
import { getLevel, jargon, levels } from '../content'
import { LevelRunner } from './levelRunner'
import { validateLevel } from './levelValidation'
import type { Action, EngineEvent } from './types'

const BUTTON = 'src/components/CheckoutButton.jsx'
const FIXED_BUTTON =
  'export function CheckoutButton({ total, onCheckout }) {\n  return (\n    <button className="checkout-button" onClick={onCheckout}>\n      Place order · ${total.toFixed(2)}\n    </button>\n  )\n}\n'
const BRANCH = 'feature/ORD-14-place-order-button'
const TITLE = 'ORD-14 Rename checkout button to Place order'

const level1 = () => getLevel(1)!
const newRunner = () => new LevelRunner(level1())
const git = (command: string): Action => ({ type: 'git', command })

// Plays Level 1 the way the PRD describes it, doing everything right.
function playCorrectly(r: LevelRunner) {
  r.act({ type: 'chat', chatId: 'intro', replyId: 'ack' })
  r.act(git('git pull origin main'))
  r.act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' })
  r.act(git(`git checkout -b ${BRANCH}`))
  r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON })
  r.act(git('git add .'))
  r.act(git(`git commit -m "${TITLE}"`))
  r.act(git('git pull origin main'))
  r.act(git(`git push -u origin ${BRANCH}`))
  r.act({ type: 'raisePr', title: TITLE })
  r.act({ type: 'mergePr' })
}

const types = (r: LevelRunner) => r.log.map((e) => e.type)

describe('level data', () => {
  it('level 1 passes the content validator', () => {
    const ids = new Set(jargon.map((t) => t.id))
    for (const level of levels) expect(validateLevel(level, ids)).toEqual([])
  })

  it('the validator catches the mistakes it is there for', () => {
    const ids = new Set(jargon.map((t) => t.id))
    const broken = structuredClone(level1())
    broken.steps[2].check = { type: 'ticketStatus', ticketId: 'NOPE-1', status: 'inprogress' }
    broken.steps[4].autoFill = undefined
    broken.steps[0].terms = ['not-a-term']
    broken.replay.pop()
    const problems = validateLevel(broken, ids)
    expect(problems.join('\n')).toContain('unknown ticket NOPE-1')
    expect(problems.join('\n')).toContain('needs autoFill')
    expect(problems.join('\n')).toContain('unknown jargon term "not-a-term"')
    expect(problems.join('\n')).toContain('No replay rule for mistake "pr-out-of-date"')
  })
})

describe('Level 1: a correct run', () => {
  it('completes every step, finishes the level, and makes no mistakes', () => {
    const r = newRunner()
    playCorrectly(r)
    const snap = r.snapshot()
    expect(snap.finished).toBe(true)
    expect(snap.completedStepIds).toEqual(level1().steps.map((s) => s.id))
    expect(snap.mistakes).toEqual([])
    expect(r.replay()).toEqual([])
    expect(snap.deployed).toBe(true)
    expect(r.currentStep()).toBeNull()
    expect(r.result()).toMatchObject({ levelId: 1, autoFilledSteps: [], mistakes: [] })
  })

  it('leaves the world in the right state', () => {
    const r = newRunner()
    playCorrectly(r)
    const snap = r.snapshot()
    expect(snap.board.inprogress.map((t) => t.id)).toContain('ORD-14')
    expect(snap.git.files[BUTTON]).toContain('Place order')
    // Marcus's change was pulled in before the branch was made.
    expect(snap.git.files['src/components/CartSummary.jsx']).toContain('deliveryFee')
    expect(snap.git.behindMain).toBeLessThanOrEqual(1) // only the PR's merge commit is new on main
    expect(snap.pullRequests).toEqual([
      expect.objectContaining({ id: 1, status: 'merged', checks: 'passed', approved: true, head: BRANCH }),
    ])
    expect(snap.lastTestReport?.passed).toBe(true)
    expect(snap.lastTestReport?.log.at(-1)).toBe(' Tests  4 passed (4)')
  })

  it('emits events in the order a UI and the 3D scene need them', () => {
    const r = newRunner()
    const heard: EngineEvent[] = []
    r.events.on((e) => heard.push(e))
    playCorrectly(r)

    // Listeners hear exactly what the log recorded, except the first step:active,
    // which fired in the constructor before anyone could subscribe.
    expect(r.log[0]).toMatchObject({ type: 'step:active', index: 0 })
    expect(heard).toEqual(r.log.slice(1))

    const completes = r.log.filter((e) => e.type === 'step:complete').map((e) => (e as { stepId: string }).stepId)
    expect(completes).toEqual(level1().steps.map((s) => s.id))
    expect(r.log.filter((e) => e.type === 'step:active')).toHaveLength(level1().steps.length)

    const index = (type: string, pick?: (e: EngineEvent) => boolean) => r.log.findIndex((e) => e.type === type && (!pick || pick(e)))
    expect(index('chat:reply')).toBeLessThan(index('git:pull'))
    expect(index('git:pull')).toBeLessThan(index('jira:ticket-moved'))
    expect(index('jira:ticket-moved')).toBeLessThan(index('git:branch-created'))
    expect(index('git:branch-created')).toBeLessThan(index('git:commit'))
    expect(index('git:commit')).toBeLessThan(index('git:push'))
    expect(index('git:push')).toBeLessThan(index('github:pr-opened'))
    expect(index('github:pr-opened')).toBeLessThan(index('tests:run'))
    expect(index('tests:run')).toBeLessThan(index('github:pr-approved'))
    expect(index('github:pr-approved')).toBeLessThan(index('github:pr-merged'))
    expect(index('github:pr-merged')).toBeLessThan(index('release:deployed'))
    expect(types(r).at(-1)).toBe('level:complete')

    // The 3D scene gets a package journey: client -> pm -> dev -> github -> tests -> live.
    const pipeline = r.log.filter((e) => e.type === 'pipeline').map((e) => (e as Extract<EngineEvent, { type: 'pipeline' }>).event)
    expect(pipeline.map((p) => `${p.packageFrom ?? '-'}>${p.station}:${p.status}`)).toEqual([
      'client>pm:active',
      'pm>dev:active',
      'dev>github:active',
      'github>tests:pass',
      '->github:pass',
      'tests>live:active',
      '->live:pass',
    ])
    expect(types(r)).toContain('sync:resolved')
  })

  it('does not accept actions once the level is complete', () => {
    const r = newRunner()
    playCorrectly(r)
    expect(r.act(git('git status'))).toEqual({ ok: false, message: 'This level is complete.' })
  })
})

describe('Level 1: Skip & Auto-Fill', () => {
  it('finishes the whole level from the first step using only autoFill', () => {
    const r = newRunner()
    let guard = 0
    while (!r.isFinished && guard++ < 40) {
      const result = r.act({ type: 'autoFill' })
      expect(result.ok, `${r.currentStep()?.id}: ${result.message}`).toBe(true)
    }
    const result = r.result()
    expect(r.isFinished).toBe(true)
    expect(result.mistakes).toEqual([])
    expect(r.snapshot().deployed).toBe(true)
    expect(result.autoFilledSteps).toEqual([
      'read-ticket-message', 'sync-start', 'start-ticket', 'create-branch', 'edit-button',
      'commit-change', 'sync-push', 'push-branch', 'raise-pr', 'merge-pr',
    ])
    // Steps the engine performs itself are never counted as auto-filled.
    expect(result.completedSteps).toContain('run-tests')
    expect(result.autoFilledSteps).not.toContain('run-tests')
  })

  it('shows the real commands it ran', () => {
    const r = newRunner()
    r.act({ type: 'autoFill' }) // chat
    r.act({ type: 'autoFill' }) // pull
    r.act({ type: 'autoFill' }) // ticket
    const branch = r.act({ type: 'autoFill' })
    expect(branch.message).toContain(`$ git checkout -b ${BRANCH}`)
    expect(branch.message).toContain("Switched to a new branch 'feature/ORD-14-place-order-button'")
  })

  it('has nothing to fill on a step the engine runs itself', () => {
    const r = newRunner()
    // Fast-forward to the engine-owned tests step by auto-filling the learner steps.
    while (r.currentStep()?.id !== 'merge-pr') r.act({ type: 'autoFill' })
    expect(r.snapshot().completedStepIds).toContain('run-tests')
    expect(r.snapshot().completedStepIds).toContain('review')
  })
})

describe('Level 1: Sync Check gates', () => {
  it('holds back creating a branch until you pull or ignore', () => {
    const r = newRunner()
    const result = r.act(git(`git checkout -b ${BRANCH}`))
    expect(result).toMatchObject({ ok: false, gate: 'start-pull' })
    expect(r.git.currentBranch()).toBe('main')
    expect(r.git.branches()).toEqual(['main'])
  })

  it('holds back moving the ticket to In progress, but not other moves', () => {
    const r = newRunner()
    const result = r.act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' })
    expect(result).toMatchObject({ ok: false, gate: 'start-pull' })
    expect(r.jira.get('ORD-14')?.status).toBe('todo')
  })

  it('lets the learner type the pull and then carries on', () => {
    const r = newRunner()
    const pull = r.act(git('git pull origin main'))
    expect(pull.ok).toBe(true)
    expect(pull.message).toContain('Fast-forward')
    expect(r.snapshot().sync.start).toBe('pulled')
    expect(r.act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' }).ok).toBe(true)
  })

  it('the popup button "Skip & Auto-run" pulls for the learner and shows it in the log', () => {
    const r = newRunner()
    const result = r.act({ type: 'syncCheck', phase: 'start', choice: 'auto' })
    expect(result.ok).toBe(true)
    expect(result.message).toContain('Fast-forward')
    expect(r.snapshot().sync.start).toBe('auto')
    expect(r.log.some((e) => e.type === 'git:pull' && e.result === 'fast-forward')).toBe(true)
  })

  it('holds back pushing until you pull again after your last commit', () => {
    const r = newRunner()
    r.act(git('git pull origin main'))
    r.act(git(`git checkout -b ${BRANCH}`))
    r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON })
    r.act(git('git add .'))
    r.act(git(`git commit -m "${TITLE}"`))
    expect(r.act(git(`git push -u origin ${BRANCH}`))).toMatchObject({ ok: false, gate: 'pre-push' })
    expect(r.git.remoteBranches()).toEqual(['main'])
    expect(r.act({ type: 'raisePr', title: TITLE })).toMatchObject({ ok: false, gate: 'pre-push' })
    r.act(git('git pull origin main'))
    expect(r.act(git(`git push -u origin ${BRANCH}`)).ok).toBe(true)
  })

  it('a new commit after pulling asks for another pull', () => {
    const r = newRunner()
    r.act(git('git pull origin main'))
    r.act(git(`git checkout -b ${BRANCH}`))
    r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON })
    r.act(git('git commit -am "ORD-14 first attempt"'))
    r.act(git('git pull origin main'))
    expect(r.snapshot().sync.push).toBe('pulled')
    r.act({ type: 'editFile', path: BUTTON, content: `${FIXED_BUTTON}\n` })
    r.act(git('git commit -am "ORD-14 tidy trailing newline"'))
    expect(r.snapshot().sync.push).toBeNull()
  })
})

describe('Level 1: learning the hard way (ignoring Sync Check)', () => {
  it('records each skipped habit and what it would have caused, and still finishes', () => {
    const r = newRunner()
    r.act({ type: 'chat', chatId: 'intro', replyId: 'ack' })
    expect(r.act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' }).gate).toBe('start-pull')
    expect(r.act({ type: 'syncCheck', phase: 'start', choice: 'ignore' }).ok).toBe(true)
    r.act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' })
    r.act(git(`git checkout -b ${BRANCH}`))
    expect(r.snapshot().git.behindMain).toBe(1) // "branch is behind main"
    r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON })
    r.act(git('git commit -am "ORD-14 Rename checkout button to Place order"'))
    expect(r.act(git(`git push -u origin ${BRANCH}`)).gate).toBe('pre-push')
    r.act({ type: 'syncCheck', phase: 'push', choice: 'ignore' })
    expect(r.act(git(`git push -u origin ${BRANCH}`)).ok).toBe(true)
    r.act({ type: 'raisePr', title: TITLE })
    r.act({ type: 'mergePr' })

    expect(r.isFinished).toBe(true)
    expect(r.snapshot().mistakes.map((m) => m.id)).toEqual(['skipped-start-pull', 'branch-behind-main', 'skipped-prepush-pull', 'pr-out-of-date'])
    expect(r.replay().map((i) => i.mistake)).toEqual(['skipped-start-pull', 'branch-behind-main', 'skipped-prepush-pull', 'pr-out-of-date'])
    expect(r.replay()[0]).toMatchObject({
      you: 'You started work without pulling the latest main.',
      result: expect.stringContaining('delivery fee'),
    })
    expect(types(r).filter((t) => t === 'mistake')).toHaveLength(4)
  })
})

describe('Level 1: other mistakes', () => {
  it('flags an unclear branch name and does not accept it for the step', () => {
    const r = newRunner()
    r.act({ type: 'chat', chatId: 'intro', replyId: 'ack' })
    r.act(git('git pull origin main'))
    r.act(git('git checkout -b my-branch'))
    expect(r.snapshot().mistakes.map((m) => m.id)).toEqual(['unclear-branch-name'])
    expect(r.currentStep()?.id).toBe('start-ticket') // still on the ticket step, ticket not moved
    r.act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' })
    expect(r.currentStep()?.id).toBe('create-branch') // the name is not good enough
    r.act(git(`git checkout -b ${BRANCH}`))
    expect(r.currentStep()?.id).toBe('edit-button')
  })

  it('flags committing on main and a vague message, and does not count the vague commit', () => {
    const r = newRunner()
    r.act(git('git pull origin main'))
    r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON })
    r.act(git('git commit -am "fix"'))
    expect(r.snapshot().mistakes.map((m) => m.id)).toEqual(['committed-on-main', 'vague-commit-message'])
  })

  it('flags pushing straight to main', () => {
    const r = newRunner()
    r.act(git('git pull origin main'))
    r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON })
    r.act(git('git commit -am "ORD-14 Rename checkout button"'))
    r.act({ type: 'syncCheck', phase: 'push', choice: 'ignore' })
    expect(r.act(git('git push origin main')).ok).toBe(true)
    expect(r.snapshot().mistakes.map((m) => m.id)).toContain('pushed-to-main')
    expect(r.replay().find((i) => i.mistake === 'pushed-to-main')?.result).toContain('code that nobody reviewed')
  })

  it('counts a repeated mistake once, with a count', () => {
    const r = newRunner()
    r.act({ type: 'chat', chatId: 'intro', replyId: 'ack' })
    r.act(git('git pull origin main'))
    r.act(git('git checkout -b one'))
    r.act(git('git checkout -b two'))
    expect(r.snapshot().mistakes).toEqual([{ id: 'unclear-branch-name', stepId: 'start-ticket', count: 2 }])
  })

  it('answers both chat choices and refuses a second answer', () => {
    const r = newRunner()
    const reply = r.act({ type: 'chat', chatId: 'intro', replyId: 'ask-main' })
    expect(reply.message).toContain('Work on your own branch')
    expect(r.act({ type: 'chat', chatId: 'intro', replyId: 'ack' }).ok).toBe(false)
    expect(r.act({ type: 'chat', chatId: 'intro', replyId: 'nope' }).ok).toBe(false)
    expect(r.act({ type: 'chat', chatId: 'missing', replyId: 'ack' }).ok).toBe(false)
  })

  it('carries on after the learner works slightly out of order', () => {
    const r = newRunner()
    r.act(git('git pull origin main')) // before the chat step is done
    r.act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' })
    r.act(git(`git checkout -b ${BRANCH}`))
    r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON })
    expect(r.currentStep()?.id).toBe('read-ticket-message')
    r.act({ type: 'chat', chatId: 'intro', replyId: 'ack' })
    // Everything already done is credited in one go.
    expect(r.currentStep()?.id).toBe('commit-change')
  })
})

describe('Level 1: failing tests, then a fix', () => {
  it('blocks the merge on red tests and unblocks it after a fixing push', () => {
    const r = newRunner()
    r.act({ type: 'chat', chatId: 'intro', replyId: 'ack' })
    r.act(git('git pull origin main'))
    r.act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' })
    r.act(git(`git checkout -b ${BRANCH}`))
    // First attempt uses the wrong wording, so the tests will fail.
    r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON.replace('Place order', 'Pay later') })
    r.act(git(`git commit -am "ORD-14 Try a different label"`))
    r.act(git('git pull origin main'))
    r.act(git(`git push -u origin ${BRANCH}`))
    r.act({ type: 'raisePr', title: TITLE })
    // The code step is not satisfied yet, so the runner waits there while the PR exists.
    expect(r.snapshot().currentStepId).toBe('edit-button')

    // Fix the file properly; the rest of the earlier steps are already satisfied.
    r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON })
    expect(r.snapshot().currentStepId).toBe('run-tests')
    expect(r.snapshot().lastTestReport?.passed).toBe(false)
    expect(r.snapshot().lastTestReport?.log.join('\n')).toContain('FAIL  CheckoutButton shows "Place order"')
    expect(r.snapshot().pullRequests[0].checks).toBe('failed')
    expect(r.act({ type: 'mergePr' })).toEqual({ ok: false, message: 'Merging is blocked: required checks have failed.' })
    const failure = r.log.find((e) => e.type === 'tests:run')
    expect(failure).toMatchObject({ passed: false })
    expect(r.log.find((e) => e.type === 'pipeline' && e.event.station === 'tests')).toMatchObject({ event: { status: 'fail' } })

    // Push the fix: checks restart on their own and pass.
    r.act(git('git commit -am "ORD-14 Use the Place order label"'))
    r.act(git('git pull origin main'))
    r.act(git(`git push origin ${BRANCH}`))
    expect(r.snapshot().pullRequests[0]).toMatchObject({ checks: 'passed', approved: true })
    expect(r.snapshot().currentStepId).toBe('merge-pr')
    expect(r.act({ type: 'mergePr' }).ok).toBe(true)
    expect(r.isFinished).toBe(true)
  })

  it('refuses to merge before there is a pull request', () => {
    const r = newRunner()
    expect(r.act({ type: 'mergePr' })).toEqual({ ok: false, message: 'There is no open pull request to merge.' })
  })

  it('refuses a pull request before the branch is pushed', () => {
    const r = newRunner()
    r.act(git('git pull origin main'))
    r.act(git(`git checkout -b ${BRANCH}`))
    r.act({ type: 'editFile', path: BUTTON, content: FIXED_BUTTON })
    r.act(git('git commit -am "ORD-14 Place order label"'))
    r.act(git('git pull origin main'))
    expect(r.act({ type: 'raisePr', title: TITLE }).message).toContain('Push your branch first')
  })
})

describe('Level 1: git terminal output through the runner', () => {
  it('returns real-looking output for the buttons and a mini terminal', () => {
    const r = newRunner()
    expect(r.act(git('git status')).message).toContain('behind')
    expect(r.act(git('git pull origin main')).message).toContain('Updating')
    expect(r.act(git('git status')).message).toContain('up to date')
    expect(r.act(git('git frobnicate')).ok).toBe(false)
  })
})
