import { FastForward, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { ROLE_INFO } from '../app/nav'
import { useCurrentStep, useLevelStore } from '../store/levelStore'
import { FirstTimeCard } from './jargon/TermCard'
import { JargonText } from './jargon/JargonText'
import { BUTTON_PRIMARY, PANEL_BUTTON } from './ui'

// The task: what to do now, a hint, and Skip & Auto-Fill. Sits above the editor.
export function StepCard() {
  const runner = useLevelStore((s) => s.runner)
  const snapshot = useLevelStore((s) => s.snapshot)
  const notice = useLevelStore((s) => s.notice)
  const autoFill = useLevelStore((s) => s.autoFill)
  const openReplay = useLevelStore((s) => s.openReplay)
  const restart = useLevelStore((s) => s.restart)
  const step = useCurrentStep()
  // Remember which step's hint is open, so it closes by itself when the step changes.
  const [hintFor, setHintFor] = useState<string | null>(null)
  if (!runner || !snapshot) return null

  const total = runner.level.steps.length
  const done = snapshot.completedStepIds.length

  return (
    <div className="rounded-tag border border-line bg-raised p-4">
      <ol aria-label={`${done} of ${total} steps done`} className="mb-3 flex gap-1">
        {runner.level.steps.map((s) => (
          <li key={s.id} className={`h-1 flex-1 rounded-tag ${snapshot.completedStepIds.includes(s.id) ? 'bg-accent' : s.id === step?.id ? 'bg-ink-3' : 'bg-line'}`} />
        ))}
      </ol>

      {!step ? (
        <>
          <p className="text-lead font-medium">Level complete</p>
          <p className="mt-1 text-body text-ink-2">Your change is live. See what you did well and what to watch for next time.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className={BUTTON_PRIMARY} onClick={openReplay}>
              Show replay
            </button>
            <button type="button" className={PANEL_BUTTON} onClick={restart}>
              Play again
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-meta text-ink-3">
            Step {done + 1} of {total}
            {step.auto ? ' · Runs on its own' : ''}
            {` · ${ROLE_INFO.find((r) => r.id === step.role)?.label}`}
          </p>
          <p className="mt-1 text-lead text-ink">
            <JargonText text={step.prompt} terms={step.terms} />
          </p>

          {hintFor === step.id && step.hint && <p className="mt-2 text-caption text-ink-2">{step.hint}</p>}
          {notice && <p className="mt-2 text-caption text-fail">{notice}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            {step.hint && (
              <button type="button" className={PANEL_BUTTON} onClick={() => setHintFor(hintFor === step.id ? null : step.id)}>
                <Lightbulb size={16} strokeWidth={1.5} />
                {hintFor === step.id ? 'Hide hint' : 'Show hint'}
              </button>
            )}
            {!step.auto && (
              <button type="button" className={PANEL_BUTTON} onClick={autoFill}>
                <FastForward size={16} strokeWidth={1.5} />
                Skip and auto-fill
              </button>
            )}
          </div>
          <FirstTimeCard termIds={step.terms ?? []} />
        </>
      )}
    </div>
  )
}
