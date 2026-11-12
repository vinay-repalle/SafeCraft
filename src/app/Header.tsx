import { BookOpen, IdCard } from 'lucide-react'
import { useState } from 'react'
import { CheatSheet } from '../components/jargon/CheatSheet'
import { ProgressCardDialog } from '../components/popups/ProgressCardDialog'
import { BUTTON } from '../components/ui'
import { useProgressStore } from '../store/progressStore'
import { JargonModeSwitch } from './JargonModeSwitch'
import { VIEWS, type ViewId } from './nav'
import { ThemeSwitch } from './ThemeSwitch'

type Props = { view: ViewId; onViewChange: (view: ViewId) => void }

export function Header({ view, onViewChange }: Props) {
  const [cheatOpen, setCheatOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const termCount = useProgressStore((s) => s.seenTerms.length)

  return (
    <header className="flex h-14 shrink-0 items-stretch justify-between border-b border-line px-6">
      <div className="flex items-stretch gap-10">
        <span className="flex items-center text-lead font-medium">SyncCraft</span>
        <nav aria-label="Views" className="flex items-stretch gap-6">
          {VIEWS.map(({ id, label }) => {
            const active = view === id
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onViewChange(id)}
                className={`-mb-px flex items-center whitespace-nowrap border-b-2 text-body transition-colors ${
                  active ? 'border-accent font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink'
                }`}
              >
                {label}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <JargonModeSwitch />
        <button type="button" className={BUTTON} onClick={() => setCheatOpen(true)}>
          <BookOpen size={16} strokeWidth={1.5} />
          Cheat sheet
          <span className="text-ink-3">{termCount}</span>
        </button>
        <button type="button" className={BUTTON} onClick={() => setCardOpen(true)}>
          <IdCard size={16} strokeWidth={1.5} />
          Progress card
        </button>
        <ThemeSwitch />
      </div>
      <CheatSheet open={cheatOpen} onClose={() => setCheatOpen(false)} />
      <ProgressCardDialog open={cardOpen} onClose={() => setCardOpen(false)} />
    </header>
  )
}
