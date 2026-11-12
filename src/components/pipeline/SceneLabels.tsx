import { STATIONS } from '../../engine/types'
import { useLevelStore, type StationState } from '../../store/levelStore'
import { displayStations, stallText } from './pipelineMotion'
import { STATION_INFO, stationText } from './stationInfo'
import type { LabelRefs } from './Scene'
import { useTestRun } from './useTestRun'

// Flat swatch colour per state, using the same tokens as the 3D pads.
const SWATCH: Record<StationState, string> = {
  idle: 'bg-ink-3/40',
  active: 'bg-accent',
  done: 'bg-ink-2',
  pass: 'bg-pass',
  fail: 'bg-fail',
}

const TAG = 'absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-tag border bg-card px-2 py-1 text-meta text-ink opacity-0'

// One name tag per station, laid over the 3D scene, plus one for a parcel stalled on a
// conflict. Scene.tsx moves each one to sit above its place every time a frame is drawn. They
// start hidden so they never flash in the wrong place before the first frame.
export function SceneLabels({ labels }: { labels: LabelRefs }) {
  const { running } = useTestRun()
  const stations = displayStations(useLevelStore((s) => s.stations), running)
  const stallAt = useLevelStore((s) => s.stallAt)
  const conflictOpen = useLevelStore((s) => (s.snapshot?.git.conflicts.length ?? 0) > 0)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {STATIONS.map((id) => (
        <div
          key={id}
          ref={(el) => {
            labels.current[id] = el
          }}
          title={`${STATION_INFO[id].name}: ${stationText(id, stations[id], running)}`}
          className={`${TAG} ${stations[id] === 'active' ? 'border-accent' : 'border-line'}`}
        >
          <span className={`size-2 shrink-0 ${SWATCH[stations[id]]}`} />
          {STATION_INFO[id].name}
          {running && id === 'tests' && <span className="text-ink-3">· running</span>}
        </div>
      ))}
      {stallAt && (
        <div
          ref={(el) => {
            labels.current.stall = el
          }}
          className={`${TAG} ${conflictOpen ? 'border-fail' : 'border-line'}`}
        >
          <span className={`size-2 shrink-0 ${conflictOpen ? 'bg-fail' : 'bg-ink-2'}`} />
          {stallText(conflictOpen)}
        </div>
      )}
    </div>
  )
}
