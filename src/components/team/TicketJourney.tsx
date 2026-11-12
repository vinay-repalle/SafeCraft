import { Box, ChevronRight, Rows3 } from 'lucide-react'
import { Fragment, lazy, Suspense, useRef, useState } from 'react'
import { roleLabel, type RoleState, type RoleStatus } from '../../store/teamFeed'
import type { TicketJourney as Journey } from '../../store/ticketJourney'
import type { Role } from '../../store/types'
import { TicketTag } from '../jira/TicketTag'
import { detectSupport, shouldUse3d, usePipelineMode } from '../pipeline/pipelineMode'
import { LOADING, SceneBoundary, useAfterFirstPaint } from '../pipeline/sceneShell'
import { BUTTON } from '../ui'
import type { TicketLabelRefs } from './TicketScene'
import { DESK_ORDER } from './ticketLayout'

// Its own lazy chunk, like the pipeline scene: nothing 3D loads before first paint.
const TicketScene = lazy(() => import('./TicketScene'))

// Flat status dot: the colour repeats the state, the words carry it. Shared with Team view's columns.
export const STATE_DOT: Record<RoleState, string> = {
  active: 'bg-accent',
  automatic: 'bg-accent',
  waiting: 'bg-ink-3',
  done: 'bg-pass',
  uninvolved: 'bg-line',
}

const busy = (state: RoleState) => state === 'active' || state === 'automatic'

// Phase 7f: the ticket's journey between the five roles, above Team view's columns. The 3D
// version is a row of desks with the ticket hopping between them; the 2D version is a row of
// cards with the ticket tag on the holder's card. Both sit over the matching column, and both
// share the learner's 3D-or-list choice with the pipeline.
export function TicketJourney({ journey, statuses }: { journey: Journey; statuses: Record<Role, RoleStatus> }) {
  const mode = usePipelineMode((s) => s.mode)
  const setMode = usePipelineMode((s) => s.set)
  const [crashed, setCrashed] = useState(false)
  const ready = useAfterFirstPaint()
  const labels: TicketLabelRefs = useRef({})
  const support = detectSupport()
  const use3d = shouldUse3d(mode, support) && !crashed
  const fallback = <TicketRow journey={journey} statuses={statuses} />

  return (
    <section aria-label="Ticket journey" className="flex shrink-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <JourneyText journey={journey} />
        {support.webgl && (
          <button
            type="button"
            className={`${BUTTON} shrink-0`}
            onClick={() => {
              setCrashed(false)
              setMode(use3d ? 'list' : '3d')
            }}
          >
            {use3d ? <Rows3 size={16} strokeWidth={1.5} /> : <Box size={16} strokeWidth={1.5} />}
            {use3d ? 'Show flat view' : 'Show 3D scene'}
          </button>
        )}
      </div>

      {use3d ? (
        // Decoration for screen readers: the text above and the columns below say the same in words.
        <div aria-hidden className="relative h-48">
          {ready ? (
            <SceneBoundary onError={() => setCrashed(true)} fallback={fallback}>
              <Suspense fallback={LOADING}>
                <TicketScene stops={journey.stops} statuses={statuses} labels={labels} onFail={() => setCrashed(true)} />
                <TicketLabels journey={journey} statuses={statuses} labels={labels} />
              </Suspense>
            </SceneBoundary>
          ) : (
            LOADING
          )}
        </div>
      ) : (
        fallback
      )}
      {!support.webgl && <p className="text-meta text-ink-3">This browser cannot draw the 3D scene, so the flat view is shown.</p>}
      {support.webgl && support.weak && mode === 'auto' && <p className="text-meta text-ink-3">The flat view is shown to keep this device fast. You can switch to the 3D scene.</p>}
    </section>
  )
}

// The journey in words: who has the ticket, who gets it next, and everyone it has passed through.
function JourneyText({ journey }: { journey: Journey }) {
  const { stops, holder, next, finished } = journey
  return (
    <div className="min-w-0">
      <h2 className="flex items-center gap-2 text-body font-medium">
        Ticket journey <TicketTag id={journey.ticketId} type={journey.ticketType} />
      </h2>
      <p aria-live="polite" className="mt-1 text-caption text-ink-2">
        {finished ? `Released to customers. Last with ${roleLabel(holder)}.` : `With ${roleLabel(holder)}.`}
        {next && ` Next: ${roleLabel(next)}.`}
      </p>
      <ol aria-label="Who has held the ticket, in order" className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-meta text-ink-3">
        {stops.map((role, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight aria-hidden size={12} strokeWidth={1.5} className="shrink-0" />}
            <li className={i === stops.length - 1 ? 'font-medium text-ink' : ''}>
              {roleLabel(role)}
              {i === 0 && ' (wrote it)'}
            </li>
          </Fragment>
        ))}
      </ol>
    </div>
  )
}

const TAG = 'absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-tag border bg-card px-2 py-1 text-meta text-ink opacity-0'

// HTML labels over the 3D row: one per desk, and the ticket's own tag that follows it. The scene
// moves them each frame and they start hidden, so they never flash in the wrong place.
function TicketLabels({ journey, statuses, labels }: { journey: Journey; statuses: Record<Role, RoleStatus>; labels: TicketLabelRefs }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {DESK_ORDER.map((role) => (
        <div
          key={role}
          ref={(el) => {
            labels.current[role] = el
          }}
          className={`${TAG} ${busy(statuses[role].state) ? 'border-accent' : 'border-line'}`}
        >
          <span className={`size-2 shrink-0 ${STATE_DOT[statuses[role].state]}`} />
          {roleLabel(role)}
          <span className="text-ink-3">· {statuses[role].headline}</span>
        </div>
      ))}
      <div
        ref={(el) => {
          labels.current.ticket = el
        }}
        className="absolute left-0 top-0 opacity-0"
      >
        <TicketTag id={journey.ticketId} type={journey.ticketType} />
      </div>
    </div>
  )
}

// The 2D fallback: one card per role, on the same five-column grid as Team view. The ticket tag
// sits on the holder's card and rises in once each time it moves.
function TicketRow({ journey, statuses }: { journey: Journey; statuses: Record<Role, RoleStatus> }) {
  return (
    <ol className="grid grid-cols-5 gap-4">
      {DESK_ORDER.map((role) => {
        const status = statuses[role]
        const holds = journey.holder === role
        return (
          <li
            key={role}
            aria-label={`${roleLabel(role)}: ${status.headline}${holds ? '. Has the ticket' : ''}`}
            className={`flex h-14 items-center justify-between gap-2 rounded-tag border px-3 transition-colors ${busy(status.state) ? 'border-accent bg-raised' : 'border-line'}`}
          >
            <span className="min-w-0">
              <span className={`block truncate text-caption font-medium ${status.state === 'uninvolved' ? 'text-ink-3' : 'text-ink'}`}>{roleLabel(role)}</span>
              <span className="flex items-center gap-1.5 text-meta text-ink-3">
                <span aria-hidden className={`size-2 shrink-0 ${STATE_DOT[status.state]}`} />
                {status.headline}
              </span>
            </span>
            {holds && (
              // A new key for every stop, so the tag rises in once each time the ticket moves.
              <span key={journey.stops.length} className="motion-rise shrink-0">
                <TicketTag id={journey.ticketId} type={journey.ticketType} />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
