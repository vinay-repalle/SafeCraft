import type { Role } from '../store/types'
import type { Ticket, TicketStatus } from './types'

export const COLUMNS: { id: TicketStatus; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'inprogress', label: 'In progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
]

// Tickets move one column at a time, and can step back (review can bounce to in progress).
const ALLOWED: Record<TicketStatus, TicketStatus[]> = {
  todo: ['inprogress'],
  inprogress: ['todo', 'review'],
  review: ['inprogress', 'done'],
  done: ['inprogress'],
}

const label = (status: TicketStatus) => COLUMNS.find((c) => c.id === status)!.label

export type JiraEvent =
  | { type: 'jira:ticket-moved'; ticketId: string; from: TicketStatus; to: TicketStatus }
  | { type: 'jira:ticket-assigned'; ticketId: string; assignee: Role | null }
  | { type: 'jira:ticket-updated'; ticketId: string; fields: ('title' | 'description')[] }
  | { type: 'jira:ticket-added'; ticketId: string }

export type JiraResult = { ok: true; ticket: Ticket } | { ok: false; error: string }

export class JiraSim {
  private tickets = new Map<string, Ticket>()
  private emit: (event: JiraEvent) => void

  constructor(tickets: Ticket[], emit: (event: JiraEvent) => void = () => {}) {
    this.emit = emit
    for (const t of tickets) this.tickets.set(t.id, { ...t })
  }

  get(id: string): Ticket | undefined {
    const t = this.tickets.get(id)
    return t ? { ...t } : undefined
  }

  all(): Ticket[] {
    return [...this.tickets.values()].map((t) => ({ ...t }))
  }

  board(): Record<TicketStatus, Ticket[]> {
    const board: Record<TicketStatus, Ticket[]> = { todo: [], inprogress: [], review: [], done: [] }
    for (const t of this.tickets.values()) board[t.status].push({ ...t })
    return board
  }

  move(id: string, to: TicketStatus): JiraResult {
    const t = this.tickets.get(id)
    if (!t) return { ok: false, error: `There is no ticket ${id}.` }
    if (t.status === to) return { ok: false, error: `${id} is already in ${label(to)}.` }
    if (!ALLOWED[t.status].includes(to)) {
      return { ok: false, error: `${id} can't move from ${label(t.status)} straight to ${label(to)}. Tickets move one column at a time.` }
    }
    const from = t.status
    t.status = to
    this.emit({ type: 'jira:ticket-moved', ticketId: id, from, to })
    return { ok: true, ticket: { ...t } }
  }

  assign(id: string, assignee: Role | null): JiraResult {
    const t = this.tickets.get(id)
    if (!t) return { ok: false, error: `There is no ticket ${id}.` }
    t.assignee = assignee
    this.emit({ type: 'jira:ticket-assigned', ticketId: id, assignee })
    return { ok: true, ticket: { ...t } }
  }

  // Used by requirement changes (Level 5): the project manager edits a ticket.
  update(id: string, patch: { title?: string; description?: string }): JiraResult {
    const t = this.tickets.get(id)
    if (!t) return { ok: false, error: `There is no ticket ${id}.` }
    const fields: ('title' | 'description')[] = []
    if (patch.title !== undefined && patch.title !== t.title) {
      t.title = patch.title
      fields.push('title')
    }
    if (patch.description !== undefined && patch.description !== t.description) {
      t.description = patch.description
      fields.push('description')
    }
    if (fields.length) this.emit({ type: 'jira:ticket-updated', ticketId: id, fields })
    return { ok: true, ticket: { ...t } }
  }

  add(ticket: Ticket): JiraResult {
    if (this.tickets.has(ticket.id)) return { ok: false, error: `${ticket.id} already exists.` }
    this.tickets.set(ticket.id, { ...ticket })
    this.emit({ type: 'jira:ticket-added', ticketId: ticket.id })
    return { ok: true, ticket: { ...ticket } }
  }
}
