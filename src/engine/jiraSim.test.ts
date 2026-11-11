import { describe, expect, it } from 'vitest'
import { COLUMNS, JiraSim, type JiraEvent } from './jiraSim'
import type { Ticket } from './types'

const ticket = (id: string, status: Ticket['status'] = 'todo'): Ticket => ({
  id,
  title: `Ticket ${id}`,
  description: '',
  status,
  assignee: null,
  type: 'task',
})

function board() {
  const events: JiraEvent[] = []
  const jira = new JiraSim([ticket('ORD-1'), ticket('ORD-2', 'inprogress')], (e) => events.push(e))
  return { jira, events }
}

describe('JiraSim', () => {
  it('has the four columns from the PRD in order', () => {
    expect(COLUMNS.map((c) => c.label)).toEqual(['To do', 'In progress', 'Review', 'Done'])
  })

  it('groups tickets into columns', () => {
    const { jira } = board()
    const b = jira.board()
    expect(b.todo.map((t) => t.id)).toEqual(['ORD-1'])
    expect(b.inprogress.map((t) => t.id)).toEqual(['ORD-2'])
  })

  it('moves one column at a time and emits an event', () => {
    const { jira, events } = board()
    expect(jira.move('ORD-1', 'inprogress').ok).toBe(true)
    expect(events).toEqual([{ type: 'jira:ticket-moved', ticketId: 'ORD-1', from: 'todo', to: 'inprogress' }])
  })

  it('refuses to skip columns, with a plain explanation', () => {
    const { jira, events } = board()
    const result = jira.move('ORD-1', 'done')
    expect(result).toEqual({ ok: false, error: "ORD-1 can't move from To do straight to Done. Tickets move one column at a time." })
    expect(jira.get('ORD-1')?.status).toBe('todo')
    expect(events).toEqual([])
  })

  it('refuses a no-op move and an unknown ticket', () => {
    const { jira } = board()
    expect(jira.move('ORD-2', 'inprogress')).toEqual({ ok: false, error: 'ORD-2 is already in In progress.' })
    expect(jira.move('NOPE-1', 'done')).toEqual({ ok: false, error: 'There is no ticket NOPE-1.' })
  })

  it('lets review bounce back to in progress and done be reopened', () => {
    const { jira } = board()
    jira.move('ORD-2', 'review')
    expect(jira.move('ORD-2', 'inprogress').ok).toBe(true)
    jira.move('ORD-2', 'review')
    jira.move('ORD-2', 'done')
    expect(jira.move('ORD-2', 'inprogress').ok).toBe(true)
  })

  it('assigns, updates and adds tickets', () => {
    const { jira, events } = board()
    jira.assign('ORD-1', 'backend')
    expect(jira.get('ORD-1')?.assignee).toBe('backend')
    jira.update('ORD-1', { title: 'New title', description: 'New description' })
    expect(jira.get('ORD-1')).toMatchObject({ title: 'New title', description: 'New description' })
    jira.update('ORD-1', { title: 'New title' }) // unchanged: no event
    expect(jira.add(ticket('ORD-3')).ok).toBe(true)
    expect(jira.add(ticket('ORD-3')).ok).toBe(false)
    expect(events.map((e) => e.type)).toEqual(['jira:ticket-assigned', 'jira:ticket-updated', 'jira:ticket-added'])
  })

  it('returns copies, so callers cannot change the board by accident', () => {
    const { jira } = board()
    jira.get('ORD-1')!.status = 'done'
    expect(jira.get('ORD-1')?.status).toBe('todo')
  })
})
