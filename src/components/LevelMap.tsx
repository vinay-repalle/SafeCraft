import { Check } from 'lucide-react'
import { levelSummaries, type PlayableRole } from '../content'
import { useLevelStore } from '../store/levelStore'
import { useProgressStore } from '../store/progressStore'

// The level map from the PRD: all five levels are open from the start. The only guidance is a
// "Start here" hint under Level 1 until you have finished something in this role.
export function LevelMap({ role }: { role: PlayableRole }) {
  const levelId = useLevelStore((s) => s.levelId)
  const load = useLevelStore((s) => s.load)
  const completed = useProgressStore((s) => s.completed)
  const doneIn = (id: number) => completed[id]?.[role] === true
  const anyDone = levelSummaries.some((l) => doneIn(l.id))
  const current = levelSummaries.find((l) => l.id === levelId)

  return (
    <nav aria-label="Levels">
      <ol className="flex gap-1.5">
        {levelSummaries.map((level) => {
          const selected = level.id === levelId
          return (
            <li key={level.id} className="min-w-0 flex-1">
              <button
                type="button"
                aria-current={selected ? 'true' : undefined}
                aria-label={`Level ${level.id}: ${level.title}${doneIn(level.id) ? ', completed' : ''}`}
                title={level.title}
                onClick={() => !selected && load(level.id)}
                className={`flex h-8 w-full items-center justify-center gap-1 rounded-control border text-caption transition-colors ${
                  selected ? 'border-accent bg-raised font-medium text-ink' : 'border-line text-ink-2 hover:border-ink-3 hover:text-ink'
                }`}
              >
                {level.id}
                {doneIn(level.id) && <Check size={16} strokeWidth={1.5} aria-hidden className="text-pass" />}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="mt-2 flex items-baseline justify-between gap-2 text-caption">
        <span className="min-w-0 truncate font-medium text-ink">{current ? `Level ${current.id}: ${current.title}` : 'Level'}</span>
        {!anyDone && levelId === 1 && <span className="shrink-0 text-meta text-accent">Start here</span>}
      </p>
    </nav>
  )
}
