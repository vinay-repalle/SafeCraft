import { Check, X } from 'lucide-react'
import type { Station } from '../../engine/types'
import { useLevelStore, type StationState } from '../../store/levelStore'

const STATIONS: { id: Station; name: string; detail: string }[] = [
  { id: 'client', name: 'Client', detail: 'Asks for the change' },
  { id: 'pm', name: 'Project manager desk', detail: 'Writes the ticket' },
  { id: 'dev', name: 'Developer desk', detail: 'Writes the code' },
  { id: 'github', name: 'GitHub', detail: 'Holds the pull request' },
  { id: 'tests', name: 'Test server', detail: 'Runs the automated tests' },
  { id: 'live', name: 'Live app', detail: 'What customers use' },
]

const STATE_TEXT: Record<StationState, string> = {
  idle: 'Waiting',
  active: 'Work is here',
  done: 'Handed on',
  pass: 'Passed',
  fail: 'Failed',
}

// A flat list of the pipeline stations, driven by the same events the 3D scene will use.
// In Phase 4 this becomes the 2D fallback for devices that cannot run the 3D scene.
// Colours are flat and muted: green for passed, red for failed, no glow.
export function StationList() {
  const stations = useLevelStore((s) => s.stations)

  return (
    <ol className="flex flex-col gap-2">
      {STATIONS.map((station) => {
        const state = stations[station.id]
        return (
          <li
            key={station.id}
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
