import type { Ticket } from '../../engine/types'

// The signature element from docs/DESIGN.md: a small order-ticket-style tag on every
// ticket. Like the slip on a kitchen order rail, it has a number and, after a torn
// (dashed) edge, what kind of order it is.
export function TicketTag({ id, type }: Pick<Ticket, 'id' | 'type'>) {
  return (
    <span className="inline-flex items-stretch rounded-tag border border-line bg-raised font-mono text-meta">
      <span className="px-2 py-0.5 font-medium text-ink">{id}</span>
      <span className="border-l border-dashed border-ink-3 px-2 py-0.5 text-ink-2">{type}</span>
    </span>
  )
}
