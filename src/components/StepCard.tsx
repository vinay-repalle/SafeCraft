import { ArrowRight, Check, FastForward, Lightbulb } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ROLE_INFO } from '../app/nav'
import { LEVEL_IDS } from '../content'
import type { LevelRunner } from '../engine/levelRunner'
import { useCurrentStep, useLevelStore } from '../store/levelStore'
import { doneLabel, justCompleted } from '../utils/stepFeedback'
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
  const load = useLevelStore((s) => s.load)
  const levelId = useLevelStore((s) => s.levelId)
  const step = useCurrentStep()
  // Remember which step's hint is open, so it closes by itself when the step changes.
  const [hintFor, setHintFor] = useState<string | null>(null)

  // Phase 7e: when steps complete, their bars grow in and a short "Step N done" line rises in,
  // once. `seen` remembers what was done last time; it resets when another level or seat loads.
  const seen = useRef<{ runner: LevelRunner; ids: string[] } | null>(null)
  const [done, setDone] = useState<{ key: number; label: string; ids: string[] } | null>(null)
  const completedIds = snapshot?.completedStepIds
  useEffect(() => {
    if (!runner || !completedIds) return
    const prev = seen.current?.runner === runner ? seen.current.ids : null
    seen.current = { runner, ids: completedIds }
    if (prev === null) {
      setDone(null)
      return
    }
    const order = runner.level.steps.map((s) => s.id)
    const numbers = justCompleted(prev, completedIds, order)
    if (numbers.length) setDone((d) => ({ key: (d?.key ?? 0) + 1, label: doneLabel(numbers), ids: numbers.map((n) => order[n - 1]) }))
  }, [runner, completedIds])

  if (!runner || !snapshot) return null

  const total = runner.level.steps.length
  const doneCount = snapshot.completedStepIds.length

  return (
    <div className="rounded-tag border border-line bg-raised p-4">
      <ol aria-label={`${doneCount} of ${total} steps done`} className="mb-3 flex gap-1">
        {runner.level.steps.map((s) => (
          <li
            key={s.id}
            className={`h-1 flex-1 rounded-tag ${snapshot.completedStepIds.includes(s.id) ? 'bg-accent' : s.id === step?.id ? 'bg-ink-3' : 'bg-line'} ${done?.ids.includes(s.id) ? 'motion-grow-x' : ''}`}
          />
        ))}
      </ol>

      {done && (
        // Keyed by each completion, so the line rises in once per completion and then stays still.
        <p key={done.key} role="status" className="motion-rise mb-2 flex items-center gap-1 text-meta text-pass">
          <Check size={16} strokeWidth={1.5} aria-hidden />
          {done.label}
        </p>
      )}

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
            {LEVEL_IDS.includes(levelId + 1) && (
              <button type="button" className={PANEL_BUTTON} onClick={() => load(levelId + 1)}>
                Next level
                <ArrowRight size={16} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-meta text-ink-3">
            Step {doneCount + 1} of {total}
            {step.auto ? ' · Runs on its own' : ''}
            {` · ${ROLE_INFO.find((r) => r.id === step.role)?.label}`}
          </p>
          <p className="mt-1 text-lead text-ink">
            <JargonText text={step.prompt} terms={step.terms} />
          </p>

          {hintFor === step.id && step.hint && <p className="mt-2 text-caption text-ink-2">{step.hint}</p>}
          {notice && <p className="mt-2 text-caption text-fail">{notice}</p>}
          {/* Tests that run on their own can fail. Say what to do, since the learner has no button for it. */}
          {step.auto?.type === 'runTests' && snapshot.lastTestReport && !snapshot.lastTestReport.passed && (
            <p className="mt-2 text-caption text-fail">The tests failed. Open the Pull request tab, read the log, fix the code, commit and push again. The tests run again by themselves.</p>
          )}

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
