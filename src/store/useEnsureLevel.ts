import { useEffect } from 'react'
import { useRoute } from '../app/route'
import { useLevelStore } from './levelStore'
import { useProgressStore } from './progressStore'

// Starts a level the first time any view needs it, in the seat of the role you picked (frontend
// unless you picked backend). The run is kept in memory, so the board, the Team view and the
// Pipeline view all show the same run as you switch tabs.
//
// Phase 8: the landing page links to /play?level=N ("Continue: Level 3"). That level is loaded
// once, even if a run is already open, and then dropped from the address. With no level in the
// address, Level 1 starts.
export function useEnsureLevel(): void {
  const runner = useLevelStore((s) => s.runner)
  const levelId = useLevelStore((s) => s.levelId)
  const load = useLevelStore((s) => s.load)
  const role = useProgressStore((s) => s.settings.role)
  const requested = useRoute((s) => s.level)
  const consumeLevel = useRoute((s) => s.consumeLevel)
  useEffect(() => {
    const seat = role === 'backend' ? 'backend' : 'frontend'
    if (requested !== null) {
      if (!runner || levelId !== requested) load(requested, { role: seat })
      consumeLevel()
      return
    }
    if (!runner) load(1, { role: seat })
  }, [runner, levelId, load, role, requested, consumeLevel])
}
