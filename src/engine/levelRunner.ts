// Runs one level from its data file. It owns the simulators (Git, Jira, tests), takes
// the learner's actions, holds back the ones that need a Sync Check, notices mistakes,
// checks the current step's rule, and emits events for the UI and the 3D scene.
//
// Order does not have to be perfect: after every action the runner re-checks the
// current step against the real simulated state, so doing things slightly early is fine.
import { Emitter } from './events'
import { GitSim, type Files, type PullRequest } from './gitSim'
import { JiraSim } from './jiraSim'
import { runTests, type TestReport } from './testRunner'
import type {
  Action,
  ActionResult,
  EngineEvent,
  Level,
  MistakeId,
  MistakeRecord,
  ReplayItem,
  RuleCheck,
  Step,
  SyncState,
  Ticket,
  TicketStatus,
} from './types'

const MIN_COMMIT_MESSAGE = 8
const VAGUE_MESSAGES = new Set(['update', 'updates', 'fix', 'fixes', 'change', 'changes', 'wip', 'test', 'stuff', 'asdf', 'misc'])

export function isVagueCommitMessage(message: string): boolean {
  const text = message.trim().toLowerCase()
  return text.length < MIN_COMMIT_MESSAGE || VAGUE_MESSAGES.has(text)
}

export type RunnerSnapshot = {
  stepIndex: number
  currentStepId: string | null
  completedStepIds: string[]
  finished: boolean
  mistakes: MistakeRecord[]
  board: Record<TicketStatus, Ticket[]>
  git: { branch: string; branches: string[]; remoteBranches: string[]; files: Files; behindMain: number; conflicts: string[] }
  pullRequests: (PullRequest & { outOfDate: boolean; mergeable: boolean })[]
  lastTestReport: TestReport | null
  deployed: boolean
  sync: { start: SyncState; push: SyncState }
}

export type LevelResult = {
  levelId: number
  completedSteps: string[]
  autoFilledSteps: string[]
  mistakes: MistakeRecord[]
  replay: ReplayItem[]
}

export class LevelRunner {
  readonly events = new Emitter<EngineEvent>()
  // Every event so far, in order. Handy for tests and for Mistakes Replay.
  readonly log: EngineEvent[] = []
  readonly git: GitSim
  readonly jira: JiraSim

  private stepIndex = 0
  private completed: string[] = []
  private autoFilled = new Set<string>()
  private mistakes = new Map<MistakeId, MistakeRecord>()
  private sync: { start: SyncState; push: SyncState } = { start: null, push: null }
  private chatReplies = new Map<string, string>()
  private lastReport: TestReport | null = null
  private deployed = false
  private finished = false
  private readonly branchPattern: RegExp | null

  constructor(readonly level: Level) {
    this.git = new GitSim(level.scenario.files, { emit: (e) => this.emit(e) })
    this.jira = new JiraSim([level.scenario.ticket, ...(level.scenario.otherTickets ?? [])], (e) => this.emit(e))

    const naming = level.steps.map((s) => s.check).find((c): c is Extract<RuleCheck, { type: 'branchNamed' }> => c?.type === 'branchNamed')
    this.branchPattern = naming ? new RegExp(naming.pattern, naming.flags) : null

    for (const commit of level.scenario.remoteCommits ?? []) {
      this.git.pushTeammateCommit(commit.branch, commit.changes, commit.message, commit.author)
    }
    this.log.length = 0 // setup is not part of the learner's run

    this.announceStep()
    this.settle()
  }

  // ---- reading ---------------------------------------------------------------

  get isFinished(): boolean {
    return this.finished
  }

  currentStep(): Step | null {
    return this.finished ? null : this.level.steps[this.stepIndex]
  }

  snapshot(): RunnerSnapshot {
    return {
      stepIndex: this.stepIndex,
      currentStepId: this.currentStep()?.id ?? null,
      completedStepIds: [...this.completed],
      finished: this.finished,
      mistakes: [...this.mistakes.values()].map((m) => ({ ...m })),
      board: this.jira.board(),
      git: {
        branch: this.git.currentBranch(),
        branches: this.git.branches(),
        remoteBranches: this.git.remoteBranches(),
        files: this.git.files(),
        behindMain: this.git.behindBy(this.git.currentBranch()),
        conflicts: this.git.conflictedFiles(),
      },
      pullRequests: this.git.pullRequests().map((pr) => {
        const status = this.git.prStatus(pr.id)
        return { ...pr, outOfDate: status?.outOfDate ?? false, mergeable: status?.mergeable ?? true }
      }),
      lastTestReport: this.lastReport,
      deployed: this.deployed,
      sync: { ...this.sync },
    }
  }

