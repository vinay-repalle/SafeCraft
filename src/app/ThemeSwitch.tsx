import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useProgressStore } from '../store/progressStore'
import type { Theme } from '../store/types'

const OPTIONS: { id: Theme; label: string; Icon: LucideIcon }[] = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'system', label: 'System', Icon: Monitor },
  { id: 'dark', label: 'Dark', Icon: Moon },
]

export function ThemeSwitch() {
  const theme = useProgressStore((s) => s.settings.theme)
  const setTheme = useProgressStore((s) => s.setTheme)

  return (
    // Outer radius 8 with 2px padding gives an inner radius of 6 (nested radii).
    <div
      role="group"
      aria-label="Theme"
      className="flex gap-0.5 rounded-control border border-line bg-raised p-0.5"
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = theme === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(id)}
            className={`flex size-7 items-center justify-center rounded-tag transition-colors ${
              active ? 'bg-card text-ink shadow-small' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Icon size={16} strokeWidth={1.5} />
          </button>
        )
      })}
    </div>
  )
}
