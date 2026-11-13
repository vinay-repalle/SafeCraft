import { Box, Check, Rows3 } from 'lucide-react'
import { lazy, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import type { PlayableRole } from '../content'
import { useLevelStore } from '../store/levelStore'
import { useProgressStore } from '../store/progressStore'
import { badgeCount, levelMapModel, type LevelMapModel, type LevelStop } from './levelmap/levelPath'
import type { PathLabelRefs } from './levelmap/LevelPathScene'
import { detectSupport, shouldUse3d, usePipelineMode } from './pipeline/pipelineMode'
import { SceneBoundary, useAfterFirstPaint } from './pipeline/sceneShell'

// Phase 7h: its own lazy chunk, like the other scenes. Nothing 3D loads before first paint.
const LevelPathScene = lazy(() => import('./levelmap/LevelPathScene'))

const stopLabel = (stop: LevelStop) =>
  `Level ${stop.id}: ${stop.title}${stop.doneHere ? ', completed' : stop.badge ? ', badge earned in the other seat' : ''}`

// The level map from the PRD: all five levels are open from the start. The only guidance is a
// "Start here" hint under Level 1 until you have finished something in this role.
//
// Phase 7h draws it as a 3D path: a stone per level, a medal on each level whose badge is
// earned, and a plinth of the other badges at the end. The level buttons sit under the stones.
// The flat row of buttons is the 2D fallback, and both share the learner's 3D-or-flat choice
// with the pipeline and the ticket journey.
export function LevelMap({ role }: { role: PlayableRole }) {
  const levelId = useLevelStore((s) => s.levelId)
  const load = useLevelStore((s) => s.load)
  const completed = useProgressStore((s) => s.completed)
  const guidesRead = useProgressStore((s) => s.guidesRead)
  const model = useMemo(() => levelMapModel({ completed, guidesRead }, role, levelId), [completed, guidesRead, role, levelId])
  const anyDone = model.stops.some((s) => s.doneHere)
  const current = model.stops.find((s) => s.current)

  const mode = usePipelineMode((s) => s.mode)
  const setMode = usePipelineMode((s) => s.set)
  const [crashed, setCrashed] = useState(false)
  const ready = useAfterFirstPaint()
  const labels: PathLabelRefs = useRef({})
  const support = detectSupport()
  const use3d = shouldUse3d(mode, support) && !crashed

  const choose = (id: number) => {
    if (id !== levelId) load(id)
  }
  const row = <LevelRow model={model} onChoose={choose} />
  // While the 3D code downloads, the flat row stands in, in the same space, so the levels can
  // always be chosen and nothing jumps when the scene arrives.
  const inBand = (content: ReactNode) => <div className="flex h-full items-center">{content}</div>
  const toggleLabel = use3d ? 'Show the levels as a flat row' : 'Show the levels as a 3D path'

  return (
    <nav aria-label="Levels">
      {use3d ? (
        <div className="relative h-28">
          {ready ? (
            <SceneBoundary onError={() => setCrashed(true)} fallback={inBand(row)}>
              <Suspense fallback={inBand(row)}>
                {/* Decoration for screen readers: the buttons and the badge tag say it in words. */}
                <div aria-hidden className="absolute inset-0">
                  <LevelPathScene model={model} labels={labels} onFail={() => setCrashed(true)} />
                </div>
                <PathLabels model={model} labels={labels} onChoose={choose} />
              </Suspense>
            </SceneBoundary>
          ) : (
            inBand(row)
          )}
        </div>
      ) : (
        row
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-caption">
        <span className="min-w-0 truncate font-medium text-ink">{current ? `Level ${current.id}: ${current.title}` : 'Level'}</span>
        <span className="flex shrink-0 items-center gap-2">
          {!anyDone && levelId === 1 && <span className="text-meta text-accent">Start here</span>}
          {support.webgl && (
            <button
              type="button"
              aria-label={toggleLabel}
              title={toggleLabel}
              onClick={() => {
                setCrashed(false)
                setMode(use3d ? 'list' : '3d')
              }}
              className="flex size-6 items-center justify-center rounded-tag border border-line text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
            >
              {use3d ? <Rows3 size={16} strokeWidth={1.5} /> : <Box size={16} strokeWidth={1.5} />}
            </button>
          )}
        </span>
      </div>
      {/* The flat row has no plinth, so it says the badge count in words. */}
      {!use3d && (
        <p className="mt-1 text-meta text-ink-3" title={earnedList(model)}>
          {badgeCount(model.earned, model.total)}
        </p>
      )}
    </nav>
  )
}

const earnedList = (model: LevelMapModel) => {
  const names = [...model.stops.filter((s) => s.badge).map((s) => `Level ${s.id}`), ...model.plinth.filter((b) => b.earned).map((b) => b.label)]
  return names.length ? `Earned: ${names.join(', ')}` : 'No badges yet'
}

// The flat row: one button per level. The 2D fallback, and what shows while the 3D code loads.
function LevelRow({ model, onChoose }: { model: LevelMapModel; onChoose: (id: number) => void }) {
  return (
    <ol className="flex w-full gap-1.5">
      {model.stops.map((stop) => (
        <li key={stop.id} className="min-w-0 flex-1">
          <button
            type="button"
            aria-current={stop.current ? 'true' : undefined}
            aria-label={stopLabel(stop)}
            title={stop.title}
            onClick={() => onChoose(stop.id)}
            className={`flex h-8 w-full items-center justify-center gap-1 rounded-control border text-caption transition-colors ${
              stop.current ? 'border-accent bg-raised font-medium text-ink' : 'border-line text-ink-2 hover:border-ink-3 hover:text-ink'
            }`}
          >
            {stop.id}
            {stop.doneHere && <Check size={16} strokeWidth={1.5} aria-hidden className="text-pass" />}
          </button>
        </li>
      ))}
    </ol>
  )
}

const PATH_BUTTON =
  'pointer-events-auto absolute left-0 top-0 flex h-6 min-w-8 items-center justify-center gap-0.5 rounded-tag border bg-card px-1 text-meta opacity-0 transition-colors'

// The buttons and the badge tag over the 3D path. The scene moves each one into place on every
// drawn frame; they start hidden so they never flash in the wrong place.
function PathLabels({ model, labels, onChoose }: { model: LevelMapModel; labels: PathLabelRefs; onChoose: (id: number) => void }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <ol>
        {model.stops.map((stop) => (
          <li key={stop.id}>
            <button
              ref={(el) => {
                labels.current[stop.id] = el
              }}
              type="button"
              aria-current={stop.current ? 'true' : undefined}
              aria-label={stopLabel(stop)}
              title={stop.title}
              onClick={() => onChoose(stop.id)}
              className={`${PATH_BUTTON} ${stop.current ? 'border-accent font-medium text-ink' : 'border-line text-ink-2 hover:border-ink-3 hover:text-ink'}`}
            >
              {stop.id}
              {stop.doneHere && <Check size={16} strokeWidth={1.5} aria-hidden className="text-pass" />}
            </button>
          </li>
        ))}
      </ol>
      <p
        ref={(el) => {
          labels.current.badges = el
        }}
        title={earnedList(model)}
        className="absolute left-0 top-0 whitespace-nowrap rounded-tag border border-line bg-card px-2 py-0.5 text-meta text-ink opacity-0"
      >
        {badgeCount(model.earned, model.total)}
      </p>
    </div>
  )
}
