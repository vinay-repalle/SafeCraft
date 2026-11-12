// What Team view shows: for each role, what it is doing right now and what it has heard.
//
// Both functions are "pure": they only read what they are given and return a result, with
// no React and no store. That makes them easy to test, and it keeps the engine free of
// anything to do with screens.
import { ROLE_INFO } from '../app/nav'
import { COLUMNS } from '../engine/jiraSim'
import type { EngineEvent, Level, Step, StepKind } from '../engine/types'
import { ROLES, type Role } from './types'

export type FeedItem = {
  id: number
  actor: Role // who did it
  notifies: Role[] // who needs to hear about it (the ripple)
  text: string
}

export const roleLabel = (role: Role): string => ROLE_INFO.find((r) => r.id === role)?.label ?? role

const STATUS_LABEL = Object.fromEntries(COLUMNS.map((c) => [c.id, c.label]))

// Turns one engine event into a line for the team feed, or null when it is not worth a line.
// `actor` is whoever owns the step that was current when the event fired: the learner's
// own role for their actions, or the observe-only role for steps the engine performs.
export function describeEvent(event: EngineEvent, actor: Role, teammate: Role = 'backend'): Omit<FeedItem, 'id'> | null {
  switch (event.type) {
    case 'chat:reply':
      return { actor, notifies: [], text: 'Replied in the team chat' }
    case 'jira:ticket-moved':
      return { actor, notifies: ['pm'], text: `Moved ${event.ticketId} to ${STATUS_LABEL[event.to]}` }
    case 'git:branch-created':
      return { actor, notifies: [], text: `Created branch ${event.branch}` }
    case 'git:commit':
      return { actor, notifies: [], text: `Committed: ${event.message}` }
    case 'git:pull':
      return { actor, notifies: [], text: event.result === 'conflict' ? `Pull from ${event.remoteBranch} hit a conflict` : `Pulled ${event.remoteBranch}` }
    case 'git:push':
      if (event.result === 'rejected') return { actor, notifies: [], text: `Push of ${event.branch} was rejected` }
      return { actor, notifies: ['reviewer', 'qa'], text: `Pushed ${event.branch} to GitHub` }
    case 'git:remote-commit':
      return { actor: teammate, notifies: teammate === actor ? [] : [actor], text: `Pushed to ${event.branch}: ${event.message}` }
    case 'jira:ticket-updated':
      return { actor: 'pm', notifies: ['frontend', 'backend', 'qa'], text: `Changed the requirement on ${event.ticketId}` }
    case 'github:pr-opened':
      return { actor, notifies: ['reviewer', 'qa'], text: `Raised pull request #${event.pr.id}` }
    case 'tests:run':
      return { actor: 'qa', notifies: ['frontend', 'reviewer'], text: `Tests ${event.passed ? 'passed' : 'failed'} on pull request #${event.prId}` }
    case 'github:pr-approved':
      return { actor: 'reviewer', notifies: ['frontend'], text: `Approved pull request #${event.prId}` }
    case 'github:pr-merged':
      return { actor, notifies: ['pm', 'qa'], text: `Merged pull request #${event.pr.id} into main` }
    case 'release:deployed':
      return { actor: 'pm', notifies: ['frontend', 'backend', 'qa', 'reviewer'], text: 'Released to customers' }
    default:
      return null
  }
}

export type RoleState = 'active' | 'automatic' | 'waiting' | 'done' | 'uninvolved'
export type RoleStatus = { state: RoleState; headline: string; detail: string }

const KIND_LABEL: Record<StepKind, string> = {
  chat: 'Reply in the team chat',
  board: 'Move a ticket on the board',
  code: 'Edit the code',
  git: 'Run a Git command',
  syncCheck: 'Pull the latest code',
  pr: 'Work on the pull request',
  tests: 'Run the tests',
  review: 'Review the change',
  deploy: 'Release to customers',
}

// Everyone who has a part in this level: a step of their own, or a chat message they send.
export function involvedRoles(level: Level): Set<Role> {
  const roles = new Set<Role>()
  for (const step of level.steps) {
    roles.add(step.role)
    if (step.chat) roles.add(step.chat.from.role)
  }
  return roles
}

// For every role: is it working, waiting on someone, or finished? This is how Team view
// answers "who waits on whom".
export function roleStatuses(level: Level, current: Step | null, finished: boolean): Record<Role, RoleStatus> {
  const involved = involvedRoles(level)
  const currentIndex = current ? level.steps.findIndex((s) => s.id === current.id) : level.steps.length
  const result = {} as Record<Role, RoleStatus>

  for (const role of ROLES) {
    if (!involved.has(role)) {
      result[role] = { state: 'uninvolved', headline: 'Not involved', detail: `Has no part in Level ${level.id}.` }
      continue
    }
    if (finished || !current) {
      result[role] = { state: 'done', headline: 'Done', detail: 'The level is finished.' }
      continue
    }
    if (current.role === role) {
      result[role] = current.auto
        ? { state: 'automatic', headline: 'Running now', detail: `${KIND_LABEL[current.kind]}. This happens automatically.` }
        : { state: 'active', headline: 'Working now', detail: KIND_LABEL[current.kind] }
      continue
    }
    if (current.chat && current.chat.from.role === role) {
      result[role] = { state: 'waiting', headline: 'Waiting', detail: `Waiting for a reply from ${roleLabel(current.role)}.` }
      continue
    }
    const next = level.steps.slice(currentIndex + 1).find((s) => s.role === role || s.chat?.from.role === role)
    result[role] = next
      ? { state: 'waiting', headline: 'Waiting', detail: `Waiting for ${roleLabel(current.role)}. Next for this role: ${KIND_LABEL[next.kind].toLowerCase()}.` }
      : { state: 'done', headline: 'Done', detail: 'Has no more steps in this level.' }
  }
  return result
}
