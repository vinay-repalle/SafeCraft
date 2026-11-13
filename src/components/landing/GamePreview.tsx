// "Inside the game" on the landing page: a still, cut-down copy of the game screen, part way
// through Level 1. Nothing here is interactive and nothing moves. It is built from the same
// pieces as the game (the ticket tag, the panel and button styles, the theme colours) and fed
// from the Level 1 data, so it follows light and dark themes and stays in step with the game
// when the level text changes. Only the words around it live in src/content/landing.ts.
import { Check, CircleCheck, GitBranch, GitCommitHorizontal, GitPullRequest, Upload, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ROLE_INFO, VIEWS } from '../../app/nav'
import { getLevel } from '../../content'
import { GAME, type GamePanelId } from '../../content/landing'
import { COLUMNS } from '../../engine/jiraSim'
import type { Ticket, TicketStatus } from '../../engine/types'
import { TicketTag } from '../jira/TicketTag'

const level = getLevel(1, 'frontend')!
const scenario = level.scenario
const roleLabel = (role: Ticket['assignee']) => ROLE_INFO.find((r) => r.id === role)?.label ?? 'Unassigned'

// The board part way through the level: your ticket has moved to In progress.
const tickets: Ticket[] = [{ ...scenario.ticket, status: 'inprogress' }, ...(scenario.otherTickets ?? [])]
const byColumn = (status: TicketStatus) => tickets.filter((t) => t.status === status)

// The file you change, as a two-line diff: the old line struck out, the new line added.
const FILE = 'src/components/CheckoutButton.jsx'
const before = scenario.files.find((f) => f.path === FILE)?.content.trimEnd().split('\n') ?? []
const editStep = level.steps.find((s) => s.kind === 'code')
const after = editStep?.autoFill?.trimEnd().split('\n') ?? before
type CodeLine = { n: number | null; text: string; mark?: 'removed' | 'added' }
const codeLines: CodeLine[] = []
{
  let n = 1
  before.forEach((line, i) => {
    if (after[i] !== undefined && after[i] !== line) {
      codeLines.push({ n: null, text: line, mark: 'removed' })
      codeLines.push({ n: n++, text: after[i], mark: 'added' })
    } else codeLines.push({ n: n++, text: line })
  })
}

const chat = level.steps.find((s) => s.chat)?.chat
const reply = chat?.replies[0]

// Small number badge that ties each panel to its description under the picture.
const PANEL_ORDER: GamePanelId[] = ['board', 'code', 'chat', 'checks']
function Badge({ id }: { id: GamePanelId }) {
  return <span className="flex size-5 shrink-0 items-center justify-center rounded-tag border border-accent font-mono text-meta text-ink">{PANEL_ORDER.indexOf(id) + 1}</span>
}

function PanelHead({ id, children }: { id: GamePanelId; children?: ReactNode }) {
  const name = GAME.panels.find((p) => p.id === id)!.name
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
      <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-caption font-medium text-ink">
        <Badge id={id} />
        {name}
      </span>
      {children}
    </div>
  )
}

const PANEL = 'flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-card'

