import { useEffect } from 'react'
import { useLevelStore } from './levelStore'

// Starts Level 1 the first time any view needs it. The run is kept in memory, so the
// board, the Team view and the Pipeline view all show the same run as you switch tabs.
export function useEnsureLevel(): void {
  const runner = useLevelStore((s) => s.runner)
  const load = useLevelStore((s) => s.load)
  useEffect(() => {
    if (!runner) load(1)
  }, [runner, load])
}
