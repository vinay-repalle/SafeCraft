// The 3D scene is drawn on a canvas, which cannot read CSS classes. So it reads the same
// design tokens (--card, --accent, --pass and so on) straight from the page and re-reads
// them when the theme changes. Light, dark and system themes then work with no extra code.
import { useEffect, useState } from 'react'
import { Color } from 'three'
import type { StationState } from '../../store/levelStore'

export type SceneColors = {
  card: string
  raised: string
  ink: string
  ink2: string
  ink3: string
  accent: string
  pass: string
  fail: string
}

const TOKENS: Record<keyof SceneColors, string> = {
  card: '--card',
  raised: '--raised',
  ink: '--ink',
  ink2: '--ink-2',
  ink3: '--ink-3',
  accent: '--accent',
  pass: '--pass',
  fail: '--fail',
}

function readColors(): SceneColors {
  const style = getComputedStyle(document.documentElement)
  const result = {} as SceneColors
  for (const key of Object.keys(TOKENS) as (keyof SceneColors)[]) result[key] = style.getPropertyValue(TOKENS[key]).trim() || '#808080'
  return result
}

export function useSceneColors(): SceneColors {
  const [colors, setColors] = useState(readColors)
  useEffect(() => {
    // The theme code sets data-theme on <html>; watch that one attribute.
    const observer = new MutationObserver(() => setColors(readColors()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return colors
}

// A colour part-way between two others, as a hex string.
export function mix(a: string, b: string, amount: number): string {
  return `#${new Color(a).lerp(new Color(b), amount).getHexString()}`
}

// One flat colour per station state. No glow: pass and fail are plain muted green and red.
export function stateColor(state: StationState, c: SceneColors): string {
  switch (state) {
    case 'active':
      return c.accent
    case 'done':
      return c.ink2
    case 'pass':
      return c.pass
    case 'fail':
      return c.fail
    default:
      return mix(c.raised, c.ink3, 0.35)
  }
}