  // What went wrong and what it would have caused, for the Mistakes Replay popup.
  replay(): ReplayItem[] {
    const items: ReplayItem[] = []
    for (const record of this.mistakes.values()) {
      const rule = this.level.replay.find((r) => r.mistake === record.id)
      if (rule) items.push({ mistake: record.id, you: rule.you, result: rule.result, count: record.count })
    }
    return items
  }

  result(): LevelResult {
    return {
      levelId: this.level.id,
      completedSteps: [...this.completed],
      autoFilledSteps: [...this.autoFilled],
      mistakes: [...this.mistakes.values()].map((m) => ({ ...m })),
      replay: this.replay(),
    }
  }

  // ---- acting ----------------------------------------------------------------

  act(action: Action): ActionResult {
    if (this.finished) return { ok: false, message: 'This level is complete.' }
    const result = this.apply(action)
    this.settle()
    return result
  }

  private apply(action: Action): ActionResult {
    switch (action.type) {
      case 'git':
        return this.applyGit(action.command)
      case 'editFile':
        this.git.editFile(action.path, action.content)
        return { ok: true, message: `Saved ${action.path}` }
      case 'moveTicket': {
        if (action.to === 'inprogress' && this.sync.start === null) return { ok: false, message: 'Pull the latest main before you start.', gate: 'start-pull' }
        const moved = this.jira.move(action.ticketId, action.to)
        return moved.ok ? { ok: true, message: `${action.ticketId} moved.` } : { ok: false, message: moved.error }
      }
      case 'chat':
        return this.applyChat(action.chatId, action.replyId)
      case 'syncCheck':
        return this.applySyncCheck(action.phase, action.choice)
      case 'raisePr':
        return this.applyRaisePr(action.title)
      case 'mergePr':
        return this.applyMergePr()
      case 'autoFill':
        return this.applyAutoFill()
    }
  }

  private applyGit(command: string): ActionResult {
    const kind = GitSim.classify(command)
    if (kind === 'create-branch' && this.sync.start === null) return { ok: false, message: 'Pull the latest main before you start.', gate: 'start-pull' }
    if (kind === 'push' && this.sync.push === null) return { ok: false, message: 'Pull before you push, in case a teammate changed something.', gate: 'pre-push' }

    const result = this.git.exec(command)
    if (result.ok) {
      if (kind === 'pull') this.markPulled('pulled')
      if (kind === 'commit') this.sync.push = null // a new commit means pulling again before the next push
      if (kind === 'push') this.git.resetPrForNewCommits(this.git.currentBranch())
    }
    return { ok: result.ok, message: result.output }
  }

  // A successful pull satisfies the start check, and the push check once you have commits.
  private markPulled(how: Exclude<SyncState, null>): void {
    if (this.sync.start === null) {
      this.sync.start = how
      this.emit({ type: 'sync:resolved', phase: 'start', how })
    }
    if (this.sync.push === null && this.git.ownCommits().length > 0) {
      this.sync.push = how
      this.emit({ type: 'sync:resolved', phase: 'push', how })
    }
  }

  private applySyncCheck(phase: 'start' | 'push', choice: 'auto' | 'ignore', command = 'git pull origin main'): ActionResult {
    if (choice === 'ignore') {
      this.sync[phase] = 'ignored'
      this.emit({ type: 'sync:resolved', phase, how: 'ignored' })
      this.recordMistake(phase === 'start' ? 'skipped-start-pull' : 'skipped-prepush-pull')
      return { ok: true, message: phase === 'start' ? 'Continuing without pulling.' : 'Continuing without pulling before the push.' }
    }
    const result = this.git.exec(command)
    if (result.ok) {
      this.markPulled('auto')
      // The phase being asked for must end up resolved, even if no commit exists yet.
      if (this.sync[phase] === null) {
        this.sync[phase] = 'auto'
        this.emit({ type: 'sync:resolved', phase, how: 'auto' })
      }
    }
    return { ok: result.ok, message: result.output }
  }

