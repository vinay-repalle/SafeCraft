// A "linter" for level data files. Adding a level means writing JSON, so this catches
// typos (a wrong ticket id, a missing autoFill, an unknown term) before a learner does.
// It returns a list of problems in plain English; an empty list means the level is sound.
import { ROLES } from '../store/types'
import { GENERAL_MISTAKE_IDS, MISTAKE_IDS, STATIONS, STEP_KINDS, type Level, type RuleCheck, type Step } from './types'

const CHECK_TYPES: RuleCheck['type'][] = [
  'ticketStatus', 'branchNamed', 'fileContains', 'branchHasCommit', 'syncResolved', 'pushed',
  'prRaised', 'testsPassed', 'prApproved', 'prMerged', 'deployed', 'chatDone', 'testsRan', 'conflict', 'conflictResolved',
]
const STATUSES = ['todo', 'inprogress', 'review', 'done']
// Kinds whose steps are done by the learner and so must offer Skip & Auto-Fill.
const NEEDS_AUTOFILL = ['chat', 'board', 'code', 'git', 'syncCheck', 'pr']

export function validateLevel(level: Level, knownTermIds: Set<string>): string[] {
  const problems: string[] = []
  const at = (step: Step, text: string) => problems.push(`Step "${step.id}": ${text}`)

  if (!level.title || !level.whyItExists || !level.recap) problems.push('Level needs a title, whyItExists and recap.')

  const paths = new Set(level.scenario.files.map((f) => f.path))
  const tickets = [level.scenario.ticket, ...(level.scenario.otherTickets ?? [])]
  const ticketIds = new Set(tickets.map((t) => t.id))
  if (ticketIds.size !== tickets.length) problems.push('Ticket ids must be unique.')
  for (const t of tickets) if (!STATUSES.includes(t.status)) problems.push(`Ticket ${t.id} has an unknown status "${t.status}".`)
  if (paths.size !== level.scenario.files.length) problems.push('File paths must be unique.')

  const checkRemoteCommit = (commit: { message: string; changes: Record<string, string | null> }) => {
    for (const path of Object.keys(commit.changes)) {
      if (!paths.has(path)) problems.push(`Remote commit "${commit.message}" changes ${path}, which is not a scenario file.`)
    }
  }
  for (const commit of level.scenario.remoteCommits ?? []) checkRemoteCommit(commit)
  for (const step of level.steps) if (step.after?.remoteCommit) checkRemoteCommit(step.after.remoteCommit)
  if (level.perspective && !['frontend', 'backend'].includes(level.perspective)) problems.push('Only frontend and backend levels can be played in v1.')

  const testIds = new Set<string>()
  for (const test of level.tests) {
    if (testIds.has(test.id)) problems.push(`Duplicate test id "${test.id}".`)
    testIds.add(test.id)
    if (!paths.has(test.rule.path)) problems.push(`Test "${test.id}" refers to ${test.rule.path}, which is not a scenario file.`)
  }

  const stepIds = new Set<string>()
  const usedMistakes = new Set<string>(GENERAL_MISTAKE_IDS) // every level can trigger these; others only if a reply does
  const chatIds = new Set(level.steps.flatMap((s) => (s.chat ? [s.chat.id] : [])))
  if (level.steps.length === 0) problems.push('Level has no steps.')

  for (const step of level.steps) {
    if (stepIds.has(step.id)) at(step, 'duplicate step id.')
    stepIds.add(step.id)
    if (!ROLES.includes(step.role)) at(step, `unknown role "${step.role}".`)
    if (!STEP_KINDS.includes(step.kind)) at(step, `unknown kind "${step.kind}".`)
    if (!step.prompt) at(step, 'needs a prompt.')
    if (!step.check) at(step, 'needs a check, or the step can never complete.')
    if (step.check && !CHECK_TYPES.includes(step.check.type)) at(step, `unknown check type "${step.check.type}".`)

    if (step.auto) {
      if (step.autoFill) at(step, 'is run by the engine, so it should not have autoFill.')
    } else if (NEEDS_AUTOFILL.includes(step.kind) && !step.autoFill) {
      at(step, 'needs autoFill so Skip & Auto-Fill works.')
    }

    const check = step.check
    if (check?.type === 'ticketStatus') {
      if (!ticketIds.has(check.ticketId)) at(step, `check refers to unknown ticket ${check.ticketId}.`)
      if (!STATUSES.includes(check.status)) at(step, `check has unknown status "${check.status}".`)
    }
    if (check?.type === 'fileContains' && !paths.has(check.path)) at(step, `check refers to ${check.path}, which is not a scenario file.`)
    if (check?.type === 'branchNamed') {
      try {
        new RegExp(check.pattern, check.flags)
      } catch {
        at(step, 'branch name pattern is not a valid expression.')
      }
    }
    if (step.after?.ticketUpdate && !ticketIds.has(step.after.ticketUpdate.ticketId)) at(step, `after refers to unknown ticket ${step.after.ticketUpdate.ticketId}.`)
    if (check?.type === 'chatDone' && !chatIds.has(check.chatId)) at(step, `check refers to unknown chat ${check.chatId}.`)

    if (step.kind === 'chat') {
      if (!step.chat) at(step, 'chat steps need a chat script.')
      else {
        if (step.chat.replies.length < 2) at(step, 'chat needs at least two replies to choose from.')
        if (step.autoFill && !step.chat.replies.some((r) => r.id === step.autoFill)) at(step, 'autoFill is not one of the chat reply ids.')
        if (check?.type !== 'chatDone' || check.chatId !== step.chat.id) at(step, 'chat steps should check chatDone for their own chat id.')
        for (const reply of step.chat.replies) {
          if (reply.mistake && !MISTAKE_IDS.includes(reply.mistake)) at(step, `reply "${reply.id}" refers to unknown mistake "${reply.mistake}".`)
          if (reply.mistake) usedMistakes.add(reply.mistake)
        }
      }
    }
    if (step.kind === 'board' && step.autoFill && !STATUSES.includes(step.autoFill)) at(step, 'autoFill must be a ticket status.')
    if (step.kind === 'code' && check?.type !== 'fileContains') at(step, 'code steps need a fileContains check.')
    if (step.kind === 'board' && check?.type !== 'ticketStatus') at(step, 'board steps need a ticketStatus check.')
    if (step.kind === 'syncCheck' && check?.type !== 'syncResolved') at(step, 'syncCheck steps need a syncResolved check.')

    if (step.stationEvent) {
      if (!STATIONS.includes(step.stationEvent.station)) at(step, `unknown station "${step.stationEvent.station}".`)
      const from = step.stationEvent.packageFrom
      if (from && !STATIONS.includes(from)) at(step, `unknown station "${from}".`)
    }
    for (const term of step.terms ?? []) if (!knownTermIds.has(term)) at(step, `unknown jargon term "${term}".`)
  }

  const replayed = new Set<string>()
  for (const rule of level.replay) {
    if (!MISTAKE_IDS.includes(rule.mistake)) problems.push(`Replay refers to unknown mistake "${rule.mistake}".`)
    if (replayed.has(rule.mistake)) problems.push(`Replay has two rules for "${rule.mistake}".`)
    replayed.add(rule.mistake)
    if (!rule.you || !rule.result) problems.push(`Replay rule "${rule.mistake}" needs both "you" and "result".`)
  }
  if (level.steps.some((s) => s.check?.type === 'conflict')) usedMistakes.add('committed-conflict-markers')
  for (const id of MISTAKE_IDS) {
    if (usedMistakes.has(id) && !replayed.has(id)) problems.push(`No replay rule for mistake "${id}". Add one, or the learner sees nothing.`)
  }
  return problems
}