function BoardPanel() {
  return (
    <div className={PANEL}>
      <PanelHead id="board" />
      <div className="flex flex-col gap-3 p-3">
        {COLUMNS.map((column) => (
          <div key={column.id}>
            <p className="mb-1 flex items-baseline gap-2 text-meta font-medium text-ink-2">
              {column.label}
              <span className="font-normal text-ink-3">{byColumn(column.id).length}</span>
            </p>
            <ul className="flex flex-col gap-1.5">
              {byColumn(column.id).length === 0 && <li className="rounded-tag border border-dashed border-line px-3 py-2 text-meta text-ink-3">No tickets</li>}
              {byColumn(column.id).map((t) => {
                const mine = t.id === scenario.ticket.id
                return (
                  <li key={t.id} className={`rounded-tag border bg-raised p-2.5 ${mine ? 'border-accent' : 'border-line'}`}>
                    <TicketTag id={t.id} type={t.type} />
                    <p className="mt-1.5 text-caption text-ink">{t.title}</p>
                    <p className="mt-0.5 text-meta text-ink-3">{roleLabel(t.assignee)}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

const GIT_BUTTONS: { icon: LucideIcon; label: string }[] = [
  { icon: GitBranch, label: 'Branch' },
  { icon: GitCommitHorizontal, label: 'Commit' },
  { icon: Upload, label: 'Push' },
  { icon: GitPullRequest, label: 'Pull request' },
]

function CodePanel() {
  return (
    <div className={PANEL}>
      <PanelHead id="code">
        <span className="flex min-w-0 items-center gap-1.5 rounded-tag border border-line bg-raised px-2 py-0.5 font-mono text-meta text-ink-2">
          <GitBranch aria-hidden size={12} strokeWidth={1.5} className="shrink-0" />
          <span className="truncate">{GAME.branch}</span>
        </span>
      </PanelHead>
      <p className="border-b border-line px-4 py-1.5 font-mono text-meta text-ink-3">{FILE}</p>
      <pre className="flex-1 overflow-hidden py-2 font-mono text-caption leading-6">
        {codeLines.map((line, i) => (
          <div
            key={i}
            className={`flex whitespace-pre pr-4 ${line.mark === 'removed' ? 'bg-fail/10 text-ink-3 line-through decoration-fail/60' : line.mark === 'added' ? 'bg-pass/10 text-ink' : 'text-ink-2'}`}
          >
            <span className="w-10 shrink-0 select-none pr-3 text-right text-ink-3">{line.n ?? ''}</span>
            <span className={`w-4 shrink-0 ${line.mark === 'removed' ? 'text-fail' : 'text-pass'}`}>{line.mark === 'removed' ? '-' : line.mark === 'added' ? '+' : ''}</span>
            {line.text}
          </div>
        ))}
      </pre>
      <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
        {GIT_BUTTONS.map(({ icon: Icon, label }) => (
          <span key={label} className="flex h-7 items-center gap-1.5 rounded-control border border-line bg-raised px-2.5 text-meta text-ink">
            <Icon aria-hidden size={14} strokeWidth={1.5} />
            {label}
          </span>
        ))}
      </div>
      <div className="border-t border-line bg-page px-4 py-2.5 font-mono text-meta leading-5">
        <p className="text-ink">
          <span className="text-ink-3">$ </span>git commit -m "{GAME.commit}"
        </p>
        <p className="text-ink-3">
          [{GAME.branch} {GAME.commitHash}] {GAME.commit}
        </p>
      </div>
    </div>
  )
}

function ChatPanel() {
  if (!chat || !reply) return null
  const from = `${chat.from.name} · ${roleLabel(chat.from.role)}`
  const BUBBLE = 'rounded-card px-3 py-2 text-caption'
  return (
    <div className={PANEL}>
      <PanelHead id="chat" />
      <div className="flex flex-col gap-2.5 p-3">
        <p className="text-meta text-ink-3">{from}</p>
        <p className={`${BUBBLE} border border-line bg-raised text-ink`}>{chat.message}</p>
        <p className="self-end text-meta text-ink-3">{GAME.you}</p>
        <p className={`${BUBBLE} self-end border border-accent bg-card text-ink`}>{reply.text}</p>
        <p className={`${BUBBLE} border border-line bg-raised text-ink`}>{reply.response}</p>
      </div>
    </div>
  )
}

function ChecksPanel() {
  return (
    <div className={PANEL}>
      <PanelHead id="checks">
        <span className="text-meta text-pass">
          {level.tests.length} / {level.tests.length}
        </span>
      </PanelHead>
      <div className="flex flex-col gap-2 p-3">
        <p className="flex items-start gap-2 text-caption text-ink">
          <GitPullRequest aria-hidden size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink-2" />
          {GAME.commit}
        </p>
        <ul className="flex flex-col divide-y divide-line rounded-tag border border-line bg-page">
          {level.tests.map((test) => (
            <li key={test.id} className="flex items-center gap-2 px-2.5 py-1.5 font-mono text-meta text-ink-2">
              <CircleCheck aria-hidden size={14} strokeWidth={1.5} className="shrink-0 text-pass" />
              <span className="truncate">{test.name}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 text-caption text-ink-2">
          <Check aria-hidden size={16} strokeWidth={1.5} className="shrink-0 text-pass" />
          {GAME.review}
        </p>
      </div>
    </div>
  )
}

// The whole picture: a bar like the game's header, then the four panels. Decoration for screen
// readers (aria-hidden): the list under it says what each panel is for, in words.
export function GamePreview() {
  return (
    <div className="flex flex-col gap-8">
      <div aria-hidden className="overflow-hidden rounded-panel border border-line bg-page shadow-small">
        <div className="flex items-center justify-between gap-4 border-b border-line bg-card px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-3">
            <span className="text-caption font-medium text-ink">SyncCraft</span>
            <span className="hidden truncate text-meta text-ink-3 sm:inline">
              {GAME.level} · {level.title}
            </span>
          </span>
          <span className="hidden items-center gap-1 md:flex">
            {VIEWS.map((view, i) => (
              <span key={view.id} className={`rounded-control px-2.5 py-1 text-meta ${i === 0 ? 'bg-raised text-ink' : 'text-ink-3'}`}>
                {view.label}
              </span>
            ))}
          </span>
          <span className="shrink-0 rounded-tag border border-accent px-2 py-0.5 text-meta text-ink">{roleLabel('frontend')}</span>
        </div>
        <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:grid-cols-[minmax(0,3fr)_minmax(0,5fr)_minmax(0,4fr)]">
          <div className="hidden xl:flex xl:flex-col">
            <BoardPanel />
          </div>
          <CodePanel />
          <div className="flex min-w-0 flex-col gap-3">
            <ChatPanel />
            <ChecksPanel />
          </div>
        </div>
      </div>

      <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
        {GAME.panels.map((panel) => (
          <li key={panel.id} className="flex gap-3">
            <Badge id={panel.id} />
            <span>
              <span className="block text-body font-medium text-ink">{panel.name}</span>
              <span className="mt-1 block text-body text-ink-2">{panel.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
