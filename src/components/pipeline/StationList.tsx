import { Check, OctagonMinus, X } from 'lucide-react'
import { Fragment } from 'react'
import { STATIONS } from '../../engine/types'
import { useLevelStore } from '../../store/levelStore'
import { TEST_RUN_SECONDS, displayStations, stallText } from './pipelineMotion'
import { STATION_INFO, stationText } from './stationInfo'
import { useTestRun } from './useTestRun'

// A flat list of the pipeline stations, driven by the same events as the 3D scene.
// It is the 2D fallback for devices that cannot run the 3D scene, and the text that
// screen readers get while the scene is showing.
// Colours are flat and muted: green for passed, red for failed, no glow.
//
// Phase 7g, the same three moments as the 3D scene, in 2D:
//   tests running  a bar under the test server fills once, over the same time as the conveyor
//   tests failed   the test server row shakes once (transform only)
//   conflict       a "stopped" row appears after the station the work could not leave
export function StationList() {
  const { run, phase, running } = useTestRun()
  const stations = displayStations(useLevelStore((s) => s.stations), running)
  const stallAt = useLevelStore((s) => s.stallAt)
  const conflictOpen = useLevelStore((s) => (s.snapshot?.git.conflicts.length ?? 0) > 0)

  return (
    <ol className="flex flex-col gap-2">
      {STATIONS.map((id) => {
        const station = STATION_INFO[id]
        const state = stations[id]
        const text = stationText(id, state, running)
        const shaking = id === 'tests' && phase === 'shaking'
        return (
          <Fragment key={id}>
            <li
              // A new key per run restarts the one-off animations for that run, never otherwise.
              key={id === 'tests' ? `tests-${run?.seq ?? 0}` : id}
              aria-label={`${station.name}: ${text}`}
              className={`flex flex-col gap-2 rounded-tag border p-3 transition-colors ${state === 'active' ? 'border-accent bg-raised' : 'border-line'} ${shaking ? 'motion-shake' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`flex size-5 shrink-0 items-center justify-center rounded-tag ${
                    state === 'pass' ? 'bg-pass text-page' : state === 'fail' ? 'bg-fail text-page' : state === 'active' ? 'bg-accent text-on-accent' : 'border border-line text-ink-3'
                  }`}
                >
                  {state === 'pass' || state === 'done' ? <Check size={14} strokeWidth={1.5} /> : state === 'fail' ? <X size={14} strokeWidth={1.5} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium text-ink">{station.name}</span>
                  <span className="block text-meta text-ink-3">{station.detail}</span>
                </span>
                <span className={`text-caption ${state === 'pass' ? 'text-pass' : state === 'fail' ? 'text-fail' : state === 'idle' ? 'text-ink-3' : 'text-ink-2'}`}>{text}</span>
              </div>
              {id === 'tests' && running && (
                // The 2D conveyor: one bar that fills while the tests run, then goes away.
                <span aria-hidden className="block h-1 overflow-hidden rounded-tag bg-line">
                  <span className="motion-grow-x block h-full bg-accent" style={{ animationDuration: `${TEST_RUN_SECONDS * 1000}ms` }} />
                </span>
              )}
            </li>
            {stallAt === id && (
              <li className={`motion-rise flex items-center gap-3 rounded-tag border border-dashed px-3 py-2 ${conflictOpen ? 'border-fail' : 'border-line'}`}>
                <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-tag ${conflictOpen ? 'bg-fail text-page' : 'border border-line text-ink-3'}`}>
                  {conflictOpen ? <OctagonMinus size={14} strokeWidth={1.5} /> : <Check size={14} strokeWidth={1.5} />}
                </span>
                <span className={`text-caption ${conflictOpen ? 'text-fail' : 'text-ink-2'}`}>{stallText(conflictOpen)}</span>
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}
