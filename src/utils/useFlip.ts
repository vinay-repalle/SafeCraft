import { useLayoutEffect, useRef, type RefObject } from 'react'
import { prefersReducedMotion } from './reducedMotion'

// Phase 9: slide items to their new place instead of letting them jump, using FLIP.
//
// FLIP stands for First, Last, Invert, Play:
//   First   remember where each item was (saved after the previous render)
//   Last    let React put it in its new place, and measure it there
//   Invert  move it back to where it was with a transform, so nothing seems to have changed
//   Play    animate that transform away, so it glides from the old place to the new one
// Only `transform` animates (docs/DESIGN.md), and the browser does it off the main layout work.
// It works even when an item moves to another list, because items are matched by id.
//
// Mark each item with `data-flip-id`. Positions are kept relative to `container`, so scrolling
// the page in between does not make anything slide. `trigger` is whatever changes when items
// move (for the board, the board data). Reduced motion: items simply appear in the new place.
export function useFlip(container: RefObject<HTMLElement | null>, trigger: unknown, duration = 400) {
  const last = useRef(new Map<string, { x: number; y: number }>())

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const box = root.getBoundingClientRect()
    // Hidden (a zone not showing on a narrow screen): nothing to measure. Forget the old places,
    // so nothing slides from a stale spot when it shows again.
    if (box.width === 0) {
      last.current = new Map()
      return
    }
    const reduce = prefersReducedMotion()
    const easing = getComputedStyle(root).getPropertyValue('--ease-standard').trim() || 'ease-out'
    const next = new Map<string, { x: number; y: number }>()
    root.querySelectorAll<HTMLElement>('[data-flip-id]').forEach((el) => {
      const rect = el.getBoundingClientRect()
      const now = { x: rect.left - box.left, y: rect.top - box.top }
      next.set(el.dataset.flipId!, now)
      const before = last.current.get(el.dataset.flipId!)
      if (!before || reduce) return
      const dx = before.x - now.x
      const dy = before.y - now.y
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration, easing })
    })
    last.current = next
  }, [container, trigger, duration])
}
