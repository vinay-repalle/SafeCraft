// Shared shapes for the simulation engine and the level data files.
// The PRD (section 9) gives the core Level and Step shapes; fields marked
// "added in Phase 2" extend them so a level stays 100% data-driven.
import type { Role } from '../store/types'
import type { GitEvent } from './gitSim'
import type { JiraEvent } from './jiraSim'
import type { TestCase, TestReport } from './testRunner'

export type SimFile = { path: string; content: string }

export type TicketStatus = 'todo' | 'inprogress' | 'review' | 'done'

export type Ticket = {
  id: string
  title: string
  description: string
  status: TicketStatus
  assignee: Role | null
  type: 'story' | 'bug' | 'task'
}

// The stations of the 3D diorama, in the order work travels through them.
export const STATIONS = ['client', 'pm', 'dev', 'github', 'tests', 'live'] as const
export type Station = (typeof STATIONS)[number]

// Drives the 3D scene: light a station, optionally moving the package from another.
export type PipelineEvent = { station: Station; status: 'active' | 'pass' | 'fail'; packageFrom?: Station }

export const STEP_KINDS = ['chat', 'board', 'code', 'git', 'syncCheck', 'pr', 'tests', 'review', 'deploy'] as const
export type StepKind = (typeof STEP_KINDS)[number]

// Things that can go wrong, in the learner's terms. Each one a level can trigger needs
// a ReplayRule that says what it would have caused on a real team.
// The engine notices these in every level, so every level must explain them in its replay.
export const GENERAL_MISTAKE_IDS = [
  'skipped-start-pull',
  'branch-behind-main',
  'unclear-branch-name',
  'committed-on-main',
  'vague-commit-message',
  'skipped-prepush-pull',
  'pushed-to-main',
  'pr-out-of-date',
] as const
// Added in Phase 5. A chat reply can trigger these (`mistake` on the reply), and the engine
// notices committed-conflict-markers itself. A level only needs a replay rule for the ones
// it can actually trigger.
export const LEVEL_MISTAKE_IDS = [
  'unagreed-contract',
  'ignored-failing-tests',
  'dismissed-review',
  'overwrote-teammate',
  'committed-conflict-markers',
] as const
export const MISTAKE_IDS = [...GENERAL_MISTAKE_IDS, ...LEVEL_MISTAKE_IDS] as const
export type MistakeId = (typeof MISTAKE_IDS)[number]

// Client-side validator: "is this step done?" answered purely from simulated state.
export type RuleCheck =
  | { type: 'ticketStatus'; ticketId: string; status: TicketStatus }
  | { type: 'branchNamed'; pattern: string; flags?: string }
  | { type: 'fileContains'; path: string; includes?: string; excludes?: string }
  | { type: 'branchHasCommit'; minCount?: number }
  | { type: 'syncResolved'; phase: 'start' | 'push' }
  | { type: 'pushed' }
  | { type: 'prRaised' }
  | { type: 'testsPassed' }
  | { type: 'prApproved' }
  | { type: 'prMerged' }
  | { type: 'deployed' }
  | { type: 'chatDone'; chatId: string }
  // Added in Phase 5.
  | { type: 'testsRan' } // the automated tests have run at least once, pass or fail
  | { type: 'conflict' } // a merge has stopped on conflicts
  | { type: 'conflictResolved' } // no merge is waiting to be finished

// Steps performed by the engine on behalf of observe-only roles (CI, reviewer, CD).
export type AutoAction = { type: 'runTests' } | { type: 'approvePr' } | { type: 'deploy' }

// Added in Phase 2: a scripted teammate message with multiple-choice replies.
export type ChatScript = {
  id: string
  from: { name: string; role: Role }
  message: string
  // `mistake` (added in Phase 5): choosing this reply counts as that mistake in Mistakes Replay.
  replies: { id: string; text: string; response: string; mistake?: MistakeId }[]
}

