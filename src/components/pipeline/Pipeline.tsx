import { Box, List } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import { useLevelStore } from '../../store/levelStore'
import { BUTTON } from '../ui'
import { detectSupport, shouldUse3d, usePipelineMode } from './pipelineMode'
import type { LabelRefs } from './Scene'
import { displayStations, stallText } from './pipelineMotion'
import { LOADING, SceneBoundary, useAfterFirstPaint } from './sceneShell'
import { SceneLabels } from './SceneLabels'
import { StationList } from './StationList'
import { STATION_INFO, stationText } from './stationInfo'
import { useTestRun } from './useTestRun'

// "Lazy" loading: this import() line makes the bundler put the whole 3D scene (three.js and
// React Three Fiber, the heaviest part of the app) in a separate file. The browser
// downloads it only when <Scene> is first drawn, which we delay until after the UI is up.
const Scene = lazy(() => import('./Scene'))

// Says in words where the work is, for the caption under the scene and for screen readers.
export function WhereIsTheWork() {
  const packageAt = useLevelStore((s) => s.packageAt)
  const stations = useLevelStore((s) => s.stations)
  const stallAt = useLevelStore((s) => s.stallAt)
  const conflictOpen = useLevelStore((s) => (s.snapshot?.git.conflicts.length ?? 0) > 0)
  const { running } = useTestRun()
  const state = displayStations(stations, running)[packageAt]
  return (
    <p aria-live="polite" className="text-caption text-ink-2">
      Your change is at: <span className="font-medium text-ink">{STATION_INFO[packageAt].name}</span>
      <span className="text-ink-3"> · {stallAt ? stallText(conflictOpen) : stationText(packageAt, state, running)}</span>
    </p>
  )
}

// The pipeline picture. Shows the 3D diorama when the device can draw it, and the 2D list
// otherwise, and if the learner prefers it. Fills the height of its parent.
//   withList  keep the station list under the scene (My view, where the zone is narrow and the
//             scene alone would leave empty space). Without it the scene takes the whole space
//             and the list is only there for screen readers (Pipeline view).
export function Pipeline({ withList = false, showToggle = true }: { withList?: boolean; showToggle?: boolean }) {
  const mode = usePipelineMode((s) => s.mode)
  const setMode = usePipelineMode((s) => s.set)
  const [crashed, setCrashed] = useState(false)
  const ready = useAfterFirstPaint()
  const labels: LabelRefs = useRef({})
  const support = detectSupport()
  const use3d = shouldUse3d(mode, support) && !crashed

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {use3d && (
        // The picture is decoration for screen readers; the list says the same in words.
        <div aria-hidden className={`relative ${withList ? 'aspect-[5/4] shrink-0' : 'min-h-0 flex-1'}`}>
          {ready ? (
            <SceneBoundary onError={() => setCrashed(true)} fallback={LOADING}>
              <Suspense fallback={LOADING}>
                <Scene onFail={() => setCrashed(true)} labels={labels} />
                <SceneLabels labels={labels} />
              </Suspense>
            </SceneBoundary>
          ) : (
            LOADING
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-3">
        <WhereIsTheWork />
        {showToggle && support.webgl && (
          <button
            type="button"
            className={`${BUTTON} shrink-0`}
            onClick={() => {
              setCrashed(false)
              setMode(use3d ? 'list' : '3d')
            }}
          >
            {use3d ? <List size={16} strokeWidth={1.5} /> : <Box size={16} strokeWidth={1.5} />}
            {use3d ? 'Show list' : 'Show 3D scene'}
          </button>
        )}
      </div>
      {!support.webgl && <p className="text-meta text-ink-3">This browser cannot draw the 3D scene, so the list is shown.</p>}
      {support.webgl && support.weak && mode === 'auto' && <p className="text-meta text-ink-3">The list is shown to keep this device fast. You can switch to the 3D scene.</p>}

      {use3d && !withList ? (
        <div className="sr-only">
          <StationList />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StationList />
        </div>
      )}
    </div>
  )
}
