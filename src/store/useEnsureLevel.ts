import { useEffect } from 'react'
import { useLevelStore } from './levelStore'
import { useProgressStore } from './progressStore'

// Starts Level 1 the first time any view needs it, in the seat of the role you picked (frontend
// unless you picked backend). The run is kept in memory, so the board, the Team view and the
// Pipeline view all show the same run as you switch tabs.
export function useEnsureLevel(): void {
  const runner = useLevelStore((s) => s.runner)
  const load = useLevelStore((s) => s.load)
  const role = useProgressStore((s) => s.settings.role)
  useEffect(() => {
    if (!runner) load(1, { role: role === 'backend' ? 'backend' : 'frontend' })
  }, [runner, load, role])
}