// Added in Phase 5: things a teammate or the project manager does right after a step
// completes, so a level can change under the learner's feet.
export type StepAfter = {
  remoteCommit?: RemoteCommit // a teammate pushes to origin
  ticketUpdate?: { ticketId: string; title?: string; description?: string } // the project manager edits a ticket
}

export type Step = {
  id: string
  role: Role
  kind: StepKind
  prompt: string
  check?: RuleCheck
  // Used by Skip & Auto-Fill. What it means depends on the step kind:
  //   chat      the reply id to choose
  //   board     the status to move the check's ticket to
  //   code      the full new content for the check's file
  //   git       one or more commands, one per line ("{branch}" = current branch)
  //   syncCheck the pull command to run
  //   pr        the pull request title
  autoFill?: string
  terms?: string[] // jargon ids shown here
  stationEvent?: PipelineEvent // fired when the step completes
  chat?: ChatScript // added in Phase 2
  auto?: AutoAction // added in Phase 2: the engine does this step itself
  hint?: string // added in Phase 2: text behind the Hint button
  after?: StepAfter // added in Phase 5
}

// What to tell the learner afterwards: this mistake => this real-world result.
export type ReplayRule = { mistake: MistakeId; you: string; result: string }

// Teammate commits already on origin/main when the level starts, so the learner's
// local copy begins out of date and "pull before you start" actually matters.
export type RemoteCommit = {
  author: string
  role?: Role // added in Phase 5: which role the teammate has, for Team view. Defaults to the learner's opposite.
  message: string
  branch: string
  changes: Record<string, string | null> // path -> new content, null deletes
}

export type Level = {
  id: number
  // Added in Phase 5: whose seat the learner sits in. Each level has a frontend and a backend
  // version, written as two files. Defaults to 'frontend'.
  perspective?: Role
  title: string
  whyItExists: string
  recap: string
  scenario: {
    app: string
    ticket: Ticket
    otherTickets?: Ticket[] // added in Phase 2: the rest of the board
    files: SimFile[]
    remoteCommits?: RemoteCommit[] // added in Phase 2
  }
  tests: TestCase[] // added in Phase 2: the rule-based "unit tests" for this level
  steps: Step[]
  replay: ReplayRule[]
}

export type SyncState = null | 'pulled' | 'auto' | 'ignored'

// Everything the learner can do. Each Git button and the mini terminal both send
// { type: 'git', command } so the real command is always what runs.
export type Action =
  | { type: 'git'; command: string }
  | { type: 'editFile'; path: string; content: string }
  | { type: 'moveTicket'; ticketId: string; to: TicketStatus }
  | { type: 'chat'; chatId: string; replyId: string }
  | { type: 'syncCheck'; phase: 'start' | 'push'; choice: 'auto' | 'ignore' }
  | { type: 'raisePr'; title: string }
  | { type: 'mergePr' }
  | { type: 'autoFill' }

export type ActionResult = {
  ok: boolean
  message: string // text to show: terminal output, a teammate reply, or an error
  // Set when the action was held back and the Sync Check popup should appear.
  gate?: 'start-pull' | 'pre-push'
}

export type MistakeRecord = { id: MistakeId; stepId: string | null; count: number }
export type ReplayItem = { mistake: MistakeId; you: string; result: string; count: number }

// Everything the UI and the 3D scene can hear about.
export type EngineEvent =
  | GitEvent
  | JiraEvent
  | { type: 'tests:run'; prId: number; passed: boolean; report: TestReport }
  | { type: 'chat:reply'; chatId: string; replyId: string; response: string }
  | { type: 'sync:resolved'; phase: 'start' | 'push'; how: Exclude<SyncState, null> }
  | { type: 'pipeline'; event: PipelineEvent }
  | { type: 'mistake'; id: MistakeId; stepId: string | null }
  | { type: 'step:active'; stepId: string; index: number }
  | { type: 'step:complete'; stepId: string; index: number; autoFilled: boolean }
  | { type: 'release:deployed' }
  | { type: 'level:complete'; levelId: number }
