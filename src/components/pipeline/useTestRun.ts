import { useEffect, useState } from 'react'
import { useLevelStore } from '../../store/levelStore'
import { usePrefersReducedMotion } from '../../utils/reducedMotion'
import { msUntilNextPhase, testRunPhase, type TestRun, type TestRunPhase } from './pipelineMotion'

// The latest test run and where it is right now (see pipelineMotion.ts). The component
// re-renders once when the run ends and once when the shake ends, using a single timeout
// each time, so nothing polls. A view opened after the run has ended sees "settled" at once,
// so switching tabs never replays the run.
export function useTestRun(): { run: TestRun | null; phase: TestRunPhase; running: boolean } {
  const run = useLevelStore((s) => s.testRun)
  const reduced = usePrefersReducedMotion()
  const [, setTick] = useState(0)
  const now = Date.now()
  const phase = testRunPhase(run, now, reduced)
  const wait = msUntilNextPhase(run, now, reduced)

  useEffect(() => {
    if (wait === null) return
    const id = window.setTimeout(() => setTick((n) => n + 1), wait + 16)
    return () => window.clearTimeout(id)
  }, [wait, phase, run?.seq])

  return { run, phase, running: phase === 'running' }
}
