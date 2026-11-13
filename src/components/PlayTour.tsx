import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLevelStore } from '../store/levelStore'
import type { Zone } from '../store/nextAction'
import { TOUR_LENGTH, useUiStore } from '../store/uiStore'
import { BUTTON_PRIMARY, PANEL_BUTTON } from './ui'

// Phase 9: a three-card tour of My view, once, the first time a level starts. Each card sits by
// its zone, and that zone gets the dashed next-step outline. "Skip tour" or Escape ends it. It can
// be shown again from the How to play article in the Field guide.
//
// It is not a modal popup: the page behind stays usable, and focus goes to the card's main button
// so a keyboard user can read it and move on with Enter.
// `side`: where the card sits on a wide screen, so it does not cover the zone it describes.
// Beside the left and right zones; along the bottom of the middle one, under the step card.
const CARDS: { zone: Zone; side: 'right' | 'left' | 'bottom'; title: string; body: string }[] = [
  {
    zone: 'task',
    side: 'right',
    title: 'Your ticket and your team',
    body: 'The board holds your tickets. Teammates write to you in Team chat. You can switch level here at any time.',
  },
  {
    zone: 'code',
    side: 'bottom',
    title: 'Where you do the work',
    body: 'The card at the top says what to do now. A dashed outline marks the control to use, and Show me jumps to it. Each Git button shows the real command before it runs.',
  },
  {
    zone: 'pipeline',
    side: 'left',
    title: 'Where your change goes',
    body: 'Your change travels from your desk to GitHub, through the tests and a review, and out to customers. It moves here as you work.',
  },
]

const GAP = 16
const CARD_WIDTH = 320

export function PlayTour({ narrow }: { narrow: boolean }) {
  const step = useUiStore((s) => s.tourStep)
  const nextStep = useUiStore((s) => s.nextTourStep)
  const end = useUiStore((s) => s.endTour)
  const setPlayZone = useUiStore((s) => s.setPlayZone)
  const popup = useLevelStore((s) => s.popup)
  const [place, setPlace] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const card = step === null || popup ? null : CARDS[step]

  // Show the card's zone (on a narrow screen it may be hidden), outline it, and put the card by it.
  useEffect(() => {
    if (!card) return
    setPlace(null)
    if (narrow) setPlayZone(card.zone)
    let zoneEl: HTMLElement | null = null
    const measure = () => {
      zoneEl = document.querySelector<HTMLElement>(`[data-zone="${card.zone}"]`)
      if (!zoneEl) return
      zoneEl.classList.add('spotlight')
      const r = zoneEl.getBoundingClientRect()
      const width = Math.min(CARD_WIDTH, window.innerWidth - GAP * 2)
      const clampLeft = (x: number) => Math.min(Math.max(x, GAP), window.innerWidth - width - GAP)
      // Narrow (one zone fills the width): along the bottom of the window.
      if (narrow) setPlace({ width, left: clampLeft((window.innerWidth - width) / 2), bottom: GAP })
      else if (card.side === 'bottom') setPlace({ width, left: clampLeft(r.left + (r.width - width) / 2), bottom: Math.max(window.innerHeight - r.bottom + GAP * 2, GAP) })
      else setPlace({ width, left: clampLeft(card.side === 'right' ? r.right + GAP / 2 : r.left - width - GAP / 2), top: Math.max(r.top + 48, GAP) })
    }
    // One frame later, so a zone that was just shown has its size.
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      zoneEl?.classList.remove('spotlight')
    }
  }, [card, narrow, setPlayZone])

  useEffect(() => {
    if (card && place) primary.current?.focus({ preventScroll: true })
  }, [card, place])

  if (!card || !place) return null
  const last = step === TOUR_LENGTH - 1

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') end()
  }

  return (
    <div
      key={step}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-title"
      onKeyDown={onKeyDown}
      style={place}
      className="motion-rise fixed z-20 rounded-card border border-line bg-card p-5 text-ink shadow-small"
    >
      <p className="text-meta tabular-nums text-ink-3">
        {step! + 1} of {TOUR_LENGTH}
      </p>
      <h2 id="tour-title" className="mt-1 text-body font-medium">
        {card.title}
      </h2>
      <p className="mt-1 text-caption text-ink-2">{card.body}</p>
      <div className="mt-4 flex justify-end gap-2">
        {!last && (
          <button type="button" className={PANEL_BUTTON} onClick={end}>
            Skip tour
          </button>
        )}
        <button ref={primary} type="button" className={BUTTON_PRIMARY} onClick={nextStep}>
          {last ? 'Start playing' : 'Next'}
        </button>
      </div>
    </div>
  )
}
