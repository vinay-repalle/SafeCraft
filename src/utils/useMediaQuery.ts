import { useEffect, useState } from 'react'

// Phase 9: true while a CSS media query matches, for example '(min-width: 1200px)'. Updates when
// the window is resized past the line. CSS breakpoints change styles; this is for the few places
// that change which pieces are on screen, like My view's one-zone-at-a-time layout.
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}
