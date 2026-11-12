// Phase 7f: who has held the ticket so far, who has it now, and who gets it next.
//
// Pure, like teamFeed.ts: it reads a level and where the run is, and returns plain data that
// both the 3D ticket journey and its 2D fallback draw. "Holding the ticket" means owning the
// step that is current: that role is the one the work is waiting on.
//
// Worked out from the steps in order, not only from the current one. The engine performs some
// steps itself (the QA test run, the reviewer's approval) in the same moment as the learner's
// action before them, so the current step jumps straight past those roles. Reading every step
// up to the current one keeps them in the journey.
import type { Level } from '../engine/types'
import type { Role } from './types'

// Tickets are written by the project manager, so that is where every journey starts.
export const TICKET_AUTHOR: Role = 'pm'

export type TicketJourney = {
  ticketId: string
  ticketType: Level['scenario']['ticket']['type']
  // Everyone who has held the ticket, in order, starting with the author. The last one holds it
  // now. A role that keeps the ticket for several steps in a row appears once.
  stops: Role[]
  holder: Role
  // Who it goes to after the holder, or null when nobody else has a step left.
  next: Role | null
  finished: boolean
}

export function ticketJourney(level: Level, currentStepId: string | null, finished: boolean): TicketJourney {
  const found = currentStepId === null ? -1 : level.steps.findIndex((s) => s.id === currentStepId)
  // When the level is finished (or the step is unknown) every step counts as done.
  const current = finished || found < 0 ? level.steps.length - 1 : found
  const stops: Role[] = [TICKET_AUTHOR]
  for (const step of level.steps.slice(0, current + 1)) {
    if (stops[stops.length - 1] !== step.role) stops.push(step.role)
  }
  const holder = stops[stops.length - 1]
  const next = finished ? null : (level.steps.slice(current + 1).find((s) => s.role !== holder)?.role ?? null)
  return { ticketId: level.scenario.ticket.id, ticketType: level.scenario.ticket.type, stops, holder, next, finished }
}

// What the screen should animate when the journey changes from `shown` to `stops`.
//   snap  jump straight to the holder (first draw, a new level, or a restart)
//   hops  otherwise, the new stops to visit in order, one hop each
export function hopsToPlay(shown: Role[], stops: Role[]): { snap: boolean; hops: Role[] } {
  if (shown.length === 0 || stops.length < shown.length) return { snap: true, hops: [] }
  for (let i = 0; i < shown.length; i++) if (shown[i] !== stops[i]) return { snap: true, hops: [] }
  return { snap: false, hops: stops.slice(shown.length) }
}
