import { useProgressStore } from '../store/progressStore'
import type { JargonMode } from '../store/types'

const OPTIONS: { id: JargonMode; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'first', label: 'First time' },
  { id: 'always', label: 'Always' },
]

// The Jargon Helper setting from the PRD: Off, First time only, Always on.
export function JargonModeSwitch() {
  const mode = useProgressStore((s) => s.settings.jargonMode)
  const setMode = useProgressStore((s) => s.setJargonMode)

  return (
    <div className="flex items-center gap-2">
      {/* Hidden on a phone-width window to save room; screen readers still hear it. */}
      <span id="jargon-label" className="sr-only text-meta text-ink-3 sm:not-sr-only">
        Terms
      </span>
      <div role="group" aria-labelledby="jargon-label" className="flex gap-0.5 rounded-control border border-line bg-raised p-0.5">
        {OPTIONS.map(({ id, label }) => {
          const active = mode === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(id)}
              className={`h-7 whitespace-nowrap rounded-tag px-2 text-caption transition-colors ${
                active ? 'bg-card font-medium text-ink shadow-small' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
