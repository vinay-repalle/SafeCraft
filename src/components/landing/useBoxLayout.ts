import { useEffect, useState, type RefObject } from 'react'
import { layoutForAspect, type SceneLayout } from '../pipeline/sceneLayout'

export const NARROW_PX = 560

// Which way round the diorama should stand in a box: 'wide' or 'tall', from the box's shape.
// The 3D scene decides the same way from its canvas, so the still picture and the scene that
// replaces it always agree.
//
// A ResizeObserver is the browser's way to say "this element changed size" (from a window resize,
// a phone turning, or the layout reflowing), without checking on a timer.
// Also returns the box's width / height, rounded so small changes do not redraw the picture, and
// whether the box is narrow (a phone), where a picture should name fewer stations.
export function useBoxLayout(ref: RefObject<HTMLElement | null>, fallback: SceneLayout = 'wide'): { layout: SceneLayout; aspect: number; narrow: boolean } {
  const [box, setBox] = useState({ layout: fallback, aspect: 0, narrow: false })
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) {
        const aspect = Math.round((width / height) * 20) / 20
        const narrow = width < NARROW_PX
        setBox((b) => (b.aspect === aspect && b.narrow === narrow ? b : { layout: layoutForAspect(width / height), aspect, narrow }))
      }
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return box
}
