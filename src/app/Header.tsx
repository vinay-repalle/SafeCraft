import { BookOpen, CircleHelp, IdCard } from 'lucide-react'
import { useState } from 'react'
import { CheatSheet } from '../components/jargon/CheatSheet'
import { ProgressCardDialog } from '../components/popups/ProgressCardDialog'
import { BUTTON } from '../components/ui'
import { HOW_TO_PLAY_SLUG } from '../content/guides'
import { useProgressStore } from '../store/progressStore'
import { useUiStore } from '../store/uiStore'
import { JargonModeSwitch } from './JargonModeSwitch'
import { Link } from './Link'
import { VIEWS, type ViewId } from './nav'
import { ThemeSwitch } from './ThemeSwitch'

type Props = { view: ViewId; onViewChange: (view: ViewId) => void }

export function Header({ view, onViewChange }: Props) {
  const [cheatOpen, setCheatOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const termCount = useProgressStore((s) => s.seenTerms.length)
  const openGuide = useUiStore((s) => s.openGuide)

  return (
    <header className="flex h-14 shrink-0 items-stretch justify-between border-b border-line px-6">
      <div className="flex items-stretch gap-10">
        {/* The name leads back to the landing page. */}
        <Link href="/" className="flex items-center text-lead font-medium">
          SyncCraft
        </Link>
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
        {/* Phase 8: How to play is the first Field guide article. */}
        <button
          type="button"
          aria-label="How to play"
          title="How to play"
          onClick={() => openGuide(HOW_TO_PLAY_SLUG)}
          className="flex size-8 items-center justify-center rounded-control border border-line bg-card text-ink-2 transition-colors hover:bg-raised hover:text-ink"
        >
          <CircleHelp size={16} strokeWidth={1.5} />
        </button>
        <ThemeSwitch />
      </div>
      <CheatSheet open={cheatOpen} onClose={() => setCheatOpen(false)} />
      <ProgressCardDialog open={cardOpen} onClose={() => setCardOpen(false)} />
    </header>
  )
}
