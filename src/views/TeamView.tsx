import { FastForward } from 'lucide-react'
import { ROLE_INFO } from '../app/nav'
import { MistakesReplay } from '../components/popups/MistakesReplay'
import { SyncCheck } from '../components/popups/SyncCheck'
import { BUTTON, PANEL } from '../components/ui'
import { useCurrentStep, useLevelStore } from '../store/levelStore'
import { useProgressStore } from '../store/progressStore'
import { roleLabel, roleStatuses, type FeedItem, type RoleState } from '../store/teamFeed'
import type { Role } from '../store/types'
import { useEnsureLevel } from '../store/useEnsureLevel'

// Flat status chip: the dot colour repeats the state, the words carry it.
const STATE_DOT: Record<RoleState, string> = {
  active: 'bg-accent',
  automatic: 'bg-accent',
  waiting: 'bg-ink-3',
  done: 'bg-pass',
  uninvolved: 'bg-line',
}

// Team view: every role side by side. Whatever happens in My view shows up here as it
// happens: the role that acted, the roles that now have something to react to, and who is
// waiting on whom. Read-only; you play the level in My view.
export function TeamView() {
  useEnsureLevel()
  const runner = useLevelStore((s) => s.runner)
  const finished = useLevelStore((s) => s.snapshot?.finished ?? false)
  const feed = useLevelStore((s) => s.feed)
  const step = useCurrentStep()
  const autoFill = useLevelStore((s) => s.autoFill)
  const myRole = useProgressStore((s) => s.settings.role)

  if (!runner) return null
  const statuses = roleStatuses(runner.level, step, finished)
  const summary = step ? summarize(step.role, statuses[step.role].state) : 'The level is finished. Everyone has done their part.'

  return (
    <section aria-label="Team view" className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lead font-medium">Team view</h1>
          <p className="mt-1 text-caption text-ink-2">{summary}</p>
        </div>
        {/* Lets you watch the ripple here without going back to My view. The real step is in My view. */}
        <button type="button" className={`${BUTTON} shrink-0`} disabled={!step} onClick={autoFill}>
          <FastForward size={16} strokeWidth={1.5} />
          Skip and auto-fill this step
        </button>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-5 items-start gap-4">
        {ROLE_INFO.map(({ id }) => (
          <RoleColumn key={id} role={id} status={statuses[id]} feed={feed} you={id === myRole} />
        ))}
      </div>
      <SyncCheck />
      <MistakesReplay />
    </section>
  )
}

function summarize(role: Role, state: RoleState): string {
  const who = roleLabel(role)
  return state === 'automatic' ? `${who} is running a step automatically. Everyone else waits for it.` : `${who} is working. Everyone else waits for this step.`
}

function RoleColumn({ role, status, feed, you }: { role: Role; status: ReturnType<typeof roleStatuses>[Role]; feed: FeedItem[]; you: boolean }) {
  // Newest first. A line is either something this role did, or something it was told about.
  const lines = feed.filter((item) => item.actor === role || item.notifies.includes(role)).slice(-8).reverse()
  const dim = status.state === 'uninvolved'

  return (
    <section aria-label={roleLabel(role)} className={`${PANEL} max-h-full p-4 ${status.state === 'active' || status.state === 'automatic' ? 'border-accent' : ''}`}>
      <header className="flex items-baseline justify-between gap-2">
        <h2 className={`text-body font-medium ${dim ? 'text-ink-3' : ''}`}>{roleLabel(role)}</h2>
        {you && <span className="text-meta text-ink-3">You</span>}
      </header>

      <p className="mt-3 flex items-center gap-2 text-caption font-medium text-ink">
        <span aria-hidden className={`size-2 shrink-0 ${STATE_DOT[status.state]}`} />
        {status.headline}
      </p>
      <p className="mt-1 min-h-[3.75rem] text-caption text-ink-2">{status.detail}</p>

      <h3 className="mb-2 mt-3 border-t border-line pt-3 text-meta font-medium text-ink-3">Activity</h3>
      <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto" aria-live="polite">
        {lines.length === 0 && <li className="text-meta text-ink-3">Nothing yet.</li>}
        {lines.map((item) => (
          <li key={item.id} className="rounded-tag border border-line bg-raised px-3 py-2">
            <p className="text-meta text-ink-3">{item.actor === role ? 'Did' : `From ${roleLabel(item.actor)}`}</p>
            <p className="text-caption text-ink">{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
