import { Check, X } from 'lucide-react'
import { STATIONS } from '../../engine/types'
import { useLevelStore } from '../../store/levelStore'
import { STATE_TEXT, STATION_INFO } from './stationInfo'

// A flat list of the pipeline stations, driven by the same events as the 3D scene.
// It is the 2D fallback for devices that cannot run the 3D scene, and the text that
// screen readers get while the scene is showing.
// Colours are flat and muted: green for passed, red for failed, no glow.
export function StationList() {
  const stations = useLevelStore((s) => s.stations)

  return (
    <ol className="flex flex-col gap-2">
      {STATIONS.map((id) => {
        const station = STATION_INFO[id]
        const state = stations[id]
        return (
          <li
            key={id}
            aria-label={`${station.name}: ${STATE_TEXT[state]}`}
            className={`flex items-center gap-3 rounded-tag border p-3 transition-colors ${
              state === 'active' ? 'border-accent bg-raised' : 'border-line'
            }`}
          >
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
            <span
              className={`text-caption ${state === 'pass' ? 'text-pass' : state === 'fail' ? 'text-fail' : state === 'idle' ? 'text-ink-3' : 'text-ink-2'}`}
            >
              {STATE_TEXT[state]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