  private applyChat(chatId: string, replyId: string): ActionResult {
    const chat = this.level.steps.map((s) => s.chat).find((c) => c?.id === chatId)
    if (!chat) return { ok: false, message: `There is no conversation ${chatId}.` }
    const reply = chat.replies.find((r) => r.id === replyId)
    if (!reply) return { ok: false, message: 'That reply is not one of the choices.' }
    if (this.chatReplies.has(chatId)) return { ok: false, message: 'You already answered this message.' }
    this.chatReplies.set(chatId, replyId)
    this.emit({ type: 'chat:reply', chatId, replyId, response: reply.response })
    return { ok: true, message: reply.response }
  }

  private applyRaisePr(title: string): ActionResult {
    if (this.sync.push === null) return { ok: false, message: 'Pull before you raise the pull request, in case main has moved.', gate: 'pre-push' }
    const result = this.git.openPullRequest(this.git.currentBranch(), title)
    return { ok: result.ok, message: result.message }
  }

  private applyMergePr(): ActionResult {
    const pr = this.currentPr()
    if (!pr || pr.status !== 'open') return { ok: false, message: 'There is no open pull request to merge.' }
    if (pr.checks === 'pending') return { ok: false, message: 'Merging is blocked: checks are still running.' }
    if (pr.checks === 'failed') return { ok: false, message: 'Merging is blocked: required checks have failed.' }
    if (!pr.approved) return { ok: false, message: 'Merging is blocked: this pull request needs an approving review.' }
    return this.git.mergePullRequest(pr.id)
  }

  // Skip & Auto-Fill: do the current step for the learner, using the step's autoFill data.
  private applyAutoFill(): ActionResult {
    const step = this.currentStep()
    if (!step) return { ok: false, message: 'This level is complete.' }
    if (step.auto || !step.autoFill) return { ok: false, message: 'Nothing to fill in. This step runs on its own.' }
    this.autoFilled.add(step.id)
    const fill = step.autoFill
    const check = step.check

    switch (step.kind) {
      case 'chat':
        return this.applyChat(step.chat!.id, fill)
      case 'board':
        return this.apply({ type: 'moveTicket', ticketId: (check as { ticketId: string }).ticketId, to: fill as TicketStatus })
      case 'code':
        return this.apply({ type: 'editFile', path: (check as { path: string }).path, content: fill })
      case 'git': {
        const outputs: string[] = []
        for (const line of fill.split('\n').filter(Boolean)) {
          const command = line.replaceAll('{branch}', this.git.currentBranch())
          const result = this.applyGit(command)
          outputs.push(`$ ${command}`, result.message)
          if (!result.ok) return { ...result, message: outputs.join('\n') }
        }
        return { ok: true, message: outputs.join('\n') }
      }
      case 'syncCheck':
        return this.applySyncCheck((check as { phase: 'start' | 'push' }).phase, 'auto', fill)
      case 'pr':
        return check?.type === 'prMerged' ? this.applyMergePr() : this.apply({ type: 'raisePr', title: fill })
      default:
        return { ok: false, message: 'Nothing to fill in for this step.' }
    }
  }

  // ---- steps -----------------------------------------------------------------

  // After any action: perform engine-owned steps whose conditions are met, and move
  // past every step whose rule is already satisfied.
  private settle(): void {
    let moved = true
    while (moved && !this.finished) {
      moved = false
      const step = this.level.steps[this.stepIndex]
      if (step.auto) this.runAuto(step)
      if (step.check && this.evaluate(step.check)) {
        this.completeStep(step)
        moved = true
      }
    }
  }

  private completeStep(step: Step): void {
    this.completed.push(step.id)
    this.emit({ type: 'step:complete', stepId: step.id, index: this.stepIndex, autoFilled: this.autoFilled.has(step.id) })
    if (step.stationEvent) this.emit({ type: 'pipeline', event: step.stationEvent })
    this.stepIndex++
    if (this.stepIndex >= this.level.steps.length) {
      this.finished = true
      this.emit({ type: 'level:complete', levelId: this.level.id })
    } else {
      this.announceStep()
    }
  }

