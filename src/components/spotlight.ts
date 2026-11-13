// Phase 9: the next-step spotlight on screen.
//
// `useNextAction` asks the plain logic in store/nextAction.ts where the learner should act. Each
// control that can be the answer checks it and, when it matches, adds the `spotlight` class (a
// dashed accent outline that fades in once, styled in index.css) and a `data-next` attribute.
// "Show me" on the step card finds that attribute, scrolls to it and puts keyboard focus there.
import { useMemo } from 'react'
import { useLevelStore } from '../store/levelStore'
import { nextActionFor, zoneOf, type NextAction } from '../store/nextAction'
import { useUiStore } from '../store/uiStore'
import { prefersReducedMotion } from '../utils/reducedMotion'

export function useNextAction(): NextAction | null {
  const runner = useLevelStore((s) => s.runner)
  const snapshot = useLevelStore((s) => s.snapshot)
  const popup = useLevelStore((s) => s.popup)
  // While the tour or a popup is up, they have the learner's attention. No outline behind them.
  const touring = useUiStore((s) => s.tourStep !== null)
  // `snapshot` changes after every action, which is when the answer can change.
  const action = useMemo(() => (snapshot ? nextActionFor(runner) : null), [runner, snapshot])
  return touring || popup ? null : action
}

// Props for a control that is (or is not) the next place to act. Spread onto the element and add
// `spotClass(on)` to its class list.
export const spotProps = (on: boolean) => (on ? { 'data-next': '' } : {})
export const spotClass = (on: boolean) => (on ? ' spotlight' : '')

// Jump to the next place to act: switch to its zone on narrow screens, scroll it into view and
// focus it, so a keyboard user lands on it too.
export function showNextAction(action: NextAction) {
  useUiStore.getState().setPlayZone(zoneOf(action))
  // Wait one frame, so a zone that was hidden has its size before we scroll to it.
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('[data-next]')
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    const focusable = el.matches('button, input')
      ? el
      : (el.querySelector<HTMLElement>('[contenteditable="true"]') ?? el.querySelector<HTMLElement>('input, button:not([disabled])'))
    focusable?.focus({ preventScroll: true })
  })
}
