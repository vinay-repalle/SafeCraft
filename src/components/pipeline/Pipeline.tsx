import { Box, List } from 'lucide-react'
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLevelStore } from '../../store/levelStore'
import { BUTTON } from '../ui'
import { detectSupport, shouldUse3d, usePipelineMode } from './pipelineMode'
import type { LabelRefs } from './Scene'
import { SceneLabels } from './SceneLabels'
import { StationList } from './StationList'
import { STATE_TEXT, STATION_INFO } from './stationInfo'

// "Lazy" loading: this import() line makes the bundler put the whole 3D scene (three.js and
// React Three Fiber, the heaviest part of the app) in a separate file. The browser
// downloads it only when <Scene> is first drawn, which we delay until after the UI is up.
const Scene = lazy(() => import('./Scene'))

// An error boundary catches a crash in the components below it and shows a fallback
// instead of a blank page. React only supports these as classes. Here it catches a failed
// download of the 3D chunk or a WebGL error, and drops back to the 2D list.
class SceneBoundary extends Component<{ onError: () => void; fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// True from the first moment after the page has painted. Starting the 3D download here,
// not during the first render, means the board, chat and editor appear first.
function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 0)
    return () => window.clearTimeout(id)
  }, [])
  return ready
}

// Says in words where the work is, for the caption under the scene and for screen readers.
export function WhereIsTheWork() {
  const packageAt = useLevelStore((s) => s.packageAt)
  const state = useLevelStore((s) => s.stations[s.packageAt])
  return (
    <p aria-live="polite" className="text-caption text-ink-2">
      Your change is at: <span className="font-medium text-ink">{STATION_INFO[packageAt].name}</span>
      <span className="text-ink-3"> · {STATE_TEXT[state]}</span>
    </p>
  )
}

// What shows inside the scene's box while the 3D code downloads.
const LOADING = <div className="flex h-full items-center justify-center text-meta text-ink-3">Loading the 3D scene</div>

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