  private announceStep(): void {
    this.emit({ type: 'step:active', stepId: this.level.steps[this.stepIndex].id, index: this.stepIndex })
  }

  private runAuto(step: Step): void {
    const pr = this.currentPr()
    if (!pr) return
    switch (step.auto!.type) {
      case 'runTests':
        if (pr.status === 'open' && pr.checks === 'pending') this.runChecks(pr)
        break
      case 'approvePr':
        if (pr.status === 'open' && pr.checks === 'passed' && !pr.approved) this.git.approvePullRequest(pr.id)
        break
      case 'deploy':
        if (pr.status === 'merged' && !this.deployed) {
          this.deployed = true
          this.emit({ type: 'release:deployed' })
        }
        break
    }
  }

  private runChecks(pr: PullRequest): void {
    const report = runTests(this.git.remoteFiles(pr.head), this.level.tests)
    this.lastReport = report
    this.git.setPrChecks(pr.id, report.passed ? 'passed' : 'failed')
    this.emit({ type: 'tests:run', prId: pr.id, passed: report.passed, report })
    this.emit({ type: 'pipeline', event: { station: 'tests', status: report.passed ? 'pass' : 'fail', packageFrom: 'github' } })
  }

  private currentPr(): PullRequest | undefined {
    const all = this.git.pullRequests()
    return [...all].reverse().find((p) => p.head === this.git.currentBranch()) ?? all[all.length - 1]
  }

  private evaluate(check: RuleCheck): boolean {
    switch (check.type) {
      case 'ticketStatus':
        return this.jira.get(check.ticketId)?.status === check.status
      case 'branchNamed':
        return new RegExp(check.pattern, check.flags).test(this.git.currentBranch())
      case 'fileContains': {
        const content = this.git.readFile(check.path)
        if (content === undefined) return false
        return (check.includes === undefined || content.includes(check.includes)) && (check.excludes === undefined || !content.includes(check.excludes))
      }
      case 'branchHasCommit':
        return this.git.ownCommits().filter((c) => !isVagueCommitMessage(c.message)).length >= (check.minCount ?? 1)
      case 'syncResolved':
        return this.sync[check.phase] !== null
      case 'pushed': {
        const branch = this.git.currentBranch()
        return branch !== 'main' && this.git.remoteTip(branch) === this.git.localTip(branch)
      }
      case 'prRaised':
        return this.git.pullRequests().length > 0
      case 'testsPassed':
        return this.git.pullRequests().some((p) => p.checks === 'passed')
      case 'prApproved':
        return this.git.pullRequests().some((p) => p.approved)
      case 'prMerged':
        return this.git.pullRequests().some((p) => p.status === 'merged')
      case 'deployed':
        return this.deployed
      case 'chatDone':
        return this.chatReplies.has(check.chatId)
    }
  }

  // ---- events and mistakes ----------------------------------------------------

  private emit(event: EngineEvent): void {
    this.log.push(event)
    this.detectMistakes(event)
    this.events.emit(event)
  }

  private detectMistakes(event: EngineEvent): void {
    switch (event.type) {
      case 'git:branch-created':
        if (this.branchPattern && !this.branchPattern.test(event.branch)) this.recordMistake('unclear-branch-name')
        if (this.git.behindBy(event.branch) > 0) this.recordMistake('branch-behind-main')
        break
      case 'git:commit':
        if (event.branch === 'main') this.recordMistake('committed-on-main')
        if (isVagueCommitMessage(event.message)) this.recordMistake('vague-commit-message')
        break
      case 'git:push':
        if (event.branch === 'main' && event.result === 'ok') this.recordMistake('pushed-to-main')
        break
      case 'github:pr-opened':
        if (this.git.behindBy(event.pr.head) > 0) this.recordMistake('pr-out-of-date')
        break
    }
  }

  private recordMistake(id: MistakeId): void {
    const stepId = this.currentStep()?.id ?? null
    const existing = this.mistakes.get(id)
    if (existing) existing.count++
    else this.mistakes.set(id, { id, stepId, count: 1 })
    this.log.push({ type: 'mistake', id, stepId })
    this.events.emit({ type: 'mistake', id, stepId })
  }
}
