// Phase 9: "where do I act next?"
//
// Every learner step already says how the game checks it (`step.check`). That is enough to name
// the one control the learner should use: the Create branch button, the ORD-14 ticket's arrow,
// the code editor, and so on. The screen draws a dashed outline around that control (the
// "spotlight") and the step card names it in words, with a "Show me" button that jumps to it.
//
// This file is plain logic, with no React, so it can be tested on its own.
import type { LevelRunner } from '../engine/levelRunner'
import { hasConflictMarkers } from '../engine/conflictResolve'
import type { Step, TicketStatus } from '../engine/types'

export type GitTool = 'branch' | 'commit' | 'pull' | 'push' | 'pr'

export type NextAction =
  | { kind: 'chat' }
  | { kind: 'ticket'; ticketId: string; to: TicketStatus }
  | { kind: 'editor' }
  | { kind: 'git'; tool: GitTool }
  | { kind: 'merge' }

// Where each action lives in My view. Task: board and chat. Code: step card, editor, Git, output.
export type Zone = 'task' | 'code' | 'pipeline'

// Facts about the learner's copy of the code that a step's check alone does not tell us.
export type RepoFacts = {
  merging: boolean // a pull stopped on a conflict and is waiting to be finished
  markersLeft: boolean // a conflicted file still has <<<<<<< markers in it
  uncommitted: boolean // the working files differ from the last commit
  unpushed: boolean // the branch has commits that GitHub does not have yet
}

export function repoFacts(runner: LevelRunner): RepoFacts {
  const git = runner.git
  const files = git.files()
  const committed = git.headCommit().files
  const paths = new Set([...Object.keys(files), ...Object.keys(committed)])
  const branch = git.currentBranch()
  return {
    merging: git.isMerging(),
    markersLeft: git.conflictedFiles().some((p) => hasConflictMarkers(files[p] ?? '')),
    uncommitted: [...paths].some((p) => files[p] !== committed[p]),
    unpushed: git.localTip(branch) !== git.remoteTip(branch),
  }
}

// The one place to act now, or null when there is nothing for the learner to do (a step that
// runs on its own, or the level is finished).
export function nextAction(step: Step | null, repo: RepoFacts, testsFailed: boolean): NextAction | null {
  if (!step) return null

  // A merge waiting to be finished comes first, whatever the step says: fix the file, then commit.
  if (repo.merging) return repo.markersLeft ? { kind: 'editor' } : { kind: 'git', tool: 'commit' }

  if (step.auto) {
    // Tests that ran on their own and failed: fix the code, commit, push. They then run again.
    if (step.auto.type === 'runTests' && testsFailed) {
      if (repo.uncommitted) return { kind: 'git', tool: 'commit' }
      if (repo.unpushed) return { kind: 'git', tool: 'push' }
      return { kind: 'editor' }
    }
    return null
  }

  const check = step.check
  switch (check?.type) {
    case 'chatDone':
      return { kind: 'chat' }
    case 'ticketStatus':
      return { kind: 'ticket', ticketId: check.ticketId, to: check.status }
    case 'branchNamed':
      return { kind: 'git', tool: 'branch' }
    case 'fileContains':
      return { kind: 'editor' }
    case 'branchHasCommit':
    case 'conflictResolved':
      return { kind: 'git', tool: 'commit' }
    case 'syncResolved':
    case 'conflict':
      return { kind: 'git', tool: 'pull' }
    case 'pushed':
      return { kind: 'git', tool: 'push' }
    case 'prRaised':
      return { kind: 'git', tool: 'pr' }
    case 'prMerged':
      return { kind: 'merge' }
  }
  // A step with a chat script but some other check is still answered in the chat.
  return step.chat ? { kind: 'chat' } : null
}

export function nextActionFor(runner: LevelRunner | null): NextAction | null {
  if (!runner) return null
  const report = runner.snapshot().lastTestReport
  return nextAction(runner.currentStep(), repoFacts(runner), report !== null && !report.passed)
}

export function zoneOf(action: NextAction): Zone {
  return action.kind === 'chat' || action.kind === 'ticket' ? 'task' : 'code'
}

const TOOL_LABEL: Record<GitTool, string> = {
  branch: 'Create branch',
  commit: 'Commit',
  pull: 'Pull',
  push: 'Push',
  pr: 'Raise PR',
}

export const gitToolLabel = (tool: GitTool) => TOOL_LABEL[tool]

// The control in words, for the step card. Colour and outline are never the only signal.
export function describeAction(action: NextAction, statusLabel: (s: TicketStatus) => string): string {
  switch (action.kind) {
    case 'chat':
      return 'Choose a reply in Team chat'
    case 'ticket':
      return `Move ${action.ticketId} to ${statusLabel(action.to)} on the board`
    case 'editor':
      return 'Edit the code in the editor'
    case 'git':
      return `Use the ${TOOL_LABEL[action.tool]} button`
    case 'merge':
      return 'Merge the pull request on the Pull request tab'
  }
}
