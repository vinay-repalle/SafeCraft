import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { ROLE_INFO } from '../../app/nav'
import { COLUMNS } from '../../engine/jiraSim'
import type { Ticket, TicketStatus } from '../../engine/types'
import { useLevelStore } from '../../store/levelStore'
import { useProgressStore } from '../../store/progressStore'
import { useFlip } from '../../utils/useFlip'
import { spotClass, spotProps, useNextAction } from '../spotlight'
import { TicketTag } from './TicketTag'

const label = (status: TicketStatus) => COLUMNS.find((c) => c.id === status)!.label
const roleLabel = (role: Ticket['assignee']) => ROLE_INFO.find((r) => r.id === role)?.label ?? 'Unassigned'

// The Mini-Jira board. Columns are stacked lanes, because the left zone is narrow.
// Tickets assigned to you can be dragged to a lane, or moved with the arrow buttons
// (a keyboard-friendly alternative to dragging).
// Phase 9: a ticket slides to its new lane (FLIP, see useFlip), and when a step asks you to move
// one, the arrow that moves it the right way has the dashed next-step outline.
export function Board() {
  const snapshot = useLevelStore((s) => s.snapshot)
  const act = useLevelStore((s) => s.act)
  const role = useProgressStore((s) => s.settings.role)
  const root = useRef<HTMLDivElement>(null)
  useFlip(root, snapshot?.board)
  const next = useNextAction()
  if (!snapshot) return null

  const goal = next?.kind === 'ticket' ? next : null
  const goalIndex = goal ? COLUMNS.findIndex((c) => c.id === goal.to) : -1

  const move = (ticketId: string, to: TicketStatus) => act({ type: 'moveTicket', ticketId, to })

  return (
    <div ref={root} className="flex flex-col gap-3">
      {COLUMNS.map((column, columnIndex) => {
        const tickets = snapshot.board[column.id]
        return (
          <section
            key={column.id}
            aria-label={column.label}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData('text/plain')
              if (id) move(id, column.id)
            }}
            className="rounded-tag"
          >
            <h3 className="mb-1 flex items-baseline gap-2 text-caption font-medium text-ink-2">
              {column.label}
              <span className="text-meta font-normal text-ink-3">{tickets.length}</span>
            </h3>
            <ul className="flex flex-col gap-1.5">
              {tickets.length === 0 && <li className="rounded-tag border border-dashed border-line px-3 py-2 text-meta text-ink-3">No tickets</li>}
              {tickets.map((ticket) => {
                const mine = ticket.assignee === role && column.id !== 'done'
                const prev = COLUMNS[columnIndex - 1]
                const after = COLUMNS[columnIndex + 1]
                const isGoal = goal?.ticketId === ticket.id && goalIndex !== columnIndex
                const spotNext = isGoal && goalIndex > columnIndex
                const spotPrev = isGoal && goalIndex < columnIndex
                return (
                  <li
                    key={ticket.id}
                    data-flip-id={ticket.id}
                    draggable={mine}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', ticket.id)}
                    className={`rounded-tag border border-line bg-raised p-3 ${mine ? 'cursor-grab' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <TicketTag id={ticket.id} type={ticket.type} />
                      {mine && (
                        <span className="flex gap-1">
                          {prev && (
                            <MoveButton spot={spotPrev} aria-label={`Move ${ticket.id} to ${label(prev.id)}`} onClick={() => move(ticket.id, prev.id)}>
                              <ArrowLeft size={16} strokeWidth={1.5} />
                            </MoveButton>
                          )}
                          {after && (
                            <MoveButton spot={spotNext} aria-label={`Move ${ticket.id} to ${label(after.id)}`} onClick={() => move(ticket.id, after.id)}>
                              <ArrowRight size={16} strokeWidth={1.5} />
                            </MoveButton>
                          )}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-body text-ink">{ticket.title}</p>
                    <p className="mt-1 text-meta text-ink-3">{ticket.assignee === role ? 'Assigned to you' : roleLabel(ticket.assignee)}</p>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function MoveButton({ spot = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { spot?: boolean }) {
  return (
    <button
      type="button"
      title={props['aria-label']}
      {...spotProps(spot)}
      className={`flex size-7 items-center justify-center rounded-tag border border-line bg-card text-ink-2 transition-colors hover:text-ink${spotClass(spot)}`}
      {...props}
    />
  )
}
