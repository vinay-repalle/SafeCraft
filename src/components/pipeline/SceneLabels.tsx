import { STATIONS } from '../../engine/types'
import { useLevelStore, type StationState } from '../../store/levelStore'
import { STATE_TEXT, STATION_INFO } from './stationInfo'
import type { LabelRefs } from './Scene'

// Flat swatch colour per state, using the same tokens as the 3D pads.
const SWATCH: Record<StationState, string> = {
  idle: 'bg-ink-3/40',
  active: 'bg-accent',
  done: 'bg-ink-2',
  pass: 'bg-pass',
  fail: 'bg-fail',
}

// One name tag per station, laid over the 3D scene. Scene.tsx moves each one to sit above
// its station every time a frame is drawn. They start hidden so they never flash in the
// wrong place before the first frame.
export function SceneLabels({ labels }: { labels: LabelRefs }) {
  const stations = useLevelStore((s) => s.stations)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {STATIONS.map((id) => (
        <div
          key={id}
          ref={(el) => {
            labels.current[id] = el
          }}
          title={`${STATION_INFO[id].name}: ${STATE_TEXT[stations[id]]}`}
          className={`absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-tag border bg-card px-2 py-1 text-meta text-ink opacity-0 ${
            stations[id] === 'active' ? 'border-accent' : 'border-line'
          }`}
        >
          <span className={`size-2 shrink-0 ${SWATCH[stations[id]]}`} />
          {STATION_INFO[id].name}
        </div>
      ))}
    </div>
  )
}
