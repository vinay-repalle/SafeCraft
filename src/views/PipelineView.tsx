import { ROLE_INFO } from '../app/nav'
import { Pipeline } from '../components/pipeline/Pipeline'
import { PANEL } from '../components/ui'
import { STEP_KINDS } from '../engine/types'
import { useCurrentStep, useLevelStore } from '../store/levelStore'
import { useEnsureLevel } from '../store/useEnsureLevel'

const KIND_TITLE: Record<(typeof STEP_KINDS)[number], string> = {
  chat: 'Team chat',
  board: 'Board',
  code: 'Code',
  git: 'Git',
  syncCheck: 'Sync check',
  pr: 'Pull request',
  tests: 'Automated tests',
  review: 'Code review',
  deploy: 'Release',
}

// Pipeline view: the whole journey on one full-size scene, no code. It shows the same run as
// My view, so anything you do there moves the parcel here.
export function PipelineView() {
  useEnsureLevel()
  const runner = useLevelStore((s) => s.runner)
  const done = useLevelStore((s) => s.snapshot?.completedStepIds.length ?? 0)
  const finished = useLevelStore((s) => s.snapshot?.finished ?? false)
  const step = useCurrentStep()
  const total = runner?.level.steps.length ?? 0
  const who = step ? ROLE_INFO.find((r) => r.id === step.role)?.label : null

  return (
    // Below 1200px the page scrolls and "full height" has nothing to measure, so the view keeps a
    // height of its own for the scene (Phase 9).
    <section aria-label="Pipeline view" className={`${PANEL} h-[40rem] gap-3 p-4 min-[1200px]:h-full`}>
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-lead font-medium">Pipeline view</h1>
        <p className="text-caption text-ink-3">{runner ? `Level ${runner.level.id}: ${runner.level.title}` : ''}</p>
      </header>
      <div className="min-h-0 flex-1">
        <Pipeline />
      </div>
      <footer className="rounded-tag border border-line bg-raised p-3" aria-live="polite">
        {step ? (
          <>
            <p className="text-meta text-ink-3">
              Step {done + 1} of {total} · {who} · {KIND_TITLE[step.kind]}
            </p>
            <p className="mt-1 text-body text-ink">{step.prompt}</p>
          </>
        ) : (
          <p className="text-body text-ink">{finished ? 'The change is live. Open My view for the mistakes replay.' : 'Loading the level.'}</p>
        )}
      </footer>
    </section>
  )
}
